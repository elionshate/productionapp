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

## 🚀 Quick Start

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

## 📄 License

Private - All rights reserved
