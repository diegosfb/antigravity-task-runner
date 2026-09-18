const test = require("node:test");
const assert = require("node:assert/strict");

function setupLoggerModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") {
      return {
        workspace: { getConfiguration: () => ({ get: () => false }) }
      };
    }
    return originalRequire.apply(this, arguments);
  };
  const logger = require("../out/logger.js");
  Module.prototype.require = originalRequire;
  return logger;
}

test("all logger exports are functions", () => {
  const logger = setupLoggerModule();
  assert.equal(typeof logger.initLogger, "function");
  assert.equal(typeof logger.log, "function");
  assert.equal(typeof logger.logAlways, "function");
  assert.equal(typeof logger.showOutputChannel, "function");
});

test("log and logAlways do not throw when called", () => {
  const logger = setupLoggerModule();
  logger.log("test debug message");
  logger.logAlways("test always message");
});

test("showOutputChannel does not throw when called", () => {
  const logger = setupLoggerModule();
  logger.showOutputChannel();
});
