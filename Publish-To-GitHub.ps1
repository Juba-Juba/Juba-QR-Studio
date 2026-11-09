# First create an EMPTY repository at https://github.com/new?name=Juba-QR-Studio
# Then run this script from the extracted project folder on Windows with Git installed.
param([string]$Owner = 'Juba-Juba')
$ErrorActionPreference = 'Stop'
$repo = "https://github.com/$Owner/Juba-QR-Studio.git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (-not (Test-Path .git)) { git init; if ($LASTEXITCODE) { throw 'git init failed' } }
git checkout -B main
if ($LASTEXITCODE) { throw 'Unable to select main branch' }
git add .
if ($LASTEXITCODE) { throw 'git add failed' }
git commit -m 'Initial Juba QR Studio editor and REST API'
# Existing commit without changes is allowed here.
$remotes = @(git remote)
if ($remotes -contains 'origin') {git remote set-url origin $repo} else {git remote add origin $repo}
git push -u origin main
if ($LASTEXITCODE) { throw 'Push failed. Confirm the repository exists and GitHub authentication is available.' }
Write-Output "Published: https://github.com/$Owner/Juba-QR-Studio"
