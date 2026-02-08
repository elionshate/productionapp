# Download & Installation Guide

## 📥 Downloading the Application

### Option 1: Latest Release (Recommended)

1. Visit the [Releases Page](https://github.com/elionshate/productionapp/releases)
2. Find the latest release (tagged with version number, e.g., `v0.1.0`)
3. Under **Assets**, download the installer for your platform:
   - **Windows**: `Production Management-Setup-{version}.exe` (~150-250 MB)
   - **macOS**: `Production Management-{version}.dmg` (if available)
   - **Linux**: `Production Management-{version}.AppImage` (if available)

### Option 2: Direct Link

For the latest version, you can use this direct link structure:
```
https://github.com/elionshate/productionapp/releases/latest/download/Production%20Management-Setup-{version}.exe
```

## 🖥️ Windows Installation

### Prerequisites
- **Operating System**: Windows 10 or later (64-bit)
- **Disk Space**: At least 500 MB free space
- **Permissions**: Administrator rights for installation

### Installation Steps

1. **Download the Installer**
   - Download `Production Management-Setup-{version}.exe` from the releases page

2. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - If Windows SmartScreen appears, click "More info" → "Run anyway"
     - *Note: This is normal for new applications. The app is safe.*

3. **Choose Installation Location**
   - Select installation directory (default: `C:\Users\{YourName}\AppData\Local\Programs\production-management`)
   - Choose whether to create desktop and start menu shortcuts

4. **Complete Installation**
   - Click "Install" and wait for the process to complete
   - The application will launch automatically when finished

5. **First Launch**
   - The app creates a local SQLite database in your user data folder
   - No internet connection required - fully offline capable

## 🔄 Auto-Updates

The application includes automatic update functionality:

1. **Update Check**: The app checks for new versions on startup
2. **Download**: If an update is available, it downloads in the background
3. **Notification**: You'll see a blue badge showing download progress
4. **Installation**: Click the green "Update to v{version} — Restart" button when ready
5. **Automatic Install**: The app will close, install the update, and relaunch

## 🛡️ Security & Trust

### Code Signing Status

The application is currently **self-signed** for development/testing purposes.

#### What This Means:
- Windows will show a "Windows protected your PC" warning
- This is expected for self-signed applications
- Click "More info" → "Run anyway" to proceed

#### For Production Use:
If you need to deploy to multiple machines in an organization, consider:
1. Adding the certificate to your organization's Trusted Publishers store
2. Using Group Policy to deploy the certificate
3. Or obtaining a commercial code signing certificate

### Installing the Self-Signed Certificate (Optional)

If you want to avoid the SmartScreen warning on future updates:

1. Right-click the `.exe` file → Properties → Digital Signatures
2. Select the signature → Details → View Certificate → Install Certificate
3. Choose "Local Machine" → Place in "Trusted Root Certification Authorities"
4. Choose "Local Machine" → Also place in "Trusted Publishers"

**PowerShell Method** (Run as Administrator):
```powershell
# Export the certificate
$cert = (Get-AuthenticodeSignature "Production Management-Setup-0.1.0.exe").SignerCertificate
Export-Certificate -Cert $cert -FilePath "code-signing.cer"

# Import to Trusted Root and Trusted Publishers
Import-Certificate -FilePath "code-signing.cer" -CertStoreLocation Cert:\LocalMachine\Root
Import-Certificate -FilePath "code-signing.cer" -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
```

## 📂 File Locations

After installation, the app stores data in:

- **Application**: `C:\Users\{YourName}\AppData\Local\Programs\production-management\`
- **User Data**: `C:\Users\{YourName}\AppData\Roaming\production-management\`
- **Database**: `C:\Users\{YourName}\AppData\Roaming\production-management\data\production.db`

## 🔧 Troubleshooting

### Issue: "Windows protected your PC"
**Solution**: This is normal for self-signed apps. Click "More info" → "Run anyway"

### Issue: Installation fails
**Solutions**:
- Ensure you have administrator rights
- Check that you have enough disk space (500 MB minimum)
- Temporarily disable antivirus and try again
- Download the installer again (file may be corrupted)

### Issue: App won't launch after installation
**Solutions**:
- Check Task Manager - ensure old processes are closed
- Try running as Administrator
- Reinstall the application
- Check Windows Event Viewer for error details

### Issue: Database errors
**Solutions**:
- Close all instances of the app
- Delete the database file (you'll lose data) at:
  `C:\Users\{YourName}\AppData\Roaming\production-management\data\production.db`
- Restart the app to create a fresh database

### Issue: Auto-update not working
**Solutions**:
- Check your internet connection
- The app needs to connect to GitHub to check for updates
- Check if your firewall is blocking the app
- Wait a few minutes - updates are checked on startup

## 🚀 For Developers: Building from Source

If you want to build the installer yourself instead of downloading:

```bash
# Clone the repository
git clone https://github.com/elionshate/productionapp.git
cd productionapp

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Build the installer
npm run electron:build:win
```

The installer will be created in `dist/installer/`

## 📞 Support

For issues, questions, or feature requests:
- **Issues**: [GitHub Issues](https://github.com/elionshate/productionapp/issues)
- **Repository**: [elionshate/productionapp](https://github.com/elionshate/productionapp)

## 📄 License

This application is private and proprietary. All rights reserved.
