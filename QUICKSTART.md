# 🚀 QUICK START GUIDE

## ⚠ Prerequisites
- **PostgreSQL 14+** OR **Docker** must be installed
- Node.js 18+ (already installed if setup.ps1 worked)

## One-Command Setup

```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation

# 1. Setup database (choose one method - follow prompts)
.\setup-database.ps1

# 2. Install dependencies and configure
.\setup.ps1
```

## One-Command Start

```powershell
.\start.ps1
```

Then open: **http://localhost:5173**

## Default Login
```
Email: admin@example.com
Password: Admin123!
```

---

## 📁 What You Got

### Full-Stack Application
- ✅ **Backend**: Node.js + Express + TypeScript + Playwright
- ✅ **Frontend**: React + TypeScript + Vite + TailwindCSS  
- ✅ **Database**: PostgreSQL with 13 tables
- ✅ **Auth**: JWT with role-based access
- ✅ **Automation**: Playwright for browser testing

### Features
- ✅ User management (3 roles: qa, qa_lead, dev)
- ✅ Project & site organization
- ✅ Automated web testing (desktop 1440×900)
- ✅ Page crawling (sitemap.xml + links, max 30 pages)
- ✅ Screenshot capture (full-page PNG)
- ✅ Visual analysis (layout issues)
- ✅ Form testing (auto-detect & test)
- ✅ Issue tracking (complete workflow)
- ✅ Modern SPA interface

---

## 🎯 Quick Usage

### 1. First-Time Setup (5 minutes)
```powershell
# Run setup script
.\setup.ps1

# Enter your PostgreSQL password when prompted
# Script handles everything else!
```

### 2. Daily Use (30 seconds)
```powershell
# Start both servers
.\start.ps1

# Opens browser automatically
# Login with admin@example.com
```

### 3. Your First Test (2 minutes)
1. Click "New Project" → Name it
2. Open project → "New Site" → Enter URL
3. Open site → "Run Test"
4. Wait ~30-60 seconds
5. View auto-generated issues!

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| **README.md** | Project overview & features |
| **SETUP.md** | Detailed installation guide |
| **DEVELOPMENT.md** | Architecture & developer docs |
| **COMPLETION.md** | Requirements checklist |

---

## 🔧 Manual Commands

### Backend
```powershell
cd backend
npm install              # Install dependencies
npx playwright install   # Install browser
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
```

### Frontend
```powershell
cd frontend
npm install       # Install dependencies
npm run dev       # Start dev server (port 5173)
npm run build     # Build for production
```

### Database
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE qa_automation;"

# Run schema
psql -U postgres -d qa_automation -f database/schema.sql
```

---

## 🌐 URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main UI |
| Backend | http://localhost:3000 | API Server |
| Health Check | http://localhost:3000/health | Status |

---

## 👥 User Roles

| Role | Can Do |
|------|--------|
| **QA Lead** | Everything (create projects, sites, runs, manage issues) |
| **QA** | Run tests, manage issues |
| **Developer** | View issues, change to "Ready for QA", comment |

---

## 🎯 Common Tasks

### Create a Project (QA Lead)
1. Login → Projects → "New Project"
2. Enter name & client name → Create

### Add a Site (QA Lead)
1. Open project → "New Site"
2. Enter name, URL, environment → Create

### Run a Test (QA/QA Lead)
1. Open site → "Run Test"
2. Wait for completion (auto-refreshes)
3. View issues when done

### Manage Issues (QA)
1. Issues → Filter by site/status
2. Click issue → Review screenshot
3. Update status/severity/assign
4. Add comments

### Fix Issues (Developer)
1. Issues → Filter: Status = "Open (For Dev)"
2. Fix on actual website
3. Update status to "Ready for QA"
4. Add comment describing fix

### Verify Fixes (QA)
1. Run new test on site
2. Check issue is gone
3. Mark as "Resolved"

---

## 🔒 Change Admin Password

```powershell
# In psql
psql -U postgres -d qa_automation

# Generate new hash (use bcrypt online or Node.js)
# Then update:
UPDATE users SET password_hash = '$2b$10$YOUR_NEW_HASH' WHERE email = 'admin@example.com';
```

---

## 🆘 Troubleshooting

**Can't connect to database?**
```powershell
# Check PostgreSQL is running
pg_isready

# Verify .env DATABASE_URL
notepad backend\.env
```

**Port in use?**
```powershell
# Change backend port
notepad backend\.env  # Change PORT=3000

# Change frontend port  
notepad frontend\vite.config.ts  # Change port: 5173
```

**Browser automation fails?**
```powershell
cd backend
npx playwright install --with-deps chromium
```

---

## 🎉 You're All Set!

The platform is ready to automate your QA testing.

**Support**: See SETUP.md for detailed troubleshooting

**Development**: See DEVELOPMENT.md for architecture

**Happy Testing! 🚀**
