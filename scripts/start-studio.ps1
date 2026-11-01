param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$studioUrl = 'http://127.0.0.1:4173/#/studio'

function Test-Studio {
    try {
        $response = Invoke-WebRequest 'http://127.0.0.1:4173/app.js' -UseBasicParsing -TimeoutSec 2
        return $response.Content.Contains('const EDITOR_ENABLED = true;')
    } catch { return $false }
}

try {
    if (-not (Test-Studio)) {
        $listener = New-Object System.Net.Sockets.TcpClient
        try {
            $connection = $listener.ConnectAsync('127.0.0.1', 4173)
            if ($connection.Wait(500) -and $listener.Connected) {
                throw 'Port 4173 is used by another service. Close it and try again.'
            }
        } catch [System.AggregateException] {
            # Connection refused: the port is free.
        } finally { $listener.Dispose() }
        $node = (Get-Command node -ErrorAction SilentlyContinue).Source
        if (-not $node) { throw 'Node.js 20+ is required. Install Node.js, then double-click this launcher again.' }
        $logs = Join-Path $projectRoot '.performance'
        New-Item -ItemType Directory -Path $logs -Force | Out-Null
        $previousPort = $env:PORT
        try {
            $env:PORT = '4173'
            $process = Start-Process -FilePath $node -ArgumentList 'scripts/serve.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'studio-server.log') -RedirectStandardError (Join-Path $logs 'studio-server-error.log')
        } finally { $env:PORT = $previousPort }
        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-Studio) { $ready = $true; break }
            if ($process.HasExited) { break }
            Start-Sleep -Milliseconds 150
        }
        if (-not $ready) { throw 'Studio could not start. See .performance/studio-server-error.log.' }
    }
    if (-not $NoBrowser) { Start-Process $studioUrl }
    Write-Output "Studio ready: $studioUrl"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
