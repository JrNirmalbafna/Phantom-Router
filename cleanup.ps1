# Cleanup Script for Phantom Router
# This script aggressively cleans up the Rust target directories to save disk space.

Write-Host "Cleaning backend target directory..." -ForegroundColor Cyan
cd backend
cargo clean
cd ..

Write-Host "Cleaning nodes/dummy_backend target directory..." -ForegroundColor Cyan
cd nodes/dummy_backend
cargo clean
cd ../..

Write-Host "Cleanup complete! Your project size is now minimal." -ForegroundColor Green
