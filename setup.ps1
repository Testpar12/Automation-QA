# Quick Start Script
# Run this script to set up the project initially

Write-Host "=== QA Automation Platform - Setup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version
    Write-Host "✓ PostgreSQL installed: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ PostgreSQL not found. Please install from https://www.postgresql.org/download/" -ForegroundColor Red
    exit 1
}

# Database setup
Write-Host ""
Write-Host "=== Database Setup ===" -ForegroundColor Cyan
$dbPassword = Read-Host "Enter PostgreSQL password for user 'postgres'" -AsSecureString
$dbPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Set PGPASSWORD environment variable for this session
$env:PGPASSWORD = $dbPasswordText

Write-Host "Creating database..." -ForegroundColor Yellow
try {
    psql -U postgres -c "CREATE DATABASE qa_automation;" 2>$null
    Write-Host "✓ Database created" -ForegroundColor Green
} catch {
    Write-Host "Database may already exist, continuing..." -ForegroundColor Yellow
}

Write-Host "Running schema..." -ForegroundColor Yellow
psql -U postgres -d qa_automation -f database/schema.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Schema imported" -ForegroundColor Green
} else {
    Write-Host "✗ Schema import failed" -ForegroundColor Red
    exit 1
}

# Backend setup
Write-Host ""
Write-Host "=== Backend Setup ===" -ForegroundColor Cyan
Set-Location backend

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install chromium
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Playwright browsers installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install Playwright browsers" -ForegroundColor Red
}

# Create .env file
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    
    # Update DATABASE_URL with password
    $envContent = Get-Content .env -Raw
    $envContent = $envContent -replace 'postgresql://postgres:password@', "postgresql://postgres:$dbPasswordText@"
    Set-Content .env $envContent
    
    Write-Host "✓ .env file created" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Yellow
}

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path uploads/screenshots | Out-Null
New-Item -ItemType Directory -Force -Path logs | Out-Null
Write-Host "✓ Directories created" -ForegroundColor Green

# Frontend setup
Write-Host ""
Write-Host "=== Frontend Setup ===" -ForegroundColor Cyan
Set-Location ../frontend

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# Done
Set-Location ..
Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Default admin credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@example.com"
Write-Host "  Password: Admin123!"
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host "  1. Open two terminal windows"
Write-Host "  2. Terminal 1: cd backend ; npm run dev"
Write-Host "  3. Terminal 2: cd frontend ; npm run dev"
Write-Host "  4. Open browser to http://localhost:5173"
Write-Host ""
Write-Host "See SETUP.md for more details" -ForegroundColor Yellow
