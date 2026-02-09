# Installation Guide - Production Management App

## ✅ No Extra Downloads Required!

**Good news:** The Production Management installer is completely self-contained. You **DO NOT** need to download or install any additional software like Node.js, databases, or other dependencies.

## 📥 Download & Install

### Step 1: Download the Installer

Visit the [Releases page](https://github.com/elionshate/productionapp/releases) and download the installer for your operating system:

- **Windows**: `Production.Management-Setup-X.X.X.exe` (~178MB)
- **macOS**: `Production.Management-X.X.X.dmg` (coming soon)
- **Linux**: `Production.Management-X.X.X.AppImage` (coming soon)

### Step 2: Run the Installer

#### Windows
1. Double-click the downloaded `.exe` file
2. If Windows Defender SmartScreen appears, click "More info" → "Run anyway"
3. Follow the installation wizard:
   - Choose installation location (default is recommended)
   - Select "Create desktop shortcut" if desired
   - Click "Install"
4. Launch the app from the desktop shortcut or Start Menu

#### macOS (Coming Soon)
1. Open the downloaded `.dmg` file
2. Drag "Production Management" to the Applications folder
3. Launch from Applications or Spotlight

#### Linux (Coming Soon)
1. Make the AppImage executable: `chmod +x Production.Management-X.X.X.AppImage`
2. Run the AppImage: `./Production.Management-X.X.X.AppImage`

### Step 3: First Launch

On the first launch:
- The app will automatically create its database (takes 5-10 seconds)
- No configuration needed - just start using the app!
- Your data is stored locally on your computer

## 🖥️ System Requirements

### Windows
- **OS**: Windows 10 or later (64-bit)
- **Processor**: Intel Core i3 or equivalent (or better)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 200MB for installation
- **Display**: 1280×720 minimum resolution

### macOS (Coming Soon)
- **OS**: macOS 10.15 (Catalina) or later
- **Processor**: Intel or Apple Silicon
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 200MB for installation

### Linux (Coming Soon)
- **OS**: Modern distribution with GLIBC 2.28+
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 200MB for installation

## 💾 What's Included in the Installer?

Everything you need is bundled:

✅ **Complete Application** - Full Electron desktop app  
✅ **Database** - SQLite database (auto-created on first run)  
✅ **Runtime Dependencies** - All Node.js modules and libraries  
✅ **No Internet Required** - Works 100% offline after installation  

## 📂 Where is My Data Stored?

Your data is stored locally in a SQLite database file:

- **Windows**: `%APPDATA%\Production Management\production.db`
  - Typically: `C:\Users\YourUsername\AppData\Roaming\Production Management\production.db`
- **macOS**: `~/Library/Application Support/Production Management/production.db`
- **Linux**: `~/.config/Production Management/production.db`

**Important:** This folder is created automatically on first launch.

## 🔒 Privacy & Security

- ✅ All data stays on your computer (local-first)
- ✅ No internet connection required after installation
- ✅ No data is sent to external servers
- ✅ No analytics or tracking
- ✅ Your data, your control

## 📋 Post-Installation

### Recommended: Set Up Backups

Since your data is stored locally, we **strongly recommend** backing up your database file regularly:

1. Close the Production Management app
2. Copy the database file from the location above
3. Store the copy in a safe location (external drive, cloud storage, etc.)
4. Repeat this process weekly or after significant data entry

### Optional: Create Multiple Installations

You can install the app on multiple computers. Each installation will have its own independent database. 

*Note: In a future release, we plan to add cloud sync capabilities via Supabase.*

## ❓ Common Questions

**Q: Do I need administrator/root privileges to install?**  
A: On Windows, the installer will prompt for admin rights if needed. On macOS/Linux, standard user permissions are sufficient.

**Q: Can I install to a USB drive for portable use?**  
A: The database is always stored in the user data directory, but the application can be installed to external storage.

**Q: How do I update to a new version?**  
A: Download the latest installer and run it. Your existing data will be preserved.

**Q: Can I uninstall the app?**  
A: Yes, use the standard uninstaller:
- Windows: Settings → Apps → Production Management → Uninstall
- macOS: Drag app to Trash
- Linux: Delete the AppImage file

**Note:** Uninstalling the app does NOT delete your database file. You must manually delete it if you want to remove all data.

## 🐛 Troubleshooting

### App Won't Start on Windows

1. **Check Windows version**: Right-click Start → System. Ensure Windows 10 or later.
2. **Run as Administrator**: Right-click the app → "Run as administrator"
3. **Check Windows Defender**: 
   - Go to Windows Security → Virus & threat protection
   - Check if the app was blocked
   - Add an exception if needed
4. **Reinstall**: Uninstall completely and reinstall with admin rights

### "Application Error" on First Launch

This usually means the database couldn't be created:

1. Check available disk space (need at least 500MB free)
2. Ensure you have write permissions to `%APPDATA%` (Windows) or equivalent
3. Try running the app as Administrator once
4. Check antivirus isn't blocking file creation

### App Crashes After Update

1. Close the app completely
2. Locate your database file (see "Where is My Data Stored?" above)
3. Make a backup copy of `production.db`
4. Restart the app

If crashes persist, file an issue on GitHub with the error log from:
- Windows: `%APPDATA%\Production Management\logs\`
- macOS: `~/Library/Logs/Production Management/`
- Linux: `~/.config/Production Management/logs/`

### Database Corruption

If you see "database disk image is malformed" errors:

1. Close the app
2. Navigate to the database location
3. Rename `production.db` to `production.db.backup`
4. Restart the app (creates a fresh database)
5. If needed, contact support to help recover data from the backup

## 📞 Support

For issues not covered here:

1. Check the [main README.md](README.md) for additional documentation
2. Search existing [GitHub Issues](https://github.com/elionshate/productionapp/issues)
3. Open a new issue with:
   - Operating system and version
   - App version number
   - Steps to reproduce the problem
   - Any error messages or screenshots

## 📄 License

Private - All rights reserved
