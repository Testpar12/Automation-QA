# Setup Guide - QA Automation Platform MVP1

## Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14 or higher ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

## Initial Setup

### 1. Database Setup

First, create the PostgreSQL database:

```powershell
# Connect to PostgreSQL (adjust credentials as needed)
psql -U postgres

# Create database
CREATE DATABASE qa_automation;

# Exit psql
\q
```

Then, run the schema:

```powershell
# Navigate to project root
cd C:\Users\Windows\Documents\Workspace\QA-Automation

# Import schema
psql -U postgres -d qa_automation -f database/schema.sql
```

This will create all tables and insert a default admin user:
- **Email**: admin@example.com
- **Password**: Admin123!

### 2. Backend Setup

```powershell
# Navigate to backend
cd backend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Create .env file from example
Copy-Item .env.example .env

# Edit .env with your database credentials
notepad .env
```

**Important**: Update the `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/qa_automation
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

Create required directories:

```powershell
New-Item -ItemType Directory -Force -Path uploads/screenshots
New-Item -ItemType Directory -Force -Path logs
```

### 3. Frontend Setup

```powershell
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

## Running the Application

You'll need **two terminal windows**:

### Terminal 1 - Backend Server

```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation\backend
npm run dev
```

The backend API will start on: http://localhost:3000

### Terminal 2 - Frontend Dev Server

```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation\frontend
npm run dev
```

The frontend will start on: http://localhost:5173

## First Login

1. Open your browser to http://localhost:5173
2. You'll be redirected to the login page
3. Use these credentials:
   - **Email**: admin@example.com
   - **Password**: Admin123!

## Quick Test

After logging in:

1. Click "New Project" and create a test project
2. Click the project and add a new site with a URL (e.g., https://example.com)
3. Click "Run Test" on the site
4. Wait for the test to complete (monitor backend terminal for progress)
5. View the generated issues

## Troubleshooting

### Database Connection Errors

If you see database connection errors:
- Verify PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL in backend/.env
- Ensure the database exists: `psql -U postgres -l`

### Port Already in Use

If ports 3000 or 5173 are in use:
- Backend: Change PORT in backend/.env
- Frontend: Change port in frontend/vite.config.ts

### Playwright/Browser Issues

If browser automation fails:
```powershell
cd backend
npx playwright install --with-deps chromium
```

### Missing Dependencies

If you get "module not found" errors:
```powershell
# In backend or frontend directory
rm -rf node_modules
rm package-lock.json
npm install
```

## Production Build

For production deployment:

### Build Frontend
```powershell
cd frontend
npm run build
# Output in frontend/dist
```

### Build Backend
```powershell
cd backend
npm run build
# Output in backend/dist
```

### Run Production
```powershell
cd backend
npm start
```

Serve frontend/dist with a web server (nginx, Apache, or Express static).

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 3000 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | Required |
| JWT_SECRET | Secret for JWT tokens | Required |
| JWT_EXPIRES_IN | Token expiration | 7d |
| MAX_CRAWL_DEPTH | Max crawl depth | 2 |
| MAX_PAGES_PER_RUN | Max pages per run | 30 |
| VIEWPORT_WIDTH | Screenshot width | 1440 |
| VIEWPORT_HEIGHT | Screenshot height | 900 |

## Next Steps

- Change the default admin password
- Create additional users (QA, developers)
- Set up your first real project
- Configure excluded URL patterns in backend/src/config/constants.ts

## Support

For issues or questions:
1. Check the backend logs in `backend/logs/`
2. Check browser console for frontend errors
3. Review the API at http://localhost:3000/health
