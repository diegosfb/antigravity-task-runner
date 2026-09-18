const test = require("node:test");
const assert = require("node:assert/strict");

const { syncViewMetadata } = require("../src/sync-view-name.js");

test("syncViewMetadata keeps the Task Runner view title stable", () => {
  const pkg = {
    version: "9.9.9",
    contributes: {
      views: {
        antigravityContainer: [
          {
            id: "antigravityView",
            name: "Tasky Runner v1.2.3",
            contextualTitle: "Tasky Runner v1.2.3",
            icon: "Resources/taskrunner.svg"
          }
        ]
      }
    }
  };

  syncViewMetadata(pkg);

  assert.deepEqual(pkg.contributes.views.antigravityContainer[0], {
    id: "antigravityView",
    name: "Task Runner v9.9.9",
    contextualTitle: "Task Runner v9.9.9",
    icon: "Resources/taskrunner.svg"
  });
});

test("syncViewMetadata keeps prerelease versions in view titles", () => {
  const pkg = {
    version: "9.9.9-beta.1",
    contributes: {
      views: {
        antigravityContainer: [
          {
            id: "antigravityView",
            name: "Task Runner",
            contextualTitle: "Task Runner",
            icon: "Resources/taskrunner.svg"
          }
        ],
        otherContainer: [
          {
            id: "secondaryView",
            name: "Secondary View v1.2.3",
            contextualTitle: "Secondary View v1.2.3"
          }
        ]
      }
    }
  };

  syncViewMetadata(pkg);

  assert.deepEqual(pkg.contributes.views.antigravityContainer[0], {
    id: "antigravityView",
    name: "Task Runner v9.9.9-beta.1",
    contextualTitle: "Task Runner v9.9.9-beta.1",
    icon: "Resources/taskrunner.svg"
  });

  assert.deepEqual(pkg.contributes.views.otherContainer[0], {
    id: "secondaryView",
    name: "Secondary View v9.9.9-beta.1",
    contextualTitle: "Secondary View v9.9.9-beta.1"
  });
});

test("syncViewMetadata still updates versioned titles for other views", () => {
  const pkg = {
    version: "9.9.9",
    contributes: {
      views: {
        otherContainer: [
          {
            id: "secondaryView",
            name: "Secondary View v1.2.3",
            contextualTitle: "Secondary View v1.2.3"
          }
        ]
      }
    }
  };

  syncViewMetadata(pkg);

  assert.deepEqual(pkg.contributes.views.otherContainer[0], {
    id: "secondaryView",
    name: "Secondary View v9.9.9",
    contextualTitle: "Secondary View v9.9.9"
  });
});
