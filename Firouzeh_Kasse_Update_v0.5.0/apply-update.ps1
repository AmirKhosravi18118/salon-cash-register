$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$UpdateDir = $PSScriptRoot
$PayloadDir = Join-Path $UpdateDir 'payload'
$ProjectRoot = $null
$Cursor = Get-Item $UpdateDir

for ($i = 0; $i -lt 4; $i++) {
    if (Test-Path (Join-Path $Cursor.FullName 'package.json')) {
        $ProjectRoot = $Cursor.FullName
        break
    }

    if ($null -eq $Cursor.Parent) { break }
    $Cursor = $Cursor.Parent
}

if (-not $ProjectRoot) {
    throw 'Project root was not found. Extract the update folder inside D:\salon-cash-register.'
}

if (-not (Test-Path $PayloadDir)) {
    throw 'The payload folder is missing. Extract the complete ZIP before running the update.'
}

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupRoot = Join-Path $ProjectRoot ".update-backups\v0.4-before-v0.5-$Timestamp"
$LogFile = Join-Path $UpdateDir 'UPDATE_LOG.txt'
$ErrorFile = Join-Path $UpdateDir 'UPDATE_ERROR.txt'
$SuccessFile = Join-Path $UpdateDir 'UPDATE_SUCCESS.txt'

Remove-Item $ErrorFile -Force -ErrorAction SilentlyContinue
Remove-Item $SuccessFile -Force -ErrorAction SilentlyContinue

function Log([string]$Message) {
    $Message | Tee-Object -FilePath $LogFile -Append
}

function Invoke-Npm([string[]]$Arguments) {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

$PayloadFiles = Get-ChildItem $PayloadDir -Recurse -File
$RelativeTargets = @()

foreach ($File in $PayloadFiles) {
    $Relative = $File.FullName.Substring($PayloadDir.Length).TrimStart('\', '/')
    $RelativeTargets += $Relative
}

if (Test-Path (Join-Path $ProjectRoot 'package-lock.json')) {
    $RelativeTargets += 'package-lock.json'
}

try {
    Set-Location $ProjectRoot

    "============================================================" | Set-Content $LogFile -Encoding UTF8
    Log 'Firouzeh Hair & Beauty - Update v0.5.0-test'
    Log "Project: $ProjectRoot"
    Log "Backup:  $BackupRoot"
    Log '============================================================'

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js was not found.'
    }

    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'npm was not found.'
    }

    $NodeMajor = [int]((& node -p "process.versions.node.split('.')[0]").Trim())
    if ($NodeMajor -lt 24) {
        throw "Node.js 24 or newer is required. Installed major version: $NodeMajor"
    }

    Log '[1/6] Creating a safe backup...'
    foreach ($Relative in ($RelativeTargets | Select-Object -Unique)) {
        $Source = Join-Path $ProjectRoot $Relative
        if (Test-Path $Source) {
            $Backup = Join-Path $BackupRoot $Relative
            New-Item -ItemType Directory -Path (Split-Path $Backup -Parent) -Force | Out-Null
            Copy-Item $Source $Backup -Force
        }
    }

    Log '[2/6] Installing the new source files...'
    foreach ($File in $PayloadFiles) {
        $Relative = $File.FullName.Substring($PayloadDir.Length).TrimStart('\', '/')
        $Destination = Join-Path $ProjectRoot $Relative
        New-Item -ItemType Directory -Path (Split-Path $Destination -Parent) -Force | Out-Null
        Copy-Item $File.FullName $Destination -Force
    }

    $LockFile = Join-Path $ProjectRoot 'package-lock.json'
    if (Test-Path $LockFile) {
        & node (Join-Path $UpdateDir 'patch-lock.mjs') $LockFile
        if ($LASTEXITCODE -ne 0) {
            throw 'Updating package-lock.json failed.'
        }
    }

    Log '[3/6] Checking dependencies...'
    if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules\vite\package.json'))) {
        Invoke-Npm @('install', '--include=optional')
    } else {
        Log '[OK] Existing dependencies can be reused.'
    }

    Log '[4/6] Running TypeScript validation...'
    Invoke-Npm @('run', 'typecheck')

    Log '[5/6] Creating the production build...'
    $Dist = Join-Path $ProjectRoot 'dist'
    if (Test-Path $Dist) {
        Remove-Item $Dist -Recurse -Force
    }
    Invoke-Npm @('run', 'build')

    if (-not (Test-Path (Join-Path $Dist 'index.html'))) {
        throw 'Build finished without creating dist\index.html.'
    }

    Log '[6/6] Update verification completed.'

    @"
SUCCESS
Version: 0.5.0-test
Project: $ProjectRoot
Backup: $BackupRoot
Build: $(Join-Path $Dist 'index.html')
"@ | Set-Content $SuccessFile -Encoding UTF8

    Log '============================================================'
    Log '[SUCCESS] TypeScript validation and production build passed.'
    Log '============================================================'
    exit 0
}
catch {
    $Message = $_.Exception.Message
    Log "[ERROR] $Message"
    Log '[ROLLBACK] Restoring the previous source files...'

    foreach ($Relative in ($RelativeTargets | Select-Object -Unique)) {
        $Current = Join-Path $ProjectRoot $Relative
        if (Test-Path $Current) {
            Remove-Item $Current -Force -ErrorAction SilentlyContinue
        }

        $Backup = Join-Path $BackupRoot $Relative
        if (Test-Path $Backup) {
            New-Item -ItemType Directory -Path (Split-Path $Current -Parent) -Force | Out-Null
            Copy-Item $Backup $Current -Force
        }
    }

    @"
UPDATE FAILED
$Message

Previous source files were restored from:
$BackupRoot

Full log:
$LogFile
"@ | Set-Content $ErrorFile -Encoding UTF8

    Log '[ROLLBACK] Previous files restored.'
    exit 1
}
