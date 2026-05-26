$file1 = "c:\Users\LAKSHMAN\Downloads\ScanBite\B. Orders.html"
$file2 = "c:\Users\LAKSHMAN\Downloads\ScanBite\E. Analytics (1).html"

function Extract-Text {
    param($path)
    $raw = [System.IO.File]::ReadAllText($path)
    $styleEnd = $raw.LastIndexOf("</style>")
    $html = $raw.Substring($styleEnd + 8)
    $ms = [regex]::Matches($html, '>[^<]{2,}<')
    $texts = @()
    foreach ($m in $ms) {
        $t = $m.Value.TrimStart('>').TrimEnd('<').Trim()
        if ($t.Length -gt 1) { $texts += $t }
    }
    return $texts
}

Write-Host "=== ORDERS TEXT CONTENT ===" -ForegroundColor Cyan
$ordersTexts = Extract-Text $file1
foreach ($t in $ordersTexts | Select-Object -First 200) { Write-Host $t }

Write-Host "`n=== ANALYTICS TEXT CONTENT ===" -ForegroundColor Green
$analyticsTexts = Extract-Text $file2
foreach ($t in $analyticsTexts | Select-Object -First 200) { Write-Host $t }
