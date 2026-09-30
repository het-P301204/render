# RENDER Development Startup Script (PowerShell)
# Starts all components for local development

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  RENDER — Inject. Escape. Understand." -ForegroundColor Cyan
Write-Host "  Starting development environment..." -ForegroundColor Gray
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot

# Function to start a background process
function Start-Lab {
    param($Name, $Command, $Args, $WorkDir, $Color)
    Write-Host "  Starting $Name..." -ForegroundColor $Color -NoNewline
    $proc = Start-Process -FilePath $Command -ArgumentList $Args -WorkingDirectory $WorkDir -PassThru -WindowStyle Hidden
    Write-Host " [PID $($proc.Id)]" -ForegroundColor DarkGray
    return $proc
}

# Store PIDs for cleanup
$pids = @()

# Start Jinja2 labs
$p1 = Start-Lab "Jinja2 Vulnerable (5001)" "python" "vulnerable_app.py" "$rootDir\apps\jinja-lab" "Red"
$pids += $p1.Id
Start-Sleep -Seconds 1

$p2 = Start-Lab "Jinja2 Hardened (5002)" "python" "hardened_app.py" "$rootDir\apps\jinja-lab" "Green"
$pids += $p2.Id
Start-Sleep -Seconds 1

# Start Node labs
$p3 = Start-Lab "Node Vulnerable (3001)" "node" "vulnerable_app.js" "$rootDir\apps\node-lab" "Red"
$pids += $p3.Id
Start-Sleep -Seconds 1

$p4 = Start-Lab "Node Hardened (3002)" "node" "hardened_app.js" "$rootDir\apps\node-lab" "Green"
$pids += $p4.Id
Start-Sleep -Seconds 1

# Start Mako labs
$p5 = Start-Lab "Mako Vulnerable (5003)" "python" "vulnerable_app.py" "$rootDir\apps\mako-lab" "Red"
$pids += $p5.Id
Start-Sleep -Seconds 1

$p6 = Start-Lab "Mako Hardened (5004)" "python" "hardened_app.py" "$rootDir\apps\mako-lab" "Green"
$pids += $p6.Id
Start-Sleep -Seconds 1

# Start API server
$p7 = Start-Lab "API Server (8000)" "python" "-m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload" $rootDir "Cyan"
$pids += $p7.Id
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "  All servers started." -ForegroundColor Green
Write-Host ""
Write-Host "  Labs:      http://127.0.0.1:5001 (Jinja2 vuln)" -ForegroundColor Gray
Write-Host "             http://127.0.0.1:5002 (Jinja2 hard)" -ForegroundColor Gray
Write-Host "             http://127.0.0.1:3001 (Node vuln)" -ForegroundColor Gray
Write-Host "             http://127.0.0.1:5003 (Mako vuln)" -ForegroundColor Gray
Write-Host "  API:       http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  cd frontend && npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop all servers." -ForegroundColor DarkGray
Write-Host ""

# Save PIDs for cleanup
$pids | Out-File "$rootDir\.render-pids" -Encoding utf8

# Wait
try {
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Write-Host "`n  Stopping all servers..." -ForegroundColor Yellow
    foreach ($pid in $pids) {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
    Remove-Item "$rootDir\.render-pids" -ErrorAction SilentlyContinue
    Write-Host "  Done." -ForegroundColor Green
}
