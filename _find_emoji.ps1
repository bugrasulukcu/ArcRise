$bytes = [System.IO.File]::ReadAllBytes('c:\Users\DELL\Desktop\BUGRA\ArcRise\arcrise.html')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text -split "`n"
$n = 0
$hits = @()
foreach ($line in $lines) {
  $n++
  $isHit = $false
  foreach ($ch in $line.ToCharArray()) {
    $code = [int]$ch
    if (($code -ge 0xD800 -and $code -le 0xDBFF) -or ($code -ge 0x2600 -and $code -le 0x27BF) -or ($code -ge 0x2300 -and $code -le 0x23FF)) {
      $isHit = $true; break
    }
  }
  if ($isHit) { $hits += ("{0}: {1}" -f $n, $line.Trim()) }
}
$hits | Select-Object -First 300
