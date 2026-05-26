$path = 'c:\Users\DELL\Desktop\BUGRA\ArcRise\arcrise.html'
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Helper: byte-pattern matching via constructed UTF-8 strings.
# Each emoji's corrupt form is its UTF-8 bytes mis-decoded as Windows-1252
# then re-encoded as UTF-8. We rebuild that string from known bytes.
function FromBytes([byte[]]$b) {
  $win1252 = [System.Text.Encoding]::GetEncoding(1252)
  $latin = $win1252.GetString($b)
  return $latin
}

# Map of corrupted-string => replacement
$map = @{}

# Booster info icons (JS object) — replace whole lines
$rxMagnetLine = "(?m)^\s*magnet:\s*\{[^}]*\},?\s*$"
$rxGhostLine  = "(?m)^\s*ghost:\s*\{[^}]*\},?\s*$"
$rxSpeedLine  = "(?m)^\s*speed:\s*\{[^}]*\},?\s*$"
$rxX2Line     = "(?m)^\s*x2:\s*\{[^}]*\},?\s*$"
$rxX3Line     = "(?m)^\s*x3:\s*\{[^}]*\},?\s*$"
$rxX4Line     = "(?m)^\s*x4:\s*\{[^}]*\},?\s*$"

$text = [Regex]::Replace($text, $rxMagnetLine, "    magnet:  { icon: 'target',  name: 'X-MAGNET',    dur: 8,  color: '#ffcc44' },")
$text = [Regex]::Replace($text, $rxGhostLine,  "    ghost:   { icon: 'ghost',   name: 'GHOST',        dur: 6,  color: '#aa88ff' },")
$text = [Regex]::Replace($text, $rxSpeedLine,  "    speed:   { icon: 'bolt',    name: 'SPEED BOOST', dur: 6,  color: '#ffee44' },")
$text = [Regex]::Replace($text, $rxX2Line,     "    x2:      { icon: 'x2',      name: 'SCORE x2',    dur: 8,  color: '#ff88ff', textIcon: true },")
$text = [Regex]::Replace($text, $rxX3Line,     "    x3:      { icon: 'x3',      name: 'SCORE x3',    dur: 8,  color: '#ff55ff', textIcon: true },")
$text = [Regex]::Replace($text, $rxX4Line,     "    x4:      { icon: 'x4',      name: 'SCORE x4',    dur: 8,  color: '#ff00ff', textIcon: true },")

# PASSIVE_TILES — replace whole array entries
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'radius',[^}]+\},?\s*$",         "    { key: 'radius',         title: 'Radius',       icon: 'ring' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'speed',\s+title:\s*'Speed'[^}]+\},?\s*$", "    { key: 'speed',          title: 'Speed',        icon: 'bolt' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'timer',[^}]+\},?\s*$",          "    { key: 'timer',          title: 'Combo Timer',  icon: 'timer' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'traceThickness',[^}]+\},?\s*$", "    { key: 'traceThickness', title: 'Trace Width',  icon: 'wave' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'traceColor',[^}]+\},?\s*$",     "    { key: 'traceColor',     title: 'Trace Color',  icon: 'palette' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'deathName',[^}]+\},?\s*$",      "    { key: 'deathName',      title: 'Death Name',   icon: 'headstone' },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*key:\s*'deathAvatar',[^}]+\},?\s*$",    "    { key: 'deathAvatar',    title: 'Death Avatar', icon: 'bust' },")

# trace color indicator
$text = [Regex]::Replace($text, "return upg\.traceColor \? '[^']+' : 'default';", "return upg.traceColor ? iconHTML('dot', { size: 12 }) : 'default';")

# upg-coin spans — coin price labels (multiple variants)
$text = [Regex]::Replace($text, "<span class=`"upg-coin`">[^<]*\$\{(\w+)\}</span>", '<span class="upg-coin">${iconHTML(''coin'', { size: 14 })}${$1}</span>')

# trace-color price line
$text = [Regex]::Replace($text, "<div class=`"upg-card-active`" style=`"[^`"]+`">[^<]*\$\{TRACE_COLOR_PRICE\} per change</div>",
  '<div class="upg-card-active" style="flex:1;text-align:center">${iconHTML(''coin'', { size: 14 })}${TRACE_COLOR_PRICE} per change</div>')

# upload photo button
$text = [Regex]::Replace($text, "up\.textContent = '[^']*UPLOAD PHOTO';", "up.innerHTML = iconHTML('camera', { size: 16 }) + '&nbsp; UPLOAD PHOTO';")

