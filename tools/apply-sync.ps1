$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$targetRoot = [IO.Path]::GetFullPath('G:\QueYe').TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $targetRoot 'traditional.html'))) { throw 'Expected game folder not found' }
$manifestPath = Join-Path $sourceRoot 'release\update-v6-manifest.json'
$entries = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
function FileHashOrNull($path) { if (Test-Path -LiteralPath $path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }; return $null }
foreach ($entry in $entries) {
    $source = [IO.Path]::GetFullPath((Join-Path $sourceRoot $entry.Path))
    $target = [IO.Path]::GetFullPath((Join-Path $targetRoot $entry.Path))
    if (-not $source.StartsWith($sourceRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
        -not $target.StartsWith($targetRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Path escaped project root' }
    if ((FileHashOrNull $source) -ne $entry.After) { throw "Source changed: $($entry.Path)" }
    if ((FileHashOrNull $target) -ne $entry.Before) { throw "Game changed: $($entry.Path)" }
}
$backupPath = Join-Path $sourceRoot 'release\QueYe-before-v6.zip'
if (Test-Path -LiteralPath $backupPath) { throw 'Backup exists; inspect previous sync before repeating' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::Open($backupPath, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $entries) {
        if ($entry.Before) { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $targetRoot $entry.Path), $entry.Path) > $null }
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $manifestPath, 'update-v6-manifest.json') > $null
} finally { $archive.Dispose() }
foreach ($entry in $entries) {
    $target = Join-Path $targetRoot $entry.Path
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) > $null
    Copy-Item -LiteralPath (Join-Path $sourceRoot $entry.Path) -Destination $target -Force
    if ((FileHashOrNull $target) -ne $entry.After) { throw "Post-copy verification failed: $($entry.Path)" }
}
@{files=$entries.Count;verified=$true;backup=$backupPath;target=$targetRoot} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $sourceRoot 'release\sync-v6-report.json') -Encoding UTF8
Write-Output "Synced and hash-verified $($entries.Count) files; old game files are backed up."
