param(
  [Parameter(Mandatory = $true)]
  [string]$Message,

  [string]$BotToken,
  [string]$ChatId,

  [ValidateSet("INFO", "NEED_HELP", "DONE")]
  [string]$Level = "INFO",

  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

function Get-CandidateConfigPaths {
  param([string]$ScriptRoot)

  $paths = @()
  if (Test-Path $env:OPENCLAW_CONFIG_PATH) {
    $paths += $env:OPENCLAW_CONFIG_PATH
  }

  if (-not [string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $abs = Resolve-Path -Path $ProjectRoot -ErrorAction SilentlyContinue
    if ($abs) {
      $workspace = Split-Path -Parent $abs.Path
      $latest = Get-ChildItem -Path $workspace -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "openclaw-chain-backup-*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
      if ($latest) {
        $paths += (Join-Path $latest.FullName "openclaw\state\openclaw.raw.json")
      }
    }
  }

  $fallback = "D:\apps\workspace\openclaw-chain-backup-20260330-005548\openclaw\state\openclaw.raw.json"
  $paths += $fallback
  return $paths | Select-Object -Unique
}

function Resolve-TelegramConfig {
  param([string]$ScriptRoot)

  $resolvedToken = $BotToken
  $resolvedChat = $ChatId

  if ($resolvedToken -and $resolvedChat) {
    return @{
      BotToken = $resolvedToken
      ChatId = $resolvedChat
      Source = "arguments"
    }
  }

  $paths = Get-CandidateConfigPaths -ScriptRoot $ScriptRoot
  foreach ($cfg in $paths) {
    if (!(Test-Path $cfg)) { continue }

    try {
      $raw = Get-Content $cfg -Raw
      $json = $raw | ConvertFrom-Json

      $token = $resolvedToken
      if (-not $token -and $json.channels -and $json.channels.telegram) {
        $token = $json.channels.telegram.botToken
      }

      $chat = $resolvedChat
      if (-not $chat -and $json.channels -and $json.channels.telegram) {
        $tg = $json.channels.telegram
        $allow = @()
        if ($tg.allowFrom) { $allow += $tg.allowFrom }
        if ($tg.groupAllowFrom) { $allow += $tg.groupAllowFrom }

        $chat = $allow | Where-Object { "$_" -match "^\d+$" } | Select-Object -First 1
        if (-not $chat -and "$($tg.defaultTo)" -match "^\d+$") {
          $chat = "$($tg.defaultTo)"
        }
      }

      if ($token -and $chat) {
        return @{
          BotToken = "$token"
          ChatId = "$chat"
          Source = $cfg
        }
      }
    } catch {
      continue
    }
  }

  throw "Cannot resolve Telegram bot token/chat id from arguments or openclaw config."
}

function Get-Prefix {
  switch ($Level) {
    "NEED_HELP" { return "[需要协助]" }
    "DONE" { return "[完成通知]" }
    default { return "[状态通知]" }
  }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfg = Resolve-TelegramConfig -ScriptRoot $scriptRoot

$prefix = Get-Prefix
$time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$text = "$prefix`n$Message`n时间: $time"

$uri = "https://api.telegram.org/bot$($cfg.BotToken)/sendMessage"
$body = @{
  chat_id = $cfg.ChatId
  text = $text
  disable_web_page_preview = "true"
}

Invoke-RestMethod -Uri $uri -Method Post -Body $body | Out-Null
Write-Host ("Sent Telegram message to chat {0} (source: {1})" -f $cfg.ChatId, $cfg.Source)
