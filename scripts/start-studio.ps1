param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $projectRoot '.performance'
$portFile = Join-Path $logs 'studio-port.json'

function Test-Studio([int]$Port) {
    try {
        $status = Invoke-RestMethod "http://127.0.0.1:$Port/api/status" -TimeoutSec 2
        return $status.app -eq 'H3nRy_Studio' -and $status.root -eq $projectRoot
    } catch { return $false }
}
function Test-PortOccupied([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $task = $client.ConnectAsync('127.0.0.1', $Port)
        return $task.Wait(400) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

try {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $node) { throw 'Node.js 20+ is required. Install Node.js, then double-click this launcher again.' }
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $savedPort = 0
    if (Test-Path -LiteralPath $portFile) {
        try { $savedPort = [int](Get-Content -LiteralPath $portFile -Raw | ConvertFrom-Json).port } catch { }
    }
    $ports = @()
    if ($savedPort -ge 1024 -and $savedPort -le 65535) { $ports += $savedPort }
    $ports += 4173..4183
    $ports = @($ports | Select-Object -Unique)
    $readyPort = 0
    $failures = @()
    foreach ($candidate in $ports) {
        if (Test-Studio $candidate) { $readyPort = $candidate; break }
        if (Test-PortOccupied $candidate) { $failures += "Port $candidate is occupied by another service."; continue }
        $previousPort = $env:PORT
        $errorLog = Join-Path $logs "studio-server-$candidate-error.log"
        try {
            $env:PORT = [string]$candidate
            $process = Start-Process -FilePath $node -ArgumentList 'scripts/serve.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "studio-server-$candidate.log") -RedirectStandardError $errorLog
        } finally { $env:PORT = $previousPort }
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            $process.Refresh()
            if ($process.HasExited) { break }
            if (Test-Studio $candidate) { $readyPort = $candidate; break }
            Start-Sleep -Milliseconds 150
        }
        if ($readyPort) { break }
        $detail = if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Raw } else { 'No server error log.' }
        $failures += "Port ${candidate}: $detail"
        $process.Refresh()
        if (-not $process.HasExited) { $process | Stop-Process }
    }
    $failures | Set-Content -LiteralPath (Join-Path $logs 'studio-launch.log')
    if (-not $readyPort) { throw 'No available studio port (4173-4183). See .performance/studio-launch.log.' }
    @{port=$readyPort} | ConvertTo-Json | Set-Content -LiteralPath $portFile
    $studioUrl = "http://127.0.0.1:$readyPort/#/studio"
    if (-not $NoBrowser) { Start-Process $studioUrl }
    Write-Output "Studio ready: $studioUrl"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