# Badges list — each entry
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'first-1k',[^}]+\},?\s*$",     "    { id: 'first-1k',   icon: 'medal',  name: 'FIRST 1K'   },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'combo-9',[^}]+\},?\s*$",      "    { id: 'combo-9',    icon: 'fire',   name: 'COMBO 9'    },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'extreme-1',[^}]+\},?\s*$",    "    { id: 'extreme-1',  icon: 'bolt',   name: 'EXTREME'    },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'gold-100',[^}]+\},?\s*$",     "    { id: 'gold-100',   icon: 'coin',   name: '100 GOLD'   },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'streak-5',[^}]+\},?\s*$",     "    { id: 'streak-5',   icon: 'target', name: 'STREAK 5'   },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'speedrun',[^}]+\},?\s*$",     "    { id: 'speedrun',   icon: 'runner', name: 'SPEEDRUN'   },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'collector',[^}]+\},?\s*$",    "    { id: 'collector',  icon: 'gem',    name: 'COLLECTOR'  },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'night-owl',[^}]+\},?\s*$",    "    { id: 'night-owl',  icon: 'owl',    name: 'NIGHT OWL'  },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'distance-100',[^}]+\},?\s*$", "    { id: 'distance-100', icon: 'ruler',  name: '100 M'      },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'distance-500',[^}]+\},?\s*$", "    { id: 'distance-500', icon: 'rocket', name: '500 M'      },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'boss',[^}]+\},?\s*$",         "    { id: 'boss',       icon: 'crown',  name: 'BOSS'       },")
$text = [Regex]::Replace($text, "(?m)^\s*\{\s*id:\s*'survivor',[^}]+\},?\s*$",     "    { id: 'survivor',   icon: 'shield', name: 'SURVIVOR'   },")

# Particle glyph arrays — replace whole lines
$text = [Regex]::Replace($text, "(?m)^(\s*)const ICE_GLYPHS\s*=.*$",    "`$1const ICE_GLYPHS    = ['snowflake', 'sparkle'];")
$text = [Regex]::Replace($text, "(?m)^(\s*)const FLAME_GLYPHS\s*=.*$",  "`$1const FLAME_GLYPHS  = ['fire', 'sparkle'];")
$text = [Regex]::Replace($text, "(?m)^(\s*)const FLOWER_GLYPHS\s*=.*$", "`$1const FLOWER_GLYPHS = ['flower'];")

# Particle textContent assignments — replace with innerHTML + iconHTML
$text = $text -replace "el\.textContent = ICE_GLYPHS\[Math\.floor\(Math\.random\(\) \* ICE_GLYPHS\.length\)\];",
  "el.innerHTML = iconHTML(ICE_GLYPHS[Math.floor(Math.random() * ICE_GLYPHS.length)], { size: 16 });"
$text = $text -replace "el\.textContent = FLAME_GLYPHS\[Math\.floor\(Math\.random\(\) \* FLAME_GLYPHS\.length\)\];",
  "el.innerHTML = iconHTML(FLAME_GLYPHS[Math.floor(Math.random() * FLAME_GLYPHS.length)], { size: 16 });"
$text = $text -replace "el\.textContent = FLOWER_GLYPHS\[Math\.floor\(Math\.random\(\) \* FLOWER_GLYPHS\.length\)\];",
  "el.innerHTML = iconHTML(FLOWER_GLYPHS[Math.floor(Math.random() * FLOWER_GLYPHS.length)], { size: 16 });"

# ex-req-check dynamic content (?,?)
$text = [Regex]::Replace($text, "rowDist\.querySelector\('\.ex-req-check'\)\.textContent = distOk \? '[^']+' : '[^']+';",
  "rowDist.querySelector('.ex-req-check').innerHTML  = iconHTML(distOk ? 'check' : 'cross', { size: 14, color: distOk ? '#66ff88' : '#ff5566' });")
$text = [Regex]::Replace($text, "rowScore\.querySelector\('\.ex-req-check'\)\.textContent = scoreOk \? '[^']+' : '[^']+';",
  "rowScore.querySelector('.ex-req-check').innerHTML = iconHTML(scoreOk ? 'check' : 'cross', { size: 14, color: scoreOk ? '#66ff88' : '#ff5566' });")
# coin row check (similar pattern likely)
$text = [Regex]::Replace($text, "rowCoin\.querySelector\('\.ex-req-check'\)\.textContent = (\w+) \? '[^']+' : '[^']+';",
  "rowCoin.querySelector('.ex-req-check').innerHTML  = iconHTML(`$1 ? 'check' : 'cross', { size: 14, color: `$1 ? '#66ff88' : '#ff5566' });")

# BOOSTER_ICON.textContent = info.icon  →  innerHTML branching on textIcon
$text = $text -replace "BOOSTER_ICON\.textContent = info\.icon;",
  "if (info.textIcon) { BOOSTER_ICON.textContent = info.icon; } else { BOOSTER_ICON.innerHTML = iconHTML(info.icon, { size: 22 }); }"

[System.IO.File]::WriteAllBytes($path, [System.Text.Encoding]::UTF8.GetBytes($text))
Write-Host "Done"
