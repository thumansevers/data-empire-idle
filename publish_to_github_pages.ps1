param(
  [string]$RepoName = "data-empire-idle",
  [string]$RepoDescription = "Data Empire Idle - PC + mobile web idle economy game",
  [string]$Owner = "",
  [switch]$Notify = $true
)

$ErrorActionPreference = "Stop"

function Get-GitHubCredential {
  $envToken = $env:GITHUB_TOKEN
  if (-not $envToken) { $envToken = $env:GH_TOKEN }
  $envUser = $env:GITHUB_USERNAME

  if ($envToken) {
    if (-not $envUser) {
      try {
        $headers = @{
          Authorization = "Bearer $envToken"
          Accept = "application/vnd.github+json"
          "X-GitHub-Api-Version" = "2022-11-28"
          "User-Agent" = "data-empire-idle-publisher"
        }
        $me = Invoke-RestMethod -Method Get -Uri "https://api.github.com/user" -Headers $headers
        if ($me -and $me.login) {
          $envUser = "$($me.login)"
        }
      } catch {
      }
    }

    if (-not $envUser) {
      $envUser = git config --global --get user.name 2>$null
    }
    if (-not $envUser) {
      $envUser = git config --local --get user.name 2>$null
    }
    if (-not $envUser) {
      throw "GITHUB_TOKEN/GH_TOKEN is set but cannot resolve GitHub username. Set GITHUB_USERNAME too."
    }

    return @{ Username = "$envUser"; Token = "$envToken" }
  }

  $inputText = "protocol=https`nhost=github.com`n`n"
  $out = $inputText | git credential fill
  if (-not $out) {
    throw "No GitHub credential found (checked env GITHUB_TOKEN/GH_TOKEN and git credential fill)."
  }

  $username = ""
  $token = ""
  foreach ($line in $out) {
    if ($line -like "username=*") { $username = $line.Substring(9) }
    if ($line -like "password=*") { $token = $line.Substring(9) }
  }

  if (-not $username -or -not $token) {
    throw "GitHub credential missing username or token."
  }

  return @{ Username = $username; Token = $token }
}

function Invoke-GitHubApi {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [object]$Body = $null
  )

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }

  $json = $Body | ConvertTo-Json -Depth 12
  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $json -ContentType "application/json"
}

function Ensure-Repo {
  param(
    [string]$OwnerName,
    [string]$Name,
    [string]$Description,
    [hashtable]$Headers
  )

  $repoUri = "https://api.github.com/repos/$OwnerName/$Name"
  try {
    $repo = Invoke-GitHubApi -Method "GET" -Uri $repoUri -Headers $Headers
    return $repo
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) {
      throw
    }
  }

  $createUri = "https://api.github.com/user/repos"
  $body = @{
    name = $Name
    description = $Description
    private = $false
    auto_init = $false
  }

  return Invoke-GitHubApi -Method "POST" -Uri $createUri -Headers $Headers -Body $body
}

function Ensure-Pages {
  param(
    [string]$OwnerName,
    [string]$Name,
    [hashtable]$Headers
  )

  $pagesUri = "https://api.github.com/repos/$OwnerName/$Name/pages"
  $body = @{
    source = @{
      branch = "main"
      path = "/"
    }
    build_type = "legacy"
  }

  try {
    Invoke-GitHubApi -Method "GET" -Uri $pagesUri -Headers $Headers | Out-Null
    Invoke-GitHubApi -Method "PUT" -Uri $pagesUri -Headers $Headers -Body $body | Out-Null
    return
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
      Invoke-GitHubApi -Method "POST" -Uri $pagesUri -Headers $Headers -Body $body | Out-Null
      return
    }
    throw
  }
}

function Ensure-LocalRepoFiles {
  param([string]$Root)

  $gitIgnorePath = Join-Path $Root ".gitignore"
  if (!(Test-Path $gitIgnorePath)) {
    @"
release/
*.log
"@ | Set-Content -Path $gitIgnorePath -Encoding ASCII
  }

  $noJekyll = Join-Path $Root ".nojekyll"
  if (!(Test-Path $noJekyll)) {
    "" | Set-Content -Path $noJekyll -Encoding ASCII
  }
}

function Ensure-GitIdentity {
  param(
    [string]$OwnerName
  )

  $name = git config --local --get user.name 2>$null
  $email = git config --local --get user.email 2>$null

  if (-not $name) {
    git config --local user.name $OwnerName
  }
  if (-not $email) {
    git config --local user.email "$OwnerName@users.noreply.github.com"
  }
}

function Notify {
  param(
    [string]$Level,
    [string]$Text,
    [string]$Root
  )

  if (-not $Notify) { return }
  $scriptPath = Join-Path $Root "notify_telegram.ps1"
  if (!(Test-Path $scriptPath)) { return }
  try {
    & $scriptPath -Message $Text -Level $Level -ProjectRoot $Root | Out-Null
  } catch {
    Write-Warning "Telegram notify failed: $($_.Exception.Message)"
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root
try {
  $cred = Get-GitHubCredential
  if (-not $Owner) { $Owner = $cred.Username }

  $headers = @{
    Authorization = "Bearer $($cred.Token)"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "data-empire-idle-publisher"
  }

  $repo = Ensure-Repo -OwnerName $Owner -Name $RepoName -Description $RepoDescription -Headers $headers
  Ensure-LocalRepoFiles -Root $root

  if (!(Test-Path (Join-Path $root ".git"))) {
    git init -b main | Out-Null
  }
  Ensure-GitIdentity -OwnerName $Owner

  $remoteUrl = "https://github.com/$Owner/$RepoName.git"
  $hasOrigin = $false
  try {
    $existing = git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0 -and $existing) { $hasOrigin = $true }
  } catch {}

  if ($hasOrigin) {
    git remote set-url origin $remoteUrl
  } else {
    git remote add origin $remoteUrl
  }

  git add .
  git commit -m "feat: rebalance economy, add telegram notify, publish pages" 2>$null

  git push -u origin main
  Ensure-Pages -OwnerName $Owner -Name $RepoName -Headers $headers

  $url = "https://$Owner.github.io/$RepoName/"
  Write-Host "GitHub Pages URL: $url"
  Notify -Level "DONE" -Text "数据帝国已发布到 GitHub Pages: $url" -Root $root
} catch {
  $msg = $_.Exception.Message
  Write-Error $msg
  Notify -Level "NEED_HELP" -Text "发布 GitHub Pages 遇到问题: $msg" -Root $root
  exit 1
} finally {
  Pop-Location
}
