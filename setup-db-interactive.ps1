# Interactive Database Setup Script
Write-Host "=== QA Automation Platform - Database Setup ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# Get password securely
Write-Host "Enter your PostgreSQL password (the one you set during installation):" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
$env:PGPASSWORD = $password

Write-Host ""
Write-Host "Step 1: Creating database qa_automation..." -ForegroundColor Yellow

try {
    & $psqlPath -U postgres -c "CREATE DATABASE qa_automation;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Database might already exist (this is OK)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Running schema..." -ForegroundColor Yellow

try {
    Get-Content "database\schema.sql" | & $psqlPath -U postgres -d qa_automation 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema loaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "Some tables might already exist (this is OK)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running schema: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Updating backend configuration..." -ForegroundColor Yellow

$envContent = Get-Content "backend\.env" -Raw
$envContent = $envContent -replace 'DATABASE_URL=postgresql://postgres:[^@]*@', "DATABASE_URL=postgresql://postgres:$password@"
$envContent | Set-Content "backend\.env" -NoNewline

Write-Host "Configuration updated!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Login:" -ForegroundColor Yellow
Write-Host "  Email: admin@example.com"
Write-Host "  Password: Admin123!"
Write-Host ""
Write-Host "Next: Restart backend server and login at http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

# Clear password from environment
$env:PGPASSWORD = $null
