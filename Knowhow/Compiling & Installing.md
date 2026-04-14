# Compiling and Installing

## Prerequisites

- Node.js and `npm`
- VS Code
- `vsce` for packaging the extension

If `vsce` is not installed globally, install it with:

```bash
npm install -g @vscode/vsce
```

## Install Dependencies

From the project root, install the project dependencies:

```bash
npm install
```

## Compile the Extension

Build the TypeScript sources into the `out/` directory:

```bash
npm run compile
```

## Package the Extension

Create a `.vsix` package for local installation:

```bash
vsce package
```

This will generate a file named like:

```text
antigravity-task-runner-<version>.vsix
```

## Install the Extension in VS Code

From the project root, install the generated package:

```bash
code --install-extension antigravity-task-runner-<version>.vsix --force
```

Example:

```bash
code --install-extension antigravity-task-runner-4.1.21.vsix --force
```

## Uninstall the Extension

To remove the extension from VS Code:

```bash
code --uninstall-extension dsfb.antigravity-task-runner
```

## Recommended Local Workflow

For a typical local update cycle:

```bash
npm install
npm run compile
vsce package
code --install-extension antigravity-task-runner-<version>.vsix --force
```

## Quick Verification

After installation:

- Open VS Code
- Confirm the extension appears in the Extensions panel
- Confirm the Antigravity sidebar loads without errors
- Test one or two commands from the extension UI

## Troubleshooting

### `code` command not found

Install the VS Code shell command from VS Code:

- Open Command Palette
- Run `Shell Command: Install 'code' command in PATH`

### `vsce` command not found

Install it globally:

```bash
npm install -g @vscode/vsce
```

### Old version still appears

Force reinstall the package:

```bash
code --install-extension antigravity-task-runner-<version>.vsix --force
```

If needed, uninstall first and then reinstall.
