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
  param([string]$CurrentProjectRoot)

  $paths = @()

  if (-not [string]::IsNullOrWhiteSpace($env:OPENCLAW_CONFIG_PATH) -and (Test-Path $env:OPENCLAW_CONFIG_PATH)) {
    $paths += $env:OPENCLAW_CONFIG_PATH
  }

  if (-not [string]::IsNullOrWhiteSpace($CurrentProjectRoot)) {
    $abs = Resolve-Path -Path $CurrentProjectRoot -ErrorAction SilentlyContinue
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
  param([string]$CurrentProjectRoot)

  if ($BotToken -and $ChatId) {
    return @{ BotToken = $BotToken; ChatId = $ChatId; Source = "arguments" }
  }

  $paths = Get-CandidateConfigPaths -CurrentProjectRoot $CurrentProjectRoot
  foreach ($cfg in $paths) {
    if (!(Test-Path $cfg)) { continue }

    try {
      $json = Get-Content $cfg -Raw | ConvertFrom-Json

      $token = if ($BotToken) { $BotToken } else { $json.channels.telegram.botToken }
      $chat = $ChatId

      if (-not $chat -and $json.channels -and $json.channels.telegram) {
        $tg = $json.channels.telegram
        $allow = @()
        if ($tg.allowFrom) { $allow += $tg.allowFrom }
        if ($tg.groupAllowFrom) { $allow += $tg.groupAllowFrom }

        $chat = $allow | Where-Object { "$_" -match "^\d+$" } | Select-Object -Last 1
        if (-not $chat -and "$($tg.defaultTo)" -match "^\d+$") {
          $chat = "$($tg.defaultTo)"
        }
      }

      if (-not $chat -and $token) {
        try {
          $updates = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates" -Method Get
          if ($updates.ok -and $updates.result.Count -gt 0) {
            $latest = $updates.result | Sort-Object update_id -Descending | Select-Object -First 1
            if ($latest.message -and $latest.message.chat -and "$($latest.message.chat.id)" -match "^-?\d+$") {
              $chat = "$($latest.message.chat.id)"
            } elseif ($latest.channel_post -and $latest.channel_post.chat -and "$($latest.channel_post.chat.id)" -match "^-?\d+$") {
              $chat = "$($latest.channel_post.chat.id)"
            }
          }
        } catch {}
      }

      if ($token -and $chat) {
        return @{ BotToken = "$token"; ChatId = "$chat"; Source = $cfg }
      }
    } catch {
      continue
    }
  }

  throw "Cannot resolve Telegram bot token/chat id from arguments or openclaw config."
}

function Get-Prefix {
  switch ($Level) {
    "NEED_HELP" { return "[Need Help]" }
    "DONE" { return "[Done]" }
    default { return "[Info]" }
  }
}

$cfg = Resolve-TelegramConfig -CurrentProjectRoot $ProjectRoot
$prefix = Get-Prefix
$time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$text = "$prefix`n$Message`nTime: $time"

$uri = "https://api.telegram.org/bot$($cfg.BotToken)/sendMessage"
$body = @{
  chat_id = $cfg.ChatId
  text = $text
  disable_web_page_preview = "true"
}

Invoke-RestMethod -Uri $uri -Method Post -Body $body | Out-Null
Write-Host ("Sent Telegram message to chat {0} (source: {1})" -f $cfg.ChatId, $cfg.Source)
