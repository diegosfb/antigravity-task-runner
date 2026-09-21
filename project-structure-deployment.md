# Project Structure Deployment

This repository ships a generated `project-structure.zip` file that contains the project bootstrap files, agent definitions, skills, workflows, documentation, scripts, and supporting configuration listed in `project-structure-list.txt`.

## Files Involved

| File | Purpose |
|---|---|
| `project-structure-list.txt` | Manifest of files and folders to include in `project-structure.zip`. Paths are relative to the repository root. |
| `scripts/create-project-structure-file.sh` | Builds `project-structure.zip` from `project-structure-list.txt`. |
| `project-structure.zip` | Deployable archive downloaded by the Task Runner project-structure deployment script. |
| `scripts/deploy-project-structure.sh` | Downloads `project-structure.zip` and extracts it into the configured Workspace Project Path. |

## Creating `project-structure.zip`

Run this from the repository root:

```bash
bash scripts/create-project-structure-file.sh
```

The script expects `project-structure-list.txt` at the repository root. If the file is missing, the script stops and prints a warning instead of creating an incomplete archive.

To use a custom manifest or output path:

```bash
PROJECT_STRUCTURE_LIST=/path/to/project-structure-list.txt \
PROJECT_STRUCTURE_ZIP=/path/to/project-structure.zip \
bash scripts/create-project-structure-file.sh
```

## Updating the Manifest

Add each folder or file that must be included in the deployment archive to `project-structure-list.txt`. Listing a folder creates that folder in the archive; list file paths explicitly when the file contents must be packaged.

Rules:

- Use repository-relative paths, preferably with the existing `./` prefix style.
- Do not include local-only files such as `.vscode/settings.json`, `.env`, credentials, caches, or machine-specific output.
- Include safe examples such as `.vscode/settings.example.json` and `.env.example` instead.
- Keep `project-structure.zip` out of the manifest to avoid packaging the archive inside itself.

## How Deployment Uses the ZIP

`scripts/deploy-project-structure.sh` downloads `project-structure.zip` from the configured Task Runner project-structure source and writes it to:

```text
tmp/project-structure.zip
```

It then extracts the archive into `antigravity.workspaceProjectPath`, also shown in the settings UI as Workspace Project Path. Relative Workspace Project Path values are resolved from the repository root.

When existing files are found:

- In an interactive terminal, the script asks whether to overwrite.
- In non-interactive runners, it keeps existing files and extracts only new files.
- Set `PROJECT_STRUCTURE_OVERWRITE=1` to force overwrites.

## Validation Checklist

After rebuilding the archive, verify it before pushing:

```bash
bash -n scripts/create-project-structure-file.sh
bash -n scripts/deploy-project-structure.sh
unzip -l project-structure.zip | head
```

Also confirm important files are not zero bytes inside the archive:

```bash
unzip -p project-structure.zip 'project-structure-deployment.md' | wc -c
unzip -p project-structure.zip '.agents/documentation/AGENTS & SKILLS.md' | wc -c
```

Commit and push `project-structure-list.txt`, `scripts/create-project-structure-file.sh`, `scripts/deploy-project-structure.sh`, and `project-structure.zip` together when the deployment contents change.
