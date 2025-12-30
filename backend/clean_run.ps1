Write-Host "=== Aggressive Cleanup & Run ==="

# 1. Kill potentially locked processes
Write-Host "[-] Killing stale cargo/rustc processes..."
Get-Process | Where-Object { $_.ProcessName -eq 'cargo' -or $_.ProcessName -eq 'rustc' } | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Force remove target directory
if (Test-Path "target") {
    Write-Host "[-] Deleting target directory..."
    try {
        Remove-Item -Recurse -Force "target" -ErrorAction Stop
    } catch {
        Write-Warning "Could not delete 'target'. A file is fully locked by the OS. Please RESTART VS CODE."
        exit 1
    }
}

# 3. Configure environment to minimize locking
$env:CARGO_INCREMENTAL="0"
$env:RUST_BACKTRACE="1"

# 4. Run
Write-Host "[+] Starting Cargo Run..."
cargo run
