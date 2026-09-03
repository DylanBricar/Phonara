[CmdletBinding(DefaultParameterSetName = "Bundles")]
param(
  [Parameter(Mandatory = $true, ParameterSetName = "Bundles")]
  [string]$BundleBase,

  [Parameter(Mandatory = $true, ParameterSetName = "PackageRoot")]
  [string]$PackageRoot,

  [Parameter(Mandatory = $true)]
  [string]$StagingDir,

  [Parameter(Mandatory = $true)]
  [string]$Target,

  [switch]$DynamicOrt,

  [Parameter(ParameterSetName = "PackageRoot")]
  [switch]$SkipLaunch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stagedDlls = @(Get-ChildItem -LiteralPath $StagingDir -Filter "*.dll" -File -ErrorAction SilentlyContinue)
if ($stagedDlls.Count -eq 0) {
  throw "$StagingDir contains no DLLs; every Windows build must stage the app-local VC++ runtime (issue #1527)"
}

$requiredStaged = @("msvcp140.dll", "vcruntime140.dll")
if ($Target -notlike "aarch64*") {
  $requiredStaged += @("vcomp140.dll", "ggml-vulkan.dll")
  if (-not ($stagedDlls | Where-Object { $_.Name -like "*transcribe*" })) {
    throw "Staging is missing transcribe runtime DLLs"
  }
  if (-not ($stagedDlls | Where-Object { $_.Name -like "*ggml*" })) {
    throw "Staging is missing ggml runtime DLLs"
  }
  if ($DynamicOrt) {
    $requiredStaged += "onnxruntime.dll"
  }
}

foreach ($name in $requiredStaged) {
  if (-not ($stagedDlls | Where-Object { $_.Name -ieq $name })) {
    throw "Staging is missing $name"
  }
}

function Assert-PackageContents {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string]$Label,

    [switch]$DoNotLaunch
  )

  $app = Get-ChildItem -LiteralPath $Root -Filter "phonara.exe" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $app) {
    throw "$Label package is missing phonara.exe"
  }

  foreach ($dll in $stagedDlls) {
    if (-not (Get-ChildItem -LiteralPath $Root -Filter $dll.Name -Recurse -File -ErrorAction SilentlyContinue)) {
      throw "$Label package is missing staged runtime DLL $($dll.Name)"
    }
  }

  if ($DoNotLaunch) {
    return
  }

  $deviceOutput = (& $app.FullName --list-devices | Out-String)
  $deviceOutput | Write-Host
  if ($LASTEXITCODE -ne 0) {
    throw "$Label phonara.exe --list-devices failed"
  }
  if ($Target -like "aarch64*" -and $deviceOutput -match "kind=(vulkan|cuda|metal|gpu)") {
    throw "$Label Windows ARM64 package unexpectedly exposed a GPU compute device"
  }
  if ($Target -like "aarch64*" -and $deviceOutput -notmatch "kind=cpu") {
    throw "$Label Windows ARM64 package did not expose its required CPU compute device"
  }
}

if ($PSCmdlet.ParameterSetName -eq "PackageRoot") {
  Assert-PackageContents -Root $PackageRoot -Label "Extracted" -DoNotLaunch:$SkipLaunch
  Write-Host "Windows package content audit passed"
  exit 0
}

$nsisPackages = @(Get-ChildItem -LiteralPath (Join-Path $BundleBase "nsis") -Filter "*.exe" -File -ErrorAction SilentlyContinue)
if ($nsisPackages.Count -eq 0) {
  throw "No NSIS packages found under $BundleBase for runtime DLL audit"
}

foreach ($package in $nsisPackages) {
  Write-Host "Auditing NSIS package: $($package.FullName)"
  $installDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $installDir | Out-Null
  try {
    $process = Start-Process -FilePath $package.FullName -ArgumentList @("/S", "/PORTABLE", "/D=$installDir") -Wait -PassThru
    if ($process.ExitCode -ne 0) {
      throw "Silent portable install failed for $($package.FullName) with exit code $($process.ExitCode)"
    }
    Assert-PackageContents -Root $installDir -Label "Installed NSIS"
  }
  finally {
    Remove-Item -LiteralPath $installDir -Recurse -Force
  }
}

$msiPackages = @(Get-ChildItem -LiteralPath (Join-Path $BundleBase "msi") -Filter "*.msi" -File -ErrorAction SilentlyContinue)
if ($msiPackages.Count -eq 0) {
  throw "No MSI packages found under $BundleBase for runtime DLL audit"
}

foreach ($package in $msiPackages) {
  Write-Host "Auditing MSI package: $($package.FullName)"
  $installDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $installDir | Out-Null
  $logFile = Join-Path $installDir "msi-admin-install.log"
  try {
    $msiArguments = "/a `"$($package.FullName)`" /qn /L*v `"$logFile`" TARGETDIR=`"$installDir`""
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArguments -Wait -PassThru
    if ($process.ExitCode -ne 0) {
      if (Test-Path -LiteralPath $logFile) {
        Get-Content -LiteralPath $logFile | Out-Host
      }
      throw "Administrative install failed for $($package.FullName) with exit code $($process.ExitCode)"
    }
    Assert-PackageContents -Root $installDir -Label "Installed MSI"
  }
  finally {
    Remove-Item -LiteralPath $installDir -Recurse -Force
  }
}

Write-Host "Windows package runtime audit passed"
