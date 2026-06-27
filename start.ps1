# Start all services for local development
Write-Host "Starting StudyNotes dev environment..." -ForegroundColor Cyan

# Start Docker services
docker-compose up -d
Write-Host "Docker services started" -ForegroundColor Green

# Wait for Postgres
Write-Host "Waiting for Postgres..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Run migrations if needed
Set-Location backend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

npm run migrate
Write-Host "Migrations done" -ForegroundColor Green

# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
Write-Host "Backend started at http://localhost:4000" -ForegroundColor Green

# Start frontend
Set-Location ../frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting frontend at http://localhost:5173" -ForegroundColor Cyan
npm run dev
