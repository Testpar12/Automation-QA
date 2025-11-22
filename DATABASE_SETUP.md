# Quick Database Setup Guide

## Problem
The backend cannot connect to PostgreSQL because the database is not installed or not running.

## Solution Options

### Option 1: Install PostgreSQL (Recommended for Development)

#### Step 1: Download PostgreSQL
1. Visit: https://www.postgresql.org/download/windows/
2. Download the Windows installer (version 14 or higher)
3. Run the installer

#### Step 2: During Installation
- **Password**: Set postgres user password (remember this!)
- **Port**: Keep default 5432
- **Locale**: Keep default

#### Step 3: Create Database
After installation, open PowerShell and run:

```powershell
# Connect to PostgreSQL (will prompt for password)
psql -U postgres

# In psql prompt, run:
CREATE DATABASE qa_automation;
\q
```

#### Step 4: Run Database Schema
```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation
psql -U postgres -d qa_automation -f database/schema.sql
```

#### Step 5: Update .env File
Edit `backend/.env` and update the password in DATABASE_URL:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/qa_automation
```

#### Step 6: Restart Backend
```powershell
cd backend
npm run dev
```

---

### Option 2: Use Docker (Easier, No Installation)

If you have Docker Desktop installed:

#### Step 1: Start PostgreSQL Container
```powershell
docker run --name qa-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=qa_automation `
  -p 5432:5432 `
  -d postgres:14
```

#### Step 2: Run Database Schema
```powershell
cd C:\Users\Windows\Documents\Workspace\QA-Automation
Get-Content database/schema.sql | docker exec -i qa-postgres psql -U postgres -d qa_automation
```

#### Step 3: Backend is Already Configured
The `.env` file is already set up for this (password: postgres)

#### Step 4: Restart Backend
```powershell
cd backend
npm run dev
```

---

### Option 3: Quick Docker Install (If Docker Not Installed)

#### Install Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop/
2. Install and restart computer
3. Open Docker Desktop (wait for it to start)
4. Follow "Option 2" steps above

---

## Verify Database Connection

After setup, test the connection:

```powershell
# If using local PostgreSQL:
psql -U postgres -d qa_automation -c "SELECT COUNT(*) FROM users;"

# If using Docker:
docker exec qa-postgres psql -U postgres -d qa_automation -c "SELECT COUNT(*) FROM users;"
```

You should see the admin user count: `1`

---

## Restart the Application

Once database is running:

```powershell
# Kill any running backend (Ctrl+C)

# Start backend
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

---

## Default Login Credentials

After database setup:
- **Email**: admin@example.com
- **Password**: Admin123!

---

## Troubleshooting

### "ECONNREFUSED" Error Still Appears
- Check PostgreSQL is running: `Get-Service postgresql-x64-*` (local install)
- Check Docker container: `docker ps` (Docker install)
- Verify port 5432 is not blocked by firewall
- Check DATABASE_URL in `backend/.env` matches your setup

### "Password authentication failed"
- Update DATABASE_URL in `backend/.env` with correct password
- For Docker: password is `postgres`
- For local install: password you set during installation

### Database exists but tables missing
Run the schema again:
```powershell
psql -U postgres -d qa_automation -f database/schema.sql
# OR for Docker:
Get-Content database/schema.sql | docker exec -i qa-postgres psql -U postgres -d qa_automation
```

---

**Need Help?** Check the logs in `backend/logs/error.log`
