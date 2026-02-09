# ProductionApp - Local-First Desktop Application

A production-grade, cross-platform desktop application for **Production, Orders, Inventory, and Assembly Management** built with Next.js, Electron, and Prisma.

## 🏗️ Architecture

**Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS)  
**Desktop Wrapper**: Electron 40  
**Database**: Prisma ORM with SQLite (Migration-ready for PostgreSQL/Supabase)  
**Package Manager**: npm

## 📋 Key Features

✅ **Local-First**: SQLite embedded database, zero server dependencies  
✅ **Migration-Ready**: CUID-based IDs prevent collisions when moving to cloud  
✅ **Production-Grade**: Strict TypeScript, ESLint, runtime validation  
✅ **Secure IPC**: Context isolation, sandboxed renderer process  
✅ **Feature-Sliced**: Scalable domain-driven architecture

## 📥 For End Users - Download & Run

### Quick Install (No Extra Downloads Required!)

**The installer is completely self-contained** - you don't need to install Node.js, databases, or any other dependencies.

1. **Download** the latest release from the [Releases page](https://github.com/elionshate/productionapp/releases)
   - Windows: `Production.Management-Setup-X.X.X.exe` (~178MB)
   - macOS: `Production.Management-X.X.X.dmg` (coming soon)
   - Linux: `Production.Management-X.X.X.AppImage` (coming soon)

2. **Install & Run**
   - Windows: Double-click the `.exe` installer and follow the setup wizard
   - The app will automatically create its database on first launch
   - Everything you need is bundled inside the installer!

### System Requirements
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later (coming soon)
- **Linux**: Modern distribution with GLIBC 2.28+ (coming soon)
- **Disk Space**: ~200MB for installation
- **RAM**: 4GB minimum recommended

### What's Included?
✅ Complete Electron application  
✅ Embedded SQLite database (auto-created on first run)  
✅ All runtime dependencies  
✅ No internet connection required after installation  

---

## 🚀 For Developers - Build from Source

### Prerequisites
- Node.js 20+ and npm
- Windows/macOS/Linux

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Development

```bash
# Start Next.js dev server + Electron
npm run electron:dev

# Or run separately:
npm run dev              # Next.js only (http://localhost:3000)
npm run electron         # Electron only
```

### Build for Production

```bash
# Build Next.js static export
npm run build

# Compile Electron main process
npm run build:electron

# Package as installer
npm run electron:build
```

### Publishing a Release

The repository is configured for automated publishing to GitHub Releases:

```bash
# Update version in package.json
# Then create and push a tag
git tag v0.2.1
git push origin v0.2.1
```

GitHub Actions will automatically build and publish the release. See `RELEASE_SETUP.md` for configuration details.

## 📁 Project Structure

```
productionapp/
├── app/                    # Next.js App Router
├── components/
│   └── ui/                # Generic reusable components
├── features/              # Feature-based modules (domain logic)
├── lib/
│   ├── db.ts             # Prisma singleton client
│   ├── env.ts            # Zod environment validation
│   └── utils.ts          # Utility functions
├── actions/              # Next.js Server Actions
├── types/                # TypeScript definitions
├── main/                 # Electron main process
│   ├── index.ts         # Main process entry point
│   ├── preload.ts       # Secure IPC bridge
│   └── tsconfig.json
├── prisma/
│   ├── schema.prisma    # Database schema (CUID strategy)
│   └── migrations/      # Migration history
├── public/              # Static assets
├── @agent_logs.md       # Architectural documentation
└── [config files]
```

## 🔐 Security Features

1. **Context Isolation**: Renderer process isolated from Node.js
2. **Sandbox Mode**: Renderer runs in sandboxed environment
3. **No Node Integration**: Prevents remote code execution
4. **Secure IPC**: Explicit API via preload script (no remote module)
5. **Environment Validation**: Runtime checks with Zod

## 🗄️ Database Migration Strategy (SQLite → Supabase)

### Why CUID/UUID IDs?

**Problem**: Auto-incrementing IDs (`1, 2, 3...`) cause collisions when merging multiple local databases.

**Solution**: Every model uses globally unique CUIDs:
```prisma
model YourModel {
  id String @id @default(cuid())  // ✅ Migration-safe
  // NOT: id Int @id @default(autoincrement())  ❌ Will conflict
}
```

### Migration Process (Future)

1. Export data from all local SQLite instances
2. Transform to PostgreSQL-compatible format (already compatible!)
3. Import to Supabase with preserved CUIDs
4. Update `DATABASE_URL` in `.env`
5. Run `npx prisma migrate deploy`

**Zero ID conflicts guaranteed** ✅

## 🛠️ Development Tools

### Prisma Studio
```bash
npm run prisma:studio
```
Visual database editor at http://localhost:5555

### ESLint
```bash
npm run lint
```
Strict rules for TypeScript, accessibility, unused variables

### DevTools
- **Electron DevTools**: Auto-opens in development mode
- **Next.js DevTools**: Available at http://localhost:3000
- **React DevTools**: Available in Electron window

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build Next.js static export |
| `npm run build:electron` | Compile Electron TypeScript |
| `npm run electron` | Run Electron app |
| `npm run electron:dev` | Dev mode (Next.js + Electron) |
| `npm run electron:build` | Package installer |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run lint` | Run ESLint |

## 🔧 Configuration Files

- **tsconfig.json**: TypeScript config (strict mode, unused variable checks)
- **eslint.config.mjs**: ESLint rules (accessibility, unused vars)
- **next.config.ts**: Next.js config (static export for Electron)
- **electron-builder.json**: Installer packaging config
- **prisma.config.ts**: Prisma configuration
- **.env**: Environment variables (DATABASE_URL, NODE_ENV)

## 📚 Next Steps

1. **Define Your Models**: Edit `prisma/schema.prisma` (use CUID IDs!)
2. **Create Features**: Add feature modules in `features/`
3. **Build UI Components**: Add reusable components in `components/ui/`
4. **Implement Server Actions**: Add database operations in `actions/`
5. **Test IPC**: Use `window.electronAPI` for secure communication

## 🚨 Important Constraints

❌ **NEVER** use `Int @id @default(autoincrement())`  
✅ **ALWAYS** use `String @id @default(cuid())` or `@default(uuid())`

❌ **NEVER** use SQLite-specific features  
✅ **ALWAYS** use PostgreSQL-compatible syntax

❌ **NEVER** expose Node.js API to renderer  
✅ **ALWAYS** use secure IPC via preload script

## 📖 Documentation

- **Architectural Log**: See `@agent_logs.md` for all decisions
- **Feature Guidelines**: See `features/README.md`
- **UI Guidelines**: See `components/ui/README.md`
- **Release Setup**: See `RELEASE_SETUP.md` for automated publishing configuration

## ❓ Frequently Asked Questions

### For End Users

**Q: Do I need to install Node.js or any database software?**  
A: **No!** The installer is completely self-contained. Everything you need is bundled inside.

**Q: Does the app require internet access?**  
A: **No** - after installation, the app works 100% offline. Your data stays on your computer.

**Q: Where is my data stored?**  
A: The SQLite database is stored in your user data directory:
- Windows: `%APPDATA%/Production Management/production.db`
- macOS: `~/Library/Application Support/Production Management/production.db` (coming soon)
- Linux: `~/.config/Production Management/production.db` (coming soon)

**Q: Is my data backed up?**  
A: The app stores data locally only. We recommend backing up your database file regularly to prevent data loss.

**Q: Can I use this on multiple computers?**  
A: Yes! Each installation creates its own local database. In the future, migration to a shared cloud database (Supabase) will be supported.

### For Developers

**Q: What's included in the packaged release?**  
A: The Electron installer bundles:
- Complete Next.js static export (`out/` directory)
- Compiled Electron main process (`dist/main/`)
- All Node.js dependencies (`node_modules/`)
- Prisma client (`.prisma/` folder)
- Better-sqlite3 native binaries (unpacked for SQLite access)
- Database schema (auto-created on first run via embedded SQL)

**Q: How does the database get created?**  
A: On first launch, the Electron main process runs `initializeDatabase()` which executes raw SQL to create all tables. No Prisma CLI is needed in production. See `main/index.ts` for implementation details.

**Q: Why use CUID instead of auto-increment IDs?**  
A: CUIDs (Collision-resistant Unique IDentifiers) prevent ID conflicts when merging multiple local databases into a central database (e.g., migrating to Supabase). Auto-increment IDs would create duplicate keys.

## 🐛 Troubleshooting

### For End Users

**App won't start on Windows**
- Ensure you have Windows 10 or later (64-bit)
- Try running the installer as Administrator
- Check Windows Defender isn't blocking the app
- Look for error logs in `%APPDATA%/Production Management/logs/`

**Database errors on first launch**
- The app needs write permissions to your user data folder
- On Windows, ensure the installer has proper permissions
- Try deleting `production.db` and restarting the app to recreate the database

**Installation is slow**
- The installer is ~178MB and includes many bundled dependencies
- First launch may take 10-20 seconds while the database is created
- Subsequent launches will be faster

### For Developers

**"Cannot find module '@prisma/client'"**
```bash
npm run prisma:generate
```

**Database migration issues**
```bash
# Reset development database
rm dev.db
npm run prisma:migrate
```

**Build fails on electron:build**
```bash
# Ensure all dependencies are installed
npm install
# Rebuild native modules for Electron
npm rebuild better-sqlite3 --runtime=electron --target=40.0.0
```

## 📄 License

Private - All rights reserved
