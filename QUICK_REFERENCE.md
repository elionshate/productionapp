# Quick Reference: App Distribution

## 📥 For Users (Downloading the App)

**Simplest way to get the app:**

1. Go to: https://github.com/elionshate/productionapp/releases/latest
2. Download `Production Management-Setup-{version}.exe`
3. Run the installer
4. Click "More info" → "Run anyway" if Windows SmartScreen appears

📖 **Full instructions**: See [DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md)

---

## 🚀 For Maintainers (Creating a Release)

**Simplest way to create a new release:**

1. Update version in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "chore: bump version to 0.2.0"
   git push origin main
   ```

3. Create and push tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. GitHub Actions automatically:
   - ✅ Builds the app
   - ✅ Creates installers
   - ✅ Publishes to GitHub Releases
   - ✅ Users get auto-update notifications

📖 **Full instructions**: See [RELEASE_GUIDE.md](RELEASE_GUIDE.md)

---

## 🔄 Auto-Update Flow

1. **User installs** v0.1.0
2. **Maintainer publishes** v0.2.0 (using steps above)
3. **User launches** the app
4. **App automatically**:
   - Checks GitHub for updates
   - Downloads v0.2.0 in background
   - Shows "Update available" notification
5. **User clicks** "Restart to update"
6. **App updates** and relaunches

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Automated build & release workflow |
| `electron-builder.json` | Build configuration & GitHub publish settings |
| `DOWNLOAD_GUIDE.md` | End-user installation instructions |
| `RELEASE_GUIDE.md` | Maintainer release process documentation |
| `README.md` | Main project documentation |

---

## 🎯 What's Been Set Up

✅ **GitHub Actions workflow** triggers on version tags  
✅ **electron-builder** configured to publish to GitHub Releases  
✅ **Auto-update system** built into the app (electron-updater)  
✅ **Download instructions** for end users  
✅ **Release process** documentation for maintainers  

**Everything is ready to use!** Just push a version tag to create your first release.

---

## 💡 Example: Your First Release

```bash
# 1. Make sure your app is working
npm run electron:dev

# 2. Update version
# Edit package.json: "version": "0.1.0"

# 3. Commit and tag
git add package.json
git commit -m "chore: release v0.1.0"
git push origin main
git tag v0.1.0
git push origin v0.1.0

# 4. Wait for GitHub Actions to complete (5-15 minutes)

# 5. Check the release page
# https://github.com/elionshate/productionapp/releases

# 6. Share the download link with users
# https://github.com/elionshate/productionapp/releases/latest
```

---

## 🆘 Quick Troubleshooting

**Release build fails in GitHub Actions?**
→ Check the Actions tab for error logs

**Users can't download?**
→ Ensure release is "Published" not "Draft"

**Auto-update not working?**
→ Version tags must start with 'v' (e.g., v0.2.0, not 0.2.0)

**SmartScreen warning?**
→ Normal for self-signed apps. See DOWNLOAD_GUIDE.md for certificate installation

---

Need more details? See the full guides:
- 👥 [DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md) - For end users
- 🔧 [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - For maintainers
