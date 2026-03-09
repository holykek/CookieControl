# Package CookieControl for Chrome Web Store
# Run from project root: .\scripts\pack-for-store.ps1
# Output: CookieControl-0.2.3.zip in project root

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version
$outZip = Join-Path $root "CookieControl-$version.zip"

# Remove previous zip if present
if (Test-Path $outZip) { Remove-Item $outZip -Force }

# Directories and files to include (match manifest + assets)
$include = @(
    "manifest.json",
    "CookieControl.png",
    "privacy.html",
    "background",
    "config",
    "content",
    "engine",
    "lib",
    "storage",
    "ui",
    "utils"
)

Push-Location $root
try {
    $tempDir = Join-Path $env:TEMP "CookieControl-pack"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null

    foreach ($item in $include) {
        $path = Join-Path $root $item
        if (Test-Path $path) {
            if (Test-Path $path -PathType Container) {
                Copy-Item -Path $path -Destination $tempDir -Recurse -Force
            } else {
                Copy-Item -Path $path -Destination $tempDir -Force
            }
        }
    }

    # Fallback: if CookieControl.png missing, copy from ui/icons if present
    $mainIcon = Join-Path $tempDir "CookieControl.png"
    if (-not (Test-Path $mainIcon)) {
        $icon48 = Join-Path $root "ui\icons\icon48.png"
        if (Test-Path $icon48) {
            Copy-Item $icon48 $mainIcon -Force
        }
    }

    Compress-Archive -Path "$tempDir\*" -DestinationPath $outZip -Force
    Remove-Item $tempDir -Recurse -Force
    Write-Host "Created: $outZip"
} finally {
    Pop-Location
}
