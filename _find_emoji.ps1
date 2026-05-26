$lines = Get-Content 'c:\Users\DELL\Desktop\BUGRA\ArcRise\arcrise.html'
$n = 0
$results = @()
foreach ($line in $lines) {
  $n++
  $hasEmoji = $false
  foreach ($ch in $line.ToCharArray()) {
    $code = [int]$ch
    if ($code -ge 0x2600 -and $code -le 0x27BF) { $hasEmoji = $true; break }
    if ($code -ge 0xD800 -and $code -le 0xDBFF) { $hasEmoji = $true; break }
    if ($code -ge 0x2300 -and $code -le 0x23FF) { $hasEmoji = $true; break }
  }
  if ($hasEmoji) { $results += "${n}: $($line.Trim())" }
}
$results | Select-Object -First 200
