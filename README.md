# Autonomous Web QA Platform - MVP1

A complete autonomous web testing platform that automatically discovers pages, captures screenshots, runs visual and form tests, and manages QA issues through a modern web interface.

![Project Status](https://img.shields.io/badge/Status-MVP1-success)
![Node Version](https://img.shields.io/badge/Node-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)

## 🎯 Overview

This platform automates the tedious work of QA testing by:
- Automatically discovering pages from your website
- Capturing full-page screenshots
- Detecting visual layout issues (horizontal scroll, overlapping elements, viewport overflow)
- Testing all forms with happy-path scenarios
- Creating organized issues with screenshots for your team
- Managing the complete QA workflow from detection to resolution

**Perfect for**: QA teams wanting to automate repetitive testing, developers who need to catch issues early, and teams looking to improve their testing efficiency.

## ✨ Features (MVP1)

### 🔐 User Management
- Email/password authentication with JWT tokens
- Role-based access control (QA, QA Lead, Developer)
- Secure password hashing

### 📁 Project Organization
- Create projects for different clients/products
- Organize sites under projects
- Track multiple environments (Staging, Production, Other)

### 🤖 Automated Testing
- **Desktop-only** test runs (1440×900 viewport)
- Intelligent page discovery:
  - Reads sitemap.xml automatically
  - Crawls internal links (max depth: 2)
  - Limits to 30 pages per run (configurable)
  - Excludes common admin/login paths
- Full-page screenshot capture
- DOM snapshot storage

### 🔍 Visual Analysis
Automatically detects:
- Horizontal scrollbars (responsive issues)
- Overlapping page elements
- Elements outside viewport bounds

### 📝 Form Testing
- Automatically finds all forms on each page
- Skips login forms intelligently
- Fills forms with realistic test data
- Detects success/error messages
- Reports submission failures

### 🎫 Issue Management
- Auto-creates issues from detected problems
- Screenshot attached to every issue
- Full workflow support:
  - New → Open (For Dev) → Ready for QA → Resolved
  - Can reject issues at any stage
- Comment system for collaboration
- Filter by status, type, severity, site
- Status change history tracking

### 💻 Modern UI
- Fast single-page application (SPA)
- Real-time updates (polls every 5 seconds)
- Clean, professional interface
- Mobile-responsive design (TailwindCSS)

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Authentication**: JWT with bcrypt
- **Browser Automation**: Playwright
- **Web Scraping**: Cheerio, xml2js, Axios

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS 3
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## 📦 Project Structure

```
QA-Automation/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── config/       # App configuration & constants
│   │   ├── middleware/   # Auth, error handling
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Core business logic
│   │   │   ├── testRunner.ts      # Main orchestrator
│   │   │   ├── pageCrawler.ts     # URL discovery
│   │   │   ├── visualAnalyzer.ts  # Layout checks
│   │   │   ├── formTester.ts      # Form automation
│   │   │   └── issueCreator.ts    # Issue generation
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Logging, helpers
│   │   └── index.ts      # App entry point
│   ├── uploads/          # Screenshots storage
│   └── package.json
│
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React Context (Auth)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   └── package.json
│
├── database/
│   └── schema.sql        # PostgreSQL schema
│
├── SETUP.md              # Detailed setup guide
├── DEVELOPMENT.md        # Developer documentation
├── setup.ps1             # Automated setup script
└── start.ps1             # Quick start script
```

## 🚀 Quick Start

### Option 1: Automated Setup (Windows PowerShell)

```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation
.\setup.ps1
```

This script will:
- ✅ Check prerequisites (Node.js, PostgreSQL)
- ✅ Create database and run schema
- ✅ Install all dependencies
- ✅ Configure environment variables
- ✅ Install Playwright browsers
- ✅ Create necessary directories

### Option 2: Manual Setup

See **[SETUP.md](SETUP.md)** for detailed step-by-step instructions.

### Starting the Application

```powershell
# Option A: Use the start script (opens 2 terminals automatically)
.\start.ps1

# Option B: Manual start (2 separate terminals)
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open browser to: **http://localhost:5173**

### Default Login
- **Email**: admin@example.com
- **Password**: Admin123!

**⚠️ Important**: Change this password after first login!

## 📖 Usage Guide

### 1. Create a Project
- Log in as QA Lead
- Click "New Project"
- Enter project name and client name

### 2. Add a Site
- Open your project
- Click "New Site"
- Enter site name, base URL, and environment

### 3. Run a Test
- Open the site details
- Click "Run Test"
- Monitor progress (status updates every 5 seconds)
- View results when completed

### 4. Review Issues
- Navigate to "Issues" in the header
- Filter by status, type, or severity
- Click an issue to see details and screenshot
- Update status and add comments

### 5. Developer Workflow
- Developers log in and filter issues: Status = "Open (For Dev)"
- Fix the bug on the actual website
- Update issue status to "Ready for QA"
- Add a comment describing the fix

### 6. QA Re-verification
- Filter issues: Status = "Ready for QA"
- Run a new test on the site
- Check if the issue is fixed
- Update status to "Resolved" or back to "Open (For Dev)"

## 🔧 Configuration

### Environment Variables

Backend (`.env`):
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/qa_automation
JWT_SECRET=your-secret-key-here
MAX_CRAWL_DEPTH=2
MAX_PAGES_PER_RUN=30
VIEWPORT_WIDTH=1440
VIEWPORT_HEIGHT=900
PAGE_TIMEOUT=30000
```

### Customization

Edit `backend/src/config/constants.ts`:
- Adjust crawl limits
- Modify excluded URL patterns
- Change form test data
- Update timeout values

## 📊 API Endpoints

Full API documentation available at http://localhost:3000/health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | User login | - |
| GET | `/api/projects` | List projects | Required |
| POST | `/api/projects` | Create project | QA Lead |
| GET | `/api/sites` | List sites | Required |
| POST | `/api/sites` | Create site | QA Lead |
| POST | `/api/runs` | Start test run | QA/QA Lead |
| GET | `/api/runs/:id` | Run details | Required |
| GET | `/api/issues` | List issues | Required |
| PATCH | `/api/issues/:id` | Update issue | Required |

See **[DEVELOPMENT.md](DEVELOPMENT.md)** for complete API documentation.

## 🏗️ Architecture

### Test Run Flow

```
User triggers test
    ↓
Create run record (Pending)
    ↓
TestRunner.executeRun() starts asynchronously
    ↓
Launch Playwright browser (1440×900)
    ↓
PageCrawler discovers URLs
    ├─ Fetch sitemap.xml
    └─ Crawl internal links (max depth 2)
    ↓
For each page (max 30):
    ├─ Navigate & wait for networkidle
    ├─ Capture full-page screenshot
    ├─ Get DOM snapshot
    ├─ VisualAnalyzer checks layout
    ├─ FormTester finds & tests forms
    └─ IssueCreator generates issues
    ↓
Update run status (Completed/Failed)
    ↓
Frontend shows results
```

## 🔒 Security

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT authentication with expiration
- ✅ Role-based access control on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React escaping)
- ✅ CORS configured
- ✅ Environment variable secrets

## 📈 Performance

- Database connection pooling
- Indexed queries for fast filtering
- Optimistic UI updates
- Efficient DOM querying with Playwright
- Limited crawl depth to prevent runaway tests

## 🐛 Troubleshooting

Common issues and solutions:

**Database connection failed**
```powershell
# Check PostgreSQL is running
pg_isready

# Verify connection string in backend/.env
```

**Port already in use**
- Change PORT in `backend/.env` (default: 3000)
- Change port in `frontend/vite.config.ts` (default: 5173)

**Playwright browser errors**
```powershell
cd backend
npx playwright install --with-deps chromium
```

**Module not found**
```powershell
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

See **[SETUP.md](SETUP.md)** for more troubleshooting tips.

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup instructions
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Developer guide and architecture
- **[database/schema.sql](database/schema.sql)** - Database schema with comments

## 🗺️ Roadmap

### Future Enhancements (Post-MVP1)
- 📱 Mobile & tablet viewports
- 🎨 Figma integration for design comparison
- 🤖 AI-powered issue analysis
- 📊 Advanced reporting (PDF exports)
- 📅 Scheduled test runs
- 🔄 CI/CD pipeline integration
- 📧 Email notifications
- 🎯 Visual regression testing
- 🗺️ Visual coverage maps
- ⏱️ Time tracking

## 👥 User Roles

| Role | Permissions |
|------|------------|
| **QA Lead** | Full access: Create projects/sites, run tests, manage issues |
| **QA Engineer** | Run tests, create/update issues, comment |
| **Developer** | View issues, update status to "Ready for QA", comment |

## 🤝 Contributing

This is a proprietary MVP. For internal development:
1. Create a feature branch
2. Test thoroughly
3. Submit for code review
4. Update documentation

## 📝 License

Proprietary - All Rights Reserved

## 🆘 Support

For questions or issues:
1. Check documentation (SETUP.md, DEVELOPMENT.md)
2. Review logs in `backend/logs/`
3. Check browser console for frontend errors
4. Contact the development team

---

**Built with ❤️ for efficient QA automation**
