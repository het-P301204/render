# RENDER Test Runner
$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "  RENDER — Running Test Suite" -ForegroundColor Cyan
Write-Host ""

Set-Location $rootDir
python -m pytest tests/ -v --tb=short 2>&1

Write-Host ""
