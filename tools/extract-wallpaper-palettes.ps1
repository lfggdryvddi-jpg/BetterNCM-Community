param(
    [Parameter(Mandatory = $true)]
    [string]$Root,
    [int]$MaxItems = 120,
    [int]$MaxProjects = 240
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing

$imageExtensions = @(".png", ".jpg", ".jpeg", ".webp", ".bmp")
$rootPath = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')
$manifestPath = Join-Path (Split-Path -Parent (Split-Path -Parent $rootPath)) "appworkshop_431960.acf"
$projectPaths = New-Object System.Collections.Generic.List[string]

if ($rootPath -match "[\\/]workshop[\\/]content[\\/]431960$") {
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Steam Workshop 清单不存在：$manifestPath"
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
    $ids = [regex]::Matches($manifest, '(?m)^\s*"(\d{8,})"\s*$') | ForEach-Object { $_.Groups[1].Value } | Select-Object -First $MaxProjects
    foreach ($id in $ids) {
        $candidate = Join-Path $rootPath $id
        if (Test-Path -LiteralPath $candidate -PathType Container) { [void]$projectPaths.Add($candidate) }
    }
} else {
    [void]$projectPaths.Add($rootPath)
}

function Get-Luminance([int]$r, [int]$g, [int]$b) {
    $convert = { param([int]$c) $v = $c / 255.0; if ($v -le 0.03928) { return $v / 12.92 }; return [math]::Pow(($v + 0.055) / 1.055, 2.4) }
    return 0.2126 * (&$convert $r) + 0.7152 * (&$convert $g) + 0.0722 * (&$convert $b)
}

function To-Hex([int]$r, [int]$g, [int]$b) {
    return ("#{0:x2}{1:x2}{2:x2}" -f [math]::Max(0, [math]::Min(255, $r)), [math]::Max(0, [math]::Min(255, $g)), [math]::Max(0, [math]::Min(255, $b)))
}

function Mix([string]$first, [string]$second, [double]$amount) {
    $a = [Convert]::ToInt32($first.Substring(1), 16)
    $b = [Convert]::ToInt32($second.Substring(1), 16)
    $ar = ($a -shr 16) -band 255; $ag = ($a -shr 8) -band 255; $ab = $a -band 255
    $br = ($b -shr 16) -band 255; $bg = ($b -shr 8) -band 255; $bb = $b -band 255
    return To-Hex ([math]::Round($ar + ($br - $ar) * $amount)) ([math]::Round($ag + ($bg - $ag) * $amount)) ([math]::Round($ab + ($bb - $ab) * $amount))
}

function Get-Palette([string]$Path) {
    $image = $null; $bitmap = $null; $graphics = $null
    try {
        $image = [System.Drawing.Image]::FromFile($Path)
        $bitmap = New-Object System.Drawing.Bitmap -ArgumentList 48, 48
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($image, 0, 0, 48, 48)
        $buckets = @{}
        for ($y = 0; $y -lt 48; $y++) {
            for ($x = 0; $x -lt 48; $x++) {
                $color = $bitmap.GetPixel($x, $y)
                if ($color.A -lt 90) { continue }
                $r = [math]::Round($color.R / 32) * 32; $g = [math]::Round($color.G / 32) * 32; $b = [math]::Round($color.B / 32) * 32
                $key = "$r,$g,$b"
                if (-not $buckets.ContainsKey($key)) { $buckets[$key] = @{ r = 0.0; g = 0.0; b = 0.0; weight = 0.0 } }
                $item = $buckets[$key]; $alpha = $color.A / 255.0
                $item.r += $color.R * $alpha; $item.g += $color.G * $alpha; $item.b += $color.B * $alpha; $item.weight += $alpha
            }
        }
        $colors = @($buckets.Values | Sort-Object weight -Descending | Select-Object -First 8 | ForEach-Object {
            To-Hex ([math]::Round($_.r / $_.weight)) ([math]::Round($_.g / $_.weight)) ([math]::Round($_.b / $_.weight))
        })
        if ($colors.Count -eq 0) { return $null }
        $background = $colors | Where-Object {
            $n = [Convert]::ToInt32($_.Substring(1), 16); (Get-Luminance (($n -shr 16) -band 255) (($n -shr 8) -band 255) ($n -band 255)) -lt 0.28
        } | Select-Object -First 1
        if (-not $background) { $background = Mix $colors[0] "#000000" 0.38 }
        $accent = $colors | Where-Object {
            $n = [Convert]::ToInt32($_.Substring(1), 16); $r = ($n -shr 16) -band 255; $g = ($n -shr 8) -band 255; $b = $n -band 255
            ([math]::Max($r, [math]::Max($g, $b)) - [math]::Min($r, [math]::Min($g, $b))) -gt 55 -and (Get-Luminance $r $g $b) -gt 0.12
        } | Select-Object -First 1
        if (-not $accent) { $accent = if ($colors.Count -gt 1) { $colors[1] } else { "#f43f5e" } }
        $bgNum = [Convert]::ToInt32($background.Substring(1), 16); $bgLum = Get-Luminance (($bgNum -shr 16) -band 255) (($bgNum -shr 8) -band 255) ($bgNum -band 255)
        [ordered]@{
            background = $background.ToLowerInvariant()
            sidebar = (Mix $background "#000000" 0.16)
            surface = (Mix $background "#ffffff" $(if ($bgLum -lt 0.32) { 0.12 } else { 0.08 }))
            surfaceElevated = (Mix $background "#ffffff" 0.20)
            text = $(if ($bgLum -lt 0.32) { "#f8fafc" } else { "#20202a" })
            muted = $(if ($bgLum -lt 0.32) { "#cbd5e1" } else { "#5b6170" })
            accent = $accent.ToLowerInvariant()
            danger = "#fb7185"
            success = "#34d399"
        }
    } catch {
        [Console]::Error.WriteLine(("palette skipped: {0} :: {1}" -f $Path, $_.Exception.Message))
        return $null
    } finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($image) { $image.Dispose() }
    }
}

