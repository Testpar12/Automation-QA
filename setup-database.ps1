# Database Quick Start Script
# This script helps set up PostgreSQL for the QA Automation Platform

Write-Host "=== QA Automation Platform - Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is already running
Write-Host "Checking for existing PostgreSQL installation..." -ForegroundColor Yellow

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "✓ PostgreSQL service found: $($pgService.Name)" -ForegroundColor Green
    Write-Host "  Status: $($pgService.Status)" -ForegroundColor Green
    
    if ($pgService.Status -ne "Running") {
        Write-Host "  Starting PostgreSQL service..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Write-Host "  ✓ PostgreSQL started" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "PostgreSQL is installed and running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Make sure you have created the 'qa_automation' database"
    Write-Host "2. Run the schema: psql -U postgres -d qa_automation -f database/schema.sql"
    Write-Host "3. Update backend/.env with your PostgreSQL password"
    Write-Host "4. Run: npm run dev in the backend folder"
    exit
}

# Check if Docker is available
Write-Host "PostgreSQL not found. Checking for Docker..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerCmd) {
    Write-Host "✓ Docker found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Setting up PostgreSQL with Docker..." -ForegroundColor Cyan
    
    # Check if container already exists
    $existingContainer = docker ps -a --filter "name=qa-postgres" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq "qa-postgres") {
        Write-Host "Container 'qa-postgres' already exists. Starting it..." -ForegroundColor Yellow
        docker start qa-postgres
    } else {
        Write-Host "Creating new PostgreSQL container..." -ForegroundColor Yellow
        docker run --name qa-postgres `
            -e POSTGRES_PASSWORD=postgres `
            -e POSTGRES_DB=qa_automation `
            -p 5432:5432 `
            -d postgres:14
    }
    
    Write-Host "Waiting for PostgreSQL to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "Running database schema..." -ForegroundColor Yellow
    Get-Content database/schema.sql | docker exec -i qa-postgres psql -U postgres -d qa_automation
    
    Write-Host ""
    Write-Host "✓ Database setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database Details:" -ForegroundColor Cyan
    Write-Host "  Host: localhost"
    Write-Host "  Port: 5432"
    Write-Host "  Database: qa_automation"
    Write-Host "  User: postgres"
    Write-Host "  Password: postgres"
    Write-Host ""
    Write-Host "Default Login:" -ForegroundColor Cyan
    Write-Host "  Email: admin@example.com"
    Write-Host "  Password: Admin123!"
    Write-Host ""
    Write-Host "Next: Start the backend with 'npm run dev' in the backend folder" -ForegroundColor Yellow
    exit
}

# Neither PostgreSQL nor Docker found
Write-Host ""
Write-Host "⚠ Neither PostgreSQL nor Docker is installed." -ForegroundColor Red
Write-Host ""
Write-Host "Please choose one of these options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Install PostgreSQL (Traditional)" -ForegroundColor Cyan
Write-Host "  1. Download from: https://www.postgresql.org/download/windows/"
Write-Host "  2. Install with default settings (remember the password!)"
Write-Host "  3. Run this script again"
Write-Host ""
Write-Host "Option 2: Install Docker (Recommended - Easier)" -ForegroundColor Cyan
Write-Host "  1. Download from: https://www.docker.com/products/docker-desktop/"
Write-Host "  2. Install and restart your computer"
Write-Host "  3. Open Docker Desktop and wait for it to start"
Write-Host "  4. Run this script again"
Write-Host ""
Write-Host "Option 3: Install PostgreSQL with winget (Quick)" -ForegroundColor Cyan
Write-Host "  Run: winget install PostgreSQL.PostgreSQL"
Write-Host "  Then run this script again"
Write-Host ""
Write-Host "For detailed instructions, see: DATABASE_SETUP.md" -ForegroundColor Yellow
Write-Host ""
