# Setting Up Auto-Publish for Releases

This guide explains how to configure automated publishing for ProductionApp releases using GitHub Actions.

## Overview

The auto-publish workflow automatically builds and publishes the Electron application to GitHub Releases when you push a new version tag (e.g., `v0.2.0`).

## Prerequisites

- Repository owner/admin access to `elionshate/productionapp`
- Ability to create GitHub Personal Access Tokens
- Ability to add repository secrets

## Step 1: Create a GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Direct link: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `ProductionApp Auto-Publish` (or any descriptive name)
   - **Expiration**: Choose an appropriate expiration (recommend 1 year, then renew)
   - **Scopes**: Select **`repo`** (this gives full control of private repositories)
     - ✅ repo
       - ✅ repo:status
       - ✅ repo_deployment
       - ✅ public_repo
       - ✅ repo:invite
       - ✅ security_events

4. Click **"Generate token"** at the bottom

5. **IMPORTANT**: Copy the token immediately (it starts with `ghp_`) and save it securely
   - You won't be able to see it again!
   - If you lose it, you'll need to generate a new one

## Step 2: Add the Token to Repository Secrets

1. Go to the repository settings:
   - Navigate to: https://github.com/elionshate/productionapp/settings/secrets/actions

2. Click **"New repository secret"**

3. Configure the secret:
   - **Name**: `GH_TOKEN` (must be exactly this name)
   - **Value**: Paste the personal access token you created in Step 1

4. Click **"Add secret"**

## Step 3: Verify the Workflow

1. Check that the workflow file exists:
   - File: `.github/workflows/release.yml`
   - This file is already committed to the repository

2. The workflow will trigger when you push a tag starting with `v`:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

## How It Works

When you push a tag (e.g., `v0.2.0`):

1. GitHub Actions workflow starts automatically
2. Sets up a Windows environment with Node.js 20
3. Installs dependencies
4. Generates Prisma client
5. Builds the Next.js app and Electron main process
6. Packages the Electron app using electron-builder
7. Publishes to GitHub Releases using the `GH_TOKEN`
8. Uploads the installer (e.g., `Production-Management-Setup-0.2.0.exe`)

## Creating a New Release

### Method 1: Using Git Tags (Recommended)

```bash
# Ensure your version in package.json is updated
# e.g., "version": "0.2.0"

# Create and push a tag
git tag v0.2.0
git push origin v0.2.0
```

### Method 2: Using GitHub Web Interface

1. Go to: https://github.com/elionshate/productionapp/releases/new
2. Click "Choose a tag" and type a new tag (e.g., `v0.2.0`)
3. Click "Create new tag: v0.2.0 on publish"
4. Fill in release details:
   - **Release title**: e.g., "Production Management v0.2.0"
   - **Description**: Add release notes
5. Click "Publish release"

Both methods will trigger the auto-publish workflow.

## Monitoring Releases

### Check Workflow Status

1. Go to: https://github.com/elionshate/productionapp/actions
2. Click on the latest "Release & Publish" workflow run
3. Monitor the build progress

### View Published Releases

1. Go to: https://github.com/elionshate/productionapp/releases
2. Your release should appear with the installer attached

## Troubleshooting

### Build Fails with "GH_TOKEN not found"

- Ensure you created the repository secret with the exact name `GH_TOKEN`
- Verify the token has the `repo` scope
- Check that the token hasn't expired

### Build Fails During npm ci or Build Steps

- Check the Actions logs for specific error messages
- Common issues:
  - Node version mismatch (workflow uses Node 20)
  - Missing dependencies in package.json
  - Build errors in the application code

### Release Doesn't Appear on GitHub

- Check that `electron-builder.json` has the correct owner/repo:
  ```json
  "publish": [
    {
      "provider": "github",
      "owner": "elionshate",
      "repo": "productionapp"
    }
  ]
  ```
- Verify the `GH_TOKEN` has write permissions (`contents: write`)

### Token Expiration

When your PAT expires:
1. Generate a new token following Step 1
2. Update the `GH_TOKEN` secret following Step 2
3. No code changes needed - the workflow will use the new token

## Security Best Practices

1. **Never commit the token to the repository**
   - Always use GitHub Secrets
   - Never log the token value

2. **Use minimal scopes**
   - The `repo` scope is required for publishing releases
   - Don't add unnecessary scopes

3. **Rotate tokens regularly**
   - Set expiration dates on tokens
   - Update the secret before expiration

4. **Monitor token usage**
   - GitHub shows when tokens are used
   - Revoke tokens if suspicious activity is detected

## Additional Configuration

### Adding macOS/Linux Builds

To support multiple platforms, update `.github/workflows/release.yml`:

```yaml
jobs:
  build-and-release:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    # ... rest of the configuration
```

Note: This requires updating the build scripts and electron-builder configuration for cross-platform support.

### Auto-Update Configuration

The application uses `electron-updater` (already in dependencies). With auto-publish configured:

1. The workflow publishes releases to GitHub
2. Users with the app installed can receive auto-updates
3. Configure update checks in `main/index.ts` if not already done

## Summary Checklist

Before releasing:
- [ ] GitHub Personal Access Token created with `repo` scope
- [ ] Token added as repository secret named `GH_TOKEN`
- [ ] Version in `package.json` updated
- [ ] `electron-builder.json` has correct owner/repo
- [ ] Workflow file `.github/workflows/release.yml` exists
- [ ] Code is tested and ready for release

To release:
- [ ] Push a tag starting with `v` (e.g., `v0.2.0`)
- [ ] Monitor workflow at https://github.com/elionshate/productionapp/actions
- [ ] Verify release at https://github.com/elionshate/productionapp/releases

## References

- [GitHub Personal Access Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