$files = New-Object System.Collections.Generic.List[object]
foreach ($project in $projectPaths) {
    if ($files.Count -ge $MaxItems) { break }
    try {
        $wallpaperTitle = Split-Path -Leaf $project
        $wallpaperTags = @()
        $wallpaperType = "unknown"
        $wallpaperMediaPath = ""
        try {
            $metadata = Get-Content -LiteralPath (Join-Path $project "project.json") -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($metadata.title) { $wallpaperTitle = [string]$metadata.title }
            if ($metadata.tags) { $wallpaperTags = @($metadata.tags | ForEach-Object { [string]$_ }) }
            if ($metadata.type) { $wallpaperType = ([string]$metadata.type).ToLowerInvariant() }
            if ($metadata.file) { $wallpaperMediaPath = Join-Path $project ([string]$metadata.file) }
        } catch { }
        # One representative image per Workshop project gives much more theme variety than
        # walking every texture inside a single scene project.
        $allImages = @(Get-ChildItem -LiteralPath $project -File -Recurse -ErrorAction SilentlyContinue | Where-Object { $imageExtensions -contains $_.Extension.ToLowerInvariant() })
        if (-not $allImages.Count) { continue }
        $file = $allImages | Sort-Object `
            @{ Expression = { if ($_.BaseName -match '^(preview|cover|thumbnail|thumb|poster)$') { 0 } else { 1 } } }, `
            @{ Expression = { if ($_.DirectoryName -eq $project) { 0 } else { 1 } } }, `
            @{ Expression = { -$_.Length } } | Select-Object -First 1
        $palette = Get-Palette $file.FullName
        if ($palette) {
            [void]$files.Add([ordered]@{
                path = $file.FullName
                name = $file.Name
                extension = $file.Extension.ToLowerInvariant()
                projectId = (Split-Path -Leaf $project)
                    title = $wallpaperTitle
                    tags = $wallpaperTags
                    mediaType = $wallpaperType
                    contentPath = $wallpaperMediaPath
                palette = $palette
            })
        }
    } catch { continue }
}

if ($files.Count -eq 0) { "[]" } else { ConvertTo-Json -InputObject ([object[]]$files.ToArray()) -Depth 6 -Compress }
