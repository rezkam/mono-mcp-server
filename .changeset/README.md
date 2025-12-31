# Changesets Guide

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases. Changesets provides a structured workflow for tracking changes, managing versions, and publishing to npm.

## Overview

**What are Changesets?**

Changesets are Markdown files that describe changes made in a pull request or commit. Each changeset includes:
- Which packages are affected (in our case, just `@rezkam/mono-mcp-server`)
- The type of change (major, minor, or patch)
- A human-readable description of the change

**Why use Changesets?**

- **Clear changelog**: Automatically generates CHANGELOG.md from changesets
- **Semantic versioning**: Ensures proper version bumps based on change types
- **Automated releases**: GitHub Actions handles version bumping and npm publishing
- **No manual version management**: Version numbers are managed automatically

## Workflow

### 1. Making Changes

When you make changes to the codebase, create a changeset to describe them:

```bash
npx changeset
```

This interactive CLI will ask you:

1. **Which packages changed?** (Press Enter to select `@rezkam/mono-mcp-server`)
2. **What type of change?**
   - **Major** (breaking changes): `1.0.0` → `2.0.0`
   - **Minor** (new features): `1.0.0` → `1.1.0`
   - **Patch** (bug fixes): `1.0.0` → `1.0.1`
3. **Describe the change**: Write a user-facing description

**Example:**

```
🦋  Which packages would you like to include?
◉ @rezkam/mono-mcp-server

🦋  Which packages should have a major bump?
◯ @rezkam/mono-mcp-server

🦋  Which packages should have a minor bump?
◉ @rezkam/mono-mcp-server

🦋  Which packages should have a patch bump?
◯ @rezkam/mono-mcp-server

🦋  Please enter a summary for this change:
Add timeout protection to API calls
```

This creates a file in `.changeset/` like `.changeset/cool-dogs-jump.md`:

```markdown
---
"@rezkam/mono-mcp-server": minor
---

Add timeout protection to API calls
```

### 2. Commit the Changeset

Commit the generated changeset file along with your code changes:

```bash
git add .changeset/cool-dogs-jump.md
git commit -m "Add timeout protection to API calls"
git push origin main
```

### 3. Automated Release (GitHub Actions)

When you push to the `main` branch, the [release workflow](../.github/workflows/release.yml) automatically:

1. **Detects changesets** in the `.changeset/` directory
2. **Creates a "Version Packages" PR** that:
   - Bumps version in `package.json`
   - Generates/updates `CHANGELOG.md`
   - Deletes consumed changeset files
3. **Publishes to npm** when you merge the Version Packages PR

**You don't need to manually update version numbers!**

## Common Scenarios

### Scenario 1: Bug Fix (Patch Release)

```bash
# Make your fix
vim src/tools/items.ts

# Create a changeset
npx changeset
# Select: patch
# Description: "Fix error handling in update_item"

# Commit and push
git add .
git commit -m "Fix error handling in update_item"
git push origin main

# GitHub Actions will create a PR: "Version Packages"
# Merge the PR → Automatic publish to npm as 0.1.1
```

### Scenario 2: New Feature (Minor Release)

```bash
# Implement new feature
vim src/tools/planning.ts

# Create a changeset
npx changeset
# Select: minor
# Description: "Add bulk task creation tool"

# Commit and push
git add .
git commit -m "Add bulk task creation tool"
git push origin main

# GitHub Actions will create a PR: "Version Packages"
# Merge the PR → Automatic publish to npm as 0.2.0
```

### Scenario 3: Breaking Change (Major Release)

```bash
# Make breaking change
vim src/client.ts

# Create a changeset
npx changeset
# Select: major
# Description: "BREAKING: Rename all tool parameters for consistency"

# Commit and push
git add .
git commit -m "Rename all tool parameters for consistency"
git push origin main

# GitHub Actions will create a PR: "Version Packages"
# Merge the PR → Automatic publish to npm as 1.0.0
```

### Scenario 4: Multiple Changes at Once

If you have multiple unrelated changes, create separate changesets:

```bash
# Fix bug
npx changeset
# Select: patch
# Description: "Fix date filtering in get_overdue_tasks"

# Add feature
npx changeset
# Select: minor
# Description: "Add get_tasks_by_priority tool"

# Commit all changesets
git add .changeset/
git commit -m "Bug fixes and new features"
git push origin main

# The Version Packages PR will combine all changes
# Version bump will be 0.2.0 (highest of patch + minor)
```

## Version Bumping Rules

Changesets automatically determines the final version based on all pending changesets:

- **Multiple patches**: `0.1.0` → `0.1.1`
- **Patch + minor**: `0.1.0` → `0.2.0` (minor wins)
- **Patch + minor + major**: `0.1.0` → `1.0.0` (major wins)

## Manual Commands

### Check Status

See which changesets are pending:

```bash
npx changeset status
```

### Version (Local Testing)

Manually bump version and update changelog (for testing only):

```bash
npx changeset version
```

This is **rarely needed** because GitHub Actions handles it automatically.

### Publish (Local Testing)

Manually publish to npm (for testing only):

```bash
npx changeset publish
```

This is **rarely needed** because GitHub Actions handles it automatically with npm trusted publishing.

## GitHub Actions Workflow

The [release workflow](../.github/workflows/release.yml):

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write        # Create releases and tags
  pull-requests: write   # Create Version Packages PR
  id-token: write        # npm trusted publishing (no NPM_TOKEN needed)

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - uses: changesets/action@v1
        with:
          publish: npm run build && npx changeset publish
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**What happens automatically:**

1. **On every push to main**: Checks for changesets
2. **If changesets exist**: Creates/updates "Version Packages" PR
3. **When PR is merged**:
   - Runs `npm run build` (which includes `npm run generate`)
   - Publishes to npm using trusted publishing
   - Creates GitHub release with changelog

**No manual steps required!**

## Configuration

Changesets configuration is in [config.json](config.json):

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.2/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Key settings:**
- `access: "public"`: Publishes as public npm package
- `baseBranch: "main"`: Base branch for PRs
- `commit: false`: Don't auto-commit (we commit manually)
- `changelog: "@changesets/cli/changelog"`: Use default changelog format

## FAQ

### Do I need to update package.json version manually?

**No.** Changesets handles this automatically when the Version Packages PR is merged.

### What if I forget to create a changeset?

The Version Packages PR won't be created. Create a changeset and push it to trigger the workflow.

### Can I skip changesets for internal changes?

Yes, if your changes don't affect users (e.g., updating README, adding tests), you can skip creating a changeset. No version bump will occur.

### How do I publish a prerelease?

```bash
# Enter prerelease mode
npx changeset pre enter beta

# Create changesets as normal
npx changeset

# Commit and push
git add . && git commit -m "Enter prerelease mode"
git push origin main

# Versions will be: 0.2.0-beta.0, 0.2.0-beta.1, etc.

# Exit prerelease mode when ready
npx changeset pre exit
```

### What about npm authentication?

This project uses **npm trusted publishing** via OIDC, so no `NPM_TOKEN` is required. GitHub Actions authenticates automatically using the `id-token: write` permission.

## Best Practices

1. **Create changesets immediately** after making changes while context is fresh
2. **Write clear descriptions** that users can understand (not implementation details)
3. **Use semantic versioning correctly**:
   - Patch: Bug fixes, performance improvements
   - Minor: New features, new tools, non-breaking enhancements
   - Major: Breaking changes to tool interfaces or behavior
4. **One changeset per logical change** (not per commit)
5. **Review the Version Packages PR** before merging to ensure changelog is correct

## Learn More

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)
