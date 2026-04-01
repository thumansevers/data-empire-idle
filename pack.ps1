param(
  [string]$OutputDir = ".\release",
  [string]$ZipName = "data-empire-idle.zip"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root $OutputDir
if (!(Test-Path $out)) {
  New-Item -Path $out -ItemType Directory | Out-Null
}

$zipPath = Join-Path $out $ZipName
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$include = @(
  "index.html",
  "styles.css",
  "game.js",
  "README.md",
  "run.bat",
  "send_to_telegram.ps1"
)

$files = @()
foreach ($name in $include) {
  $p = Join-Path $root $name
  if (Test-Path $p) {
    $files += $p
  }
}

if ($files.Count -eq 0) {
  throw "No files found to pack."
}

Compress-Archive -Path $files -DestinationPath $zipPath -Force
Write-Host "Created: $zipPath"
