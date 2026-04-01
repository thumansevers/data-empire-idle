param(
  [string]$BotToken,
  [string]$ChatId,
  [string]$ZipPath = ".\release\data-empire-idle.zip",
  [switch]$AutoPack
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = Join-Path $root $ZipPath

function Resolve-TelegramConfig {
  param([string]$CurrentRoot)

  if ($BotToken -and $ChatId) {
    return @{ BotToken = $BotToken; ChatId = $ChatId }
  }

  $workspace = Split-Path -Parent $CurrentRoot
  $cfgPath = $null

  if ($env:OPENCLAW_CONFIG_PATH -and (Test-Path $env:OPENCLAW_CONFIG_PATH)) {
    $cfgPath = $env:OPENCLAW_CONFIG_PATH
  } else {
    $latest = Get-ChildItem -Path $workspace -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "openclaw-chain-backup-*" } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($latest) {
      $candidate = Join-Path $latest.FullName "openclaw\state\openclaw.raw.json"
      if (Test-Path $candidate) {
        $cfgPath = $candidate
      }
    }
  }

  if (-not $cfgPath) {
    throw "Cannot resolve Telegram config. Pass -BotToken and -ChatId, or set OPENCLAW_CONFIG_PATH."
  }

  $json = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $token = if ($BotToken) { $BotToken } else { $json.channels.telegram.botToken }
  $chat = $ChatId

  if (-not $chat) {
    $allow = @()
    if ($json.channels.telegram.allowFrom) { $allow += $json.channels.telegram.allowFrom }
    if ($json.channels.telegram.groupAllowFrom) { $allow += $json.channels.telegram.groupAllowFrom }
    $chat = $allow | Where-Object { "$_" -match "^\d+$" } | Select-Object -First 1
  }

  if (-not $chat -and "$($json.channels.telegram.defaultTo)" -match "^\d+$") {
    $chat = "$($json.channels.telegram.defaultTo)"
  }

  if (-not $token -or -not $chat) {
    throw "Telegram config incomplete (token/chat id missing)."
  }

  return @{ BotToken = "$token"; ChatId = "$chat" }
}

if ($AutoPack -or !(Test-Path $zip)) {
  & (Join-Path $root "pack.ps1")
}

if (!(Test-Path $zip)) {
  throw "Zip not found: $zip"
}

$tg = Resolve-TelegramConfig -CurrentRoot $root
$uri = "https://api.telegram.org/bot$($tg.BotToken)/sendDocument"
$form = @{
  chat_id = $tg.ChatId
  caption = "data-empire-idle pc build"
  document = Get-Item $zip
}

Invoke-RestMethod -Uri $uri -Method Post -Form $form | Out-Null
Write-Host "Sent: $zip"
