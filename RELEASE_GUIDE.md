# Release Guide for Maintainers

This guide explains how to create and publish new releases of the Production Management application.

## 🚀 Automated Release Process (Recommended)

The repository includes a GitHub Actions workflow that automates the build and release process.

### Creating a New Release

#### Method 1: Tag-Based Release (Recommended)

1. **Update Version in package.json**
   ```bash
   # Edit package.json and update the version field
   # Example: "version": "0.2.0"
   ```

2. **Commit the Version Change**
   ```bash
   git add package.json
   git commit -m "chore: bump version to 0.2.0"
   git push origin main
   ```

3. **Create and Push a Git Tag**
   ```bash
   # Create a tag matching the version (must start with 'v')
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. **Workflow Triggers Automatically**
   - The GitHub Actions workflow detects the tag
   - Builds the application on Windows
   - Creates installers for all platforms
   - Publishes to GitHub Releases automatically
   - Uploads the installer as an artifact

5. **Verify the Release**
   - Go to: https://github.com/elionshate/productionapp/releases
   - You should see the new release with installers attached

#### Method 2: Manual Workflow Dispatch

1. Go to: https://github.com/elionshate/productionapp/actions
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Enter the version (e.g., `v0.2.0`)
5. Click "Run workflow"

### What the Workflow Does

1. **Checkout**: Gets the latest code
2. **Setup**: Installs Node.js 20 and dependencies
3. **Generate**: Creates Prisma Client
4. **Build**: Runs the full production build
5. **Package**: Creates the installer using electron-builder
6. **Publish**: Uploads to GitHub Releases
7. **Archive**: Saves installer as workflow artifact (30 days)

## 🛠️ Manual Release Process (Advanced)

If you need to build and publish manually:

### Prerequisites

- Windows machine (for Windows builds)
- Node.js 20+ installed
- Git installed
- GitHub Personal Access Token with `repo` scope

### Steps

1. **Set GitHub Token**
   ```bash
   # Windows (PowerShell)
   $env:GH_TOKEN="your_github_token_here"
   
   # macOS/Linux
   export GH_TOKEN="your_github_token_here"
   ```

2. **Update Version**
   ```bash
   # Edit package.json version field
   ```

3. **Build and Publish**
   ```bash
   # Install dependencies
   npm ci
   
   # Generate Prisma Client
   npm run prisma:generate
   
   # Build everything
   npm run build:production
   
   # Package and publish to GitHub Releases
   npm run electron:build:win -- --publish always
   ```

4. **Create Git Tag**
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

## 📋 Pre-Release Checklist

Before creating a release, ensure:

- [ ] All tests pass
- [ ] Code has been reviewed
- [ ] Version number is updated in `package.json`
- [ ] CHANGELOG is updated (if you maintain one)
- [ ] Database migrations are included (if any)
- [ ] No breaking changes without documentation
- [ ] Icons are up to date (run `npm run build:icons` if changed)
- [ ] README reflects any new features or changes

## 🔢 Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.2.0): New features, backwards compatible
- **PATCH** (0.1.1): Bug fixes, backwards compatible

Examples:
- `v0.1.0` → First release
- `v0.1.1` → Bug fix release
- `v0.2.0` → New features added
- `v1.0.0` → Production-ready, stable API

## 📦 Release Assets

Each release should include:

### Windows
- `Production Management-Setup-{version}.exe` (NSIS installer)
- `latest.yml` (auto-update metadata)

### macOS (when configured)
- `Production Management-{version}.dmg`
- `latest-mac.yml`

### Linux (when configured)
- `Production Management-{version}.AppImage`
- `latest-linux.yml`

## 🔄 Auto-Update Configuration

The app uses `electron-updater` to check for new releases:

1. **On Startup**: App checks GitHub Releases API
2. **Version Compare**: Compares current version with latest release tag
3. **Download**: If newer version exists, downloads in background
4. **Notify**: Shows update notification in app
5. **Install**: User clicks "Restart" to install update

### Testing Auto-Updates

1. Install version `v0.1.0`
2. Create and publish version `v0.2.0`
3. Launch the `v0.1.0` app
4. Wait for update notification (checks on startup)
5. Verify download progress shows
6. Click "Restart" and verify update installs

## 🚨 Troubleshooting

### Build Fails in GitHub Actions

**Check the workflow logs**:
1. Go to Actions tab
2. Click the failed workflow run
3. Expand the failing step to see error details

**Common issues**:
- Node modules cache corruption → Re-run workflow
- Dependency conflicts → Update `package-lock.json`
- Prisma generation failure → Check schema validity
- Out of disk space → Unlikely on GitHub runners
- Timeout → Increase timeout in workflow file

### Publishing Fails

**Error: "Could not find GitHub token"**
- Ensure `GH_TOKEN` is set (for manual builds)
- For GitHub Actions, `GITHUB_TOKEN` is automatic

**Error: "Release already exists"**
- Delete the existing release and tag
- Or increment the version number

**Error: "Asset upload failed"**
- Check file size limits (2GB per file on GitHub)
- Check network connection
- Retry the build

### Auto-Update Not Working

**Users not seeing updates**:
- Verify the release is published (not draft)
- Check that `latest.yml` is uploaded
- Ensure version tags start with 'v' (e.g., `v0.2.0`)
- Verify `publish` config in `electron-builder.json` is correct

## 📊 Monitoring Releases

### Check Release Downloads

Go to: https://github.com/elionshate/productionapp/releases

Each release shows:
- Number of downloads per asset
- Download trends over time
- Total downloads

### Analytics

Consider tracking:
- Download counts
- Active installations (if telemetry added)
- Update adoption rates
- Platform distribution

## 🔐 Code Signing (Future Enhancement)

Currently using self-signed certificates. To improve user trust:

### For Windows
1. Purchase a code signing certificate from a CA (e.g., DigiCert, Sectigo)
2. Add certificate to `electron-builder.json`:
   ```json
   "win": {
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "your_password"
   }
   ```
3. Store password in GitHub Secrets
4. Update workflow to use real certificate

### For macOS
1. Enroll in Apple Developer Program ($99/year)
2. Get a Developer ID certificate
3. Add to `electron-builder.json`:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAM_ID)"
   }
   ```

## 📞 Support

For questions about the release process:
- Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
- Check the [electron-builder documentation](https://www.electron.build/)
- Review the workflow file: `.github/workflows/release.yml`
- Open an issue in the repository

## 📚 Additional Resources

- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Semantic Versioning](https://semver.org/)
