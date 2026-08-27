param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ToolDir = $PSScriptRoot
$LogFile = Join-Path $ToolDir 'CLEANUP_LOG.txt'
$ErrorFile = Join-Path $ToolDir 'CLEANUP_ERROR.txt'
$SuccessFile = Join-Path $ToolDir 'CLEANUP_SUCCESS.txt'
Remove-Item $ErrorFile, $SuccessFile -Force -ErrorAction SilentlyContinue

function Log([string]$Message) {
    $Message | Tee-Object -FilePath $LogFile -Append
}

try {
    $ProjectRoot = (Resolve-Path $ProjectRoot).Path
    if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
        throw 'package.json was not found in the project root.'
    }
    if (-not (Test-Path (Join-Path $ProjectRoot 'src'))) {
        throw 'src folder was not found. Cleanup stopped for safety.'
    }

    "Firouzeh cleanup - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" |
        Set-Content $LogFile -Encoding UTF8
    Log "Project: $ProjectRoot"

    # Create a clean source backup outside the project.
    $Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $BackupDir = Join-Path (Split-Path $ProjectRoot -Parent) "Firouzeh_Final_Source_Backup_$Timestamp"
    $BackupZip = "$BackupDir.zip"
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

    $KeepNames = @(
        '.github', '.vscode', 'public', 'scripts', 'src',
        '.dockerignore', '.env.example', '.gitattributes', '.gitignore',
        'Caddyfile', 'compose.yaml', 'Dockerfile', 'index.html',
        'package.json', 'package-lock.json', 'README.md',
        'tsconfig.app.json', 'tsconfig.json', 'tsconfig.node.json',
        'vite.config.ts'
    )

    Log '[1/5] Creating a clean source backup...'
    foreach ($Name in $KeepNames) {
        $Source = Join-Path $ProjectRoot $Name
        if (Test-Path $Source) {
            Copy-Item $Source (Join-Path $BackupDir $Name) -Recurse -Force
        }
    }

    Compress-Archive -Path (Join-Path $BackupDir '*') -DestinationPath $BackupZip -Force
    Remove-Item $BackupDir -Recurse -Force
    if (-not (Test-Path $BackupZip)) {
        throw 'The source backup ZIP was not created.'
    }
    Log "[OK] Backup: $BackupZip"

    Log '[2/5] Removing obsolete update folders...'
    $DeleteFolders = @(
        'Firouzeh_Final_Update_v0.9.1',
        'Firouzeh_Kasse_Update_v0.5.0',
        'Firouzeh_Kasse_Update_v0.6.0',
        'Firouzeh_Source_Sync_v2_FIXED',
        'Firouzeh_Update_v0.7.0',
        'Firouzeh_Update_v0.8.0',
        'Firouzeh_Update_v0.9.0',
        '.update-backups',
        'dist'
    )
    foreach ($Name in $DeleteFolders) {
        $Target = Join-Path $ProjectRoot $Name
        if (Test-Path $Target) {
            Remove-Item $Target -Recurse -Force
            Log "[REMOVED] $Name"
        }
    }

    Log '[3/5] Removing obsolete generated files...'
    $DeleteFiles = @('PROJECT_FILES.txt')
    foreach ($Name in $DeleteFiles) {
        $Target = Join-Path $ProjectRoot $Name
        if (Test-Path $Target) {
            Remove-Item $Target -Force
            Log "[REMOVED] $Name"
        }
    }

    Log '[4/5] Updating .gitignore...'
    $GitIgnore = Join-Path $ProjectRoot '.gitignore'
    $Lines = if (Test-Path $GitIgnore) {
        [System.Collections.Generic.List[string]](Get-Content $GitIgnore)
    } else {
        [System.Collections.Generic.List[string]]::new()
    }
    $Required = @(
        '',
        '# Generated and local-only files',
        'node_modules/',
        'dist/',
        '.update-backups/',
        'Firouzeh_*Update*/',
        'Firouzeh_Source_Sync*/',
        'Firouzeh_Project_Cleanup*/',
        'PROJECT_FILES.txt',
        '*.zip',
        '.env',
        '.env.*',
        '!.env.example'
    )
    foreach ($Line in $Required) {
        if (-not $Lines.Contains($Line)) { $Lines.Add($Line) }
    }
    $Lines | Set-Content $GitIgnore -Encoding UTF8

    Log '[5/5] Synchronizing the cleanup with GitHub...'
    $Git = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($Git) {
        & $Git.Source -C $ProjectRoot add -A
        if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }

        & $Git.Source -C $ProjectRoot diff --cached --quiet
        $HasChanges = $LASTEXITCODE -ne 0
        if ($HasChanges) {
            & $Git.Source -C $ProjectRoot commit -m 'chore: clean obsolete update packages'
            if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }
        } else {
            Log '[OK] No new Git commit was required.'
        }

        & $Git.Source -C $ProjectRoot push origin HEAD:main
        if ($LASTEXITCODE -ne 0) {
            Log '[WARNING] Local cleanup succeeded, but GitHub push needs authentication.'
        } else {
            Log '[OK] Cleanup was pushed to GitHub.'
        }
    } else {
        Log '[WARNING] Git was not found. Local cleanup is complete.'
    }

    @"
SUCCESS
Project: $ProjectRoot
Backup: $BackupZip
Source, node_modules and Docker deployment files were preserved.
"@ | Set-Content $SuccessFile -Encoding UTF8

    Log '[SUCCESS] Cleanup completed safely.'
    exit 0
}
catch {
    @"
CLEANUP FAILED
$($_.Exception.Message)

No source file was intentionally modified except .gitignore after the backup step.
Log: $LogFile
"@ | Set-Content $ErrorFile -Encoding UTF8
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
