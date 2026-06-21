# Release Instructions for Zalo Bot Node

This repository is configured to publish automatically to the npm registry via GitHub Actions whenever a new version tag is pushed.

## How it Works
1. When you push a Git tag starting with `v` (e.g., `v1.0.2`), the **Publish to npm** GitHub Actions workflow is triggered.
2. The workflow builds the package, runs lints, and publishes it with cryptographic **provenance** using the `NPM_TOKEN` secret.

---

## Step-by-Step Release Guide

Follow these commands to release a new version of the community node.

### 1. Verification
Ensure the code builds and type-checks successfully locally:
* **bash / zsh:**
  ```bash
  npm run build && npm run lint
  ```
* **PowerShell:**
  ```powershell
  npm run build; npm run lint
  ```

### 2. Bump Version & Tag
Use the `npm version` command to automatically update the version in `package.json`, create a commit, and create a Git tag.
* For a bug fix/patch release (e.g., `1.0.1` -> `1.0.2`):
  ```bash
  npm version patch
  ```
* For a new feature (e.g., `1.0.1` -> `1.1.0`):
  ```bash
  npm version minor
  ```
* For a breaking change (e.g., `1.0.1` -> `2.0.0`):
  ```bash
  npm version major
  ```

### 3. Push to GitHub
Push both the release commit and the new tag to trigger the automatic publish action:
```bash
git push origin main --follow-tags
```

---

## Notes for AI Assistants
If you are an AI assistant pair-programming with the user and have been asked to release a new version:
1. Ensure all files are committed.
2. Verify compilation by running the build/lint commands.
3. Run `npm version <patch|minor|major>` to bump the version.
4. Execute `git push origin main --follow-tags` to deploy the package.
