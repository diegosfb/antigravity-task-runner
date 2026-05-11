"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileSystemResourceProvider = createFileSystemResourceProvider;
exports.createGitHubResourceProvider = createGitHubResourceProvider;
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const DEFAULT_GITHUB_REF = "main";
const DEFAULT_RESOURCES_RAW_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-task-runner/main/Resources";
const DEFAULT_RESOURCES_CONTENTS_API_BASE_URL = "https://api.github.com/repos/diegosfb/antigravity-task-runner/contents/Resources";
function normalizeRelativePath(relativePath) {
    const normalized = relativePath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!normalized) {
        throw new Error("Resource path cannot be empty.");
    }
    const segments = normalized.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
        throw new Error(`Invalid resource path: ${relativePath}`);
    }
    return segments.join("/");
}
function toLocalPath(root, relativePath) {
    return path.join(root, ...normalizeRelativePath(relativePath).split("/"));
}
function buildRawResourceUrl(baseUrl, relativePath) {
    const trimmedBaseUrl = baseUrl.replace(/\/+$/g, "");
    const encodedPath = normalizeRelativePath(relativePath)
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `${trimmedBaseUrl}/${encodedPath}`;
}
function buildContentsApiUrl(baseUrl, relativePath, ref) {
    const trimmedBaseUrl = baseUrl.replace(/\/+$/g, "");
    const encodedPath = normalizeRelativePath(relativePath)
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `${trimmedBaseUrl}/${encodedPath}?ref=${encodeURIComponent(ref)}`;
}
function requestBuffer(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https://") ? https : http;
        const request = client.get(url, {
            headers: {
                "User-Agent": "antigravity-task-runner",
                Accept: "application/vnd.github+json",
                ...headers
            }
        }, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                void requestBuffer(response.headers.location, headers).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                const status = response.statusCode ?? "unknown";
                response.resume();
                reject(new Error(`HTTP ${status} for ${url}`));
                return;
            }
            const chunks = [];
            response.on("data", (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            response.on("end", () => {
                resolve(Buffer.concat(chunks));
            });
        });
        request.on("error", reject);
    });
}
async function downloadToFile(url, destinationPath, headers = {}) {
    const buffer = await requestBuffer(url, headers);
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.writeFile(destinationPath, buffer);
}
function createFileSystemResourceProvider(resourcesRoot) {
    const resolvedRoot = path.resolve(resourcesRoot);
    const ensureExistingPath = async (relativePath, expectedType) => {
        const targetPath = toLocalPath(resolvedRoot, relativePath);
        const stats = await fs.promises.stat(targetPath);
        const isExpected = expectedType === "file" ? stats.isFile() : stats.isDirectory();
        if (!isExpected) {
            throw new Error(`${targetPath} is not a ${expectedType}.`);
        }
        return targetPath;
    };
    return {
        ensureFile(relativePath) {
            return ensureExistingPath(relativePath, "file");
        },
        ensureDirectory(relativePath) {
            return ensureExistingPath(relativePath, "directory");
        },
        async readTextFile(relativePath) {
            const filePath = await ensureExistingPath(relativePath, "file");
            return fs.promises.readFile(filePath, "utf8");
        }
    };
}
function createGitHubResourceProvider(options = {}) {
    const cacheRoot = options.cacheRoot ||
        fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-resource-cache-"));
    const contentsApiBaseUrl = options.contentsApiBaseUrl || DEFAULT_RESOURCES_CONTENTS_API_BASE_URL;
    const rawBaseUrl = options.rawBaseUrl || DEFAULT_RESOURCES_RAW_BASE_URL;
    const ref = options.ref || DEFAULT_GITHUB_REF;
    const filePromises = new Map();
    const directoryPromises = new Map();
    const ensureFile = async (relativePath) => {
        const normalizedPath = normalizeRelativePath(relativePath);
        const existing = filePromises.get(normalizedPath);
        if (existing)
            return existing;
        const pending = (async () => {
            const destinationPath = toLocalPath(cacheRoot, normalizedPath);
            if (!fs.existsSync(destinationPath)) {
                await downloadToFile(buildRawResourceUrl(rawBaseUrl, normalizedPath), destinationPath, {
                    Accept: "application/octet-stream"
                });
            }
            return destinationPath;
        })();
        filePromises.set(normalizedPath, pending);
        return pending;
    };
    const listDirectory = async (relativePath) => {
        const url = buildContentsApiUrl(contentsApiBaseUrl, relativePath, ref);
        const raw = await requestBuffer(url, {
            Accept: "application/vnd.github+json"
        });
        const parsed = JSON.parse(raw.toString("utf8"));
        if (!Array.isArray(parsed)) {
            throw new Error(`Expected a directory listing for ${relativePath}.`);
        }
        return parsed;
    };
    const downloadDirectory = async (relativePath, destinationPath) => {
        await fs.promises.mkdir(destinationPath, { recursive: true });
        const entries = await listDirectory(relativePath);
        for (const entry of entries) {
            const entryName = typeof entry.name === "string" ? entry.name : "";
            if (!entryName)
                continue;
            const childRelativePath = `${normalizeRelativePath(relativePath)}/${entryName}`;
            const childDestinationPath = path.join(destinationPath, entryName);
            if (entry.type === "file") {
                const downloadUrl = typeof entry.download_url === "string" && entry.download_url.length > 0
                    ? entry.download_url
                    : buildRawResourceUrl(rawBaseUrl, childRelativePath);
                await downloadToFile(downloadUrl, childDestinationPath, {
                    Accept: "application/octet-stream"
                });
                continue;
            }
            if (entry.type === "dir") {
                await downloadDirectory(childRelativePath, childDestinationPath);
            }
        }
    };
    const ensureDirectory = async (relativePath) => {
        const normalizedPath = normalizeRelativePath(relativePath);
        const existing = directoryPromises.get(normalizedPath);
        if (existing)
            return existing;
        const pending = (async () => {
            const destinationPath = toLocalPath(cacheRoot, normalizedPath);
            if (!fs.existsSync(destinationPath)) {
                await downloadDirectory(normalizedPath, destinationPath);
            }
            return destinationPath;
        })();
        directoryPromises.set(normalizedPath, pending);
        return pending;
    };
    return {
        ensureFile,
        ensureDirectory,
        async readTextFile(relativePath) {
            const filePath = await ensureFile(relativePath);
            return fs.promises.readFile(filePath, "utf8");
        }
    };
}
//# sourceMappingURL=resourceProvider.js.map