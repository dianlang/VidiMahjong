$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $env:TEMP ("vidimahjong-zh-" + [guid]::NewGuid().ToString("N"))
$Download = Join-Path $Work "upstream.zip"
$Extract = Join-Path $Work "extract"
New-Item -ItemType Directory -Force -Path $Work, $Extract | Out-Null

try {
    $urls = @(
        "https://github.com/VidiPT89/VidiMahjong/archive/e4207acd04887355c012ee2ab9d9456c4cbcb874.zip",
        "https://codeload.github.com/VidiPT89/VidiMahjong/zip/e4207acd04887355c012ee2ab9d9456c4cbcb874"
    )
    $downloaded = $false
    foreach ($url in $urls) {
        try {
            Write-Host "Downloading upstream source: $url" -ForegroundColor Cyan
            Invoke-WebRequest -Uri $url -OutFile $Download -UseBasicParsing -Headers @{ "User-Agent" = "VidiMahjong-ZH-Builder" }
            if ((Get-Item $Download).Length -gt 10000) { $downloaded = $true; break }
        } catch {
            Write-Warning "Download attempt failed: $($_.Exception.Message)"
        }
    }
    # Some Windows PowerShell TLS stacks cannot reach GitHub; Node uses its own TLS stack.
    if (-not $downloaded) {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand) {
            & $nodeCommand.Source (Join-Path $Root 'tools\download-upstream.cjs') $urls[1] $Download
            if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $Download) -and (Get-Item -LiteralPath $Download).Length -gt 10000) {
                $downloaded = $true
            }
        }
    }
    if (-not $downloaded) {
        throw "Unable to download the upstream GitHub ZIP. Check GitHub connectivity and try again."
    }

    Expand-Archive -LiteralPath $Download -DestinationPath $Extract -Force
    $Project = Get-ChildItem -LiteralPath $Extract -Directory | Where-Object { Test-Path (Join-Path $_.FullName "traditional.html") } | Select-Object -First 1
    if (-not $Project) { throw "The downloaded archive did not contain traditional.html." }
    $ProjectPath = $Project.FullName

    $cssDir = Join-Path $ProjectPath "css"
    $jsDir = Join-Path $ProjectPath "js\traditional"
    New-Item -ItemType Directory -Force -Path $cssDir, $jsDir | Out-Null
    Copy-Item (Join-Path $Root "patch\css\zh-custom.css") (Join-Path $cssDir "zh-custom.css") -Force
    Copy-Item (Join-Path $Root "patch\js\traditional\zh-custom.js") (Join-Path $jsDir "zh-custom.js") -Force
    Copy-Item (Join-Path $Root "patch\css\defeat-cg.css") (Join-Path $cssDir "defeat-cg.css") -Force
    Copy-Item (Join-Path $Root "patch\js\traditional\defeat-cg.js") (Join-Path $jsDir "defeat-cg.js") -Force
    Copy-Item (Join-Path $Root "patch\css\table-ui.css") (Join-Path $cssDir "table-ui.css") -Force
    Copy-Item (Join-Path $Root "patch\js\traditional\table-ui.js") (Join-Path $jsDir "table-ui.js") -Force
    Copy-Item (Join-Path $Root "patch\js\traditional\bgm.js") (Join-Path $jsDir "bgm.js") -Force
    foreach ($module in @('characters', 'yaku-catalog', 'table-extras', 'dev-tools', 'ui-sfx', 'match-pause', 'stage-show', 'dora-highlight', 'riichi-rules', 'riichi-ui', 'settlement', 'score-show', 'dev-hand-fixtures', 'voice-events', 'voice-runtime', 'random-character', 'reconnect-client', 'online-resume', 'table-focus', 'asset-entry', 'play-policy', 'play-options')) {
        Copy-Item (Join-Path $Root "patch\js\traditional\$module.js") (Join-Path $jsDir "$module.js") -Force
    }
    foreach ($sheet in @('character-select', 'table-extras', 'stage-show', 'dora-highlight', 'riichi-ui', 'score-show', 'table-focus', 'asset-manager', 'play-options')) {
        Copy-Item (Join-Path $Root "patch\css\$sheet.css") (Join-Path $cssDir "$sheet.css") -Force
    }
    $tilesTarget = Join-Path $ProjectPath "assets\tiles"
    New-Item -ItemType Directory -Force -Path $tilesTarget | Out-Null
    Copy-Item (Join-Path $Root "patch\assets\tiles\*") $tilesTarget -Recurse -Force
    $bgmTarget = Join-Path $ProjectPath "assets\bgm"
    New-Item -ItemType Directory -Force -Path $bgmTarget | Out-Null
    Copy-Item (Join-Path $Root "patch\assets\bgm\*") $bgmTarget -Recurse -Force

    $assetSource = Join-Path $Root "patch\assets\characters"
    $assetTarget = Join-Path $ProjectPath "assets\characters"
    New-Item -ItemType Directory -Force -Path $assetTarget | Out-Null
    Copy-Item (Join-Path $assetSource "*") $assetTarget -Recurse -Force

    $sfxSource = Join-Path $Root "patch\assets\sfx"
    $sfxTarget = Join-Path $ProjectPath "assets\sfx"
    New-Item -ItemType Directory -Force -Path $sfxTarget | Out-Null
    Copy-Item (Join-Path $sfxSource "*") $sfxTarget -Recurse -Force

    $htmlPath = Join-Path $ProjectPath "traditional.html"
    $html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
    $html = [regex]::Replace($html, '<html lang="[^"]*">', '<html lang="zh-CN">', 1)
    $html = [regex]::Replace($html, '<title>.*?</title>', '<title>雀夜 · 四人立直麻将</title>', 1)
    if ($html -notmatch 'css/zh-custom\.css') {
        $html = [regex]::Replace($html, '</head>', "  <link rel=`"stylesheet`" href=`"css/zh-custom.css?v=3`">`r`n</head>", 1)
    }
    if ($html -notmatch 'js/traditional/zh-custom\.js') {
        $html = [regex]::Replace($html, '</body>', "  <script src=`"js/traditional/zh-custom.js?v=5`"></script>`r`n</body>", 1)
    }
    if ($html -notmatch 'css/defeat-cg\.css') {
        $html = [regex]::Replace($html, '</head>', "  <link rel=`"stylesheet`" href=`"css/defeat-cg.css?v=4`">`r`n</head>", 1)
    }
    if ($html -notmatch 'js/traditional/defeat-cg\.js') {
        $html = [regex]::Replace($html, '</body>', "  <script src=`"js/traditional/defeat-cg.js?v=7.3`"></script>`r`n</body>", 1)
    }
    if ($html -notmatch 'css/table-ui\.css') {
        $html = [regex]::Replace($html, '</head>', "  <link rel=`"stylesheet`" href=`"css/table-ui.css?v=6`">`r`n</head>", 1)
    }
    if ($html -notmatch 'js/traditional/table-ui\.js') {
        $html = [regex]::Replace($html, '</body>', "  <script src=`"js/traditional/table-ui.js?v=5.1`"></script>`r`n</body>", 1)
    }
    if ($html -notmatch 'js/traditional/bgm\.js') {
        $html = [regex]::Replace($html, '</body>', "  <script src=`"js/traditional/bgm.js?v=5.1`"></script>`r`n</body>", 1)
    }
    # All additions are synchronous native scripts. Registry precedes every consumer.
    $html = $html.Replace('  <script src="js/traditional/zh-custom.js?v=5"></script>', '  <script src="js/traditional/riichi-rules.js?v=7"></script><script src="js/traditional/settlement.js?v=7"></script><script src="assets/characters/roster.js?v=7.1"></script><script src="js/traditional/characters.js?v=7.3"></script><script src="js/traditional/random-character.js?v=7.3"></script><script src="js/traditional/zh-custom.js?v=7.3"></script><script src="js/traditional/match-pause.js?v=7.2"></script><script src="js/traditional/stage-show.js?v=8"></script>')
    $html = $html.Replace('  <script src="js/traditional/bgm.js?v=5.1"></script>', '  <script src="js/traditional/yaku-catalog.js?v=6"></script><script src="js/traditional/table-extras.js?v=7"></script><script src="js/traditional/dora-highlight.js?v=7"></script><script src="js/traditional/riichi-ui.js?v=7"></script><script src="js/traditional/score-show.js?v=7"></script><script src="js/traditional/dev-hand-fixtures.js?v=7"></script><script src="js/traditional/dev-tools.js?v=7"></script><script src="js/traditional/ui-sfx.js?v=6"></script><script src="js/traditional/bgm.js?v=6"></script><script src="assets/characters/voice-catalog.js?v=7.2"></script><script src="js/traditional/voice-events.js?v=7.2"></script><script src="js/traditional/voice-runtime.js?v=8"></script><script src="js/traditional/reconnect-client.js?v=8"></script><script src="js/traditional/online-resume.js?v=8"></script><script src="js/traditional/table-focus.js?v=8"></script><script src="js/traditional/asset-entry.js?v=8"></script>')
    $html = $html.Replace('</head>', '<link rel="stylesheet" href="css/score-show.css?v=7"><link rel="stylesheet" href="css/riichi-ui.css?v=7"><link rel="stylesheet" href="css/dora-highlight.css?v=7"><link rel="stylesheet" href="css/stage-show.css?v=7.2"><link rel="stylesheet" href="css/character-select.css?v=6"><link rel="stylesheet" href="css/table-extras.css?v=7"></head>')
    $html = $html.Replace('</head>', '<link rel="stylesheet" href="css/table-focus.css?v=8"><link rel="stylesheet" href="css/play-options.css?v=8.1"></head>')
    $html = $html.Replace('</body>', '<script src="js/traditional/play-policy.js?v=8.1"></script><script src="js/traditional/play-options.js?v=8.1"></script><script src="js/traditional/friend-entry.js?v=8.1"></script></body>')
    Set-Content -LiteralPath $htmlPath -Value $html -Encoding UTF8
    Copy-Item (Join-Path $Root "patch\asset-manager.html") (Join-Path $ProjectPath "asset-manager.html") -Force
    Copy-Item (Join-Path $Root "patch\start-asset-manager.bat") (Join-Path $ProjectPath "start-asset-manager.bat") -Force
    Copy-Item (Join-Path $Root "patch\start-friend-test.bat") (Join-Path $ProjectPath "start-friend-test.bat") -Force
    Copy-Item (Join-Path $Root "patch\stop-friend-test.bat") (Join-Path $ProjectPath "stop-friend-test.bat") -Force
    Copy-Item (Join-Path $Root "patch\js\traditional\friend-entry.js") (Join-Path $jsDir "friend-entry.js") -Force
    Copy-Item (Join-Path $Root "patch\js\asset-manager.js") (Join-Path $ProjectPath "js\asset-manager.js") -Force
    $toolsTarget = Join-Path $ProjectPath "tools"
    New-Item -ItemType Directory -Force -Path $toolsTarget | Out-Null
    Copy-Item (Join-Path $Root "patch\tools\*.cjs") $toolsTarget -Force

    Copy-Item (Join-Path $Root "patch\README_CN.md") (Join-Path $ProjectPath "README_CN.md") -Force
    Copy-Item (Join-Path $Root "patch\start-local.bat") (Join-Path $ProjectPath "start-local.bat") -Force
    Copy-Item (Join-Path $Root "patch\start-online-server.bat") (Join-Path $ProjectPath "start-online-server.bat") -Force
    foreach ($document in @('AGENTS.md', 'ARCHITECTURE.md', 'PROGRESS.md', 'CHARACTER_GUIDE.md', 'RELEASE_NOTES_v6.md', 'RELEASE_NOTES_v7.md', 'RELEASE_NOTES_v7.2.md', 'RELEASE_NOTES_v7.3.md', 'RELEASE_NOTES_v8.md', 'RELEASE_NOTES_v8.1.md')) {
        Copy-Item (Join-Path $Root $document) (Join-Path $ProjectPath $document) -Force
    }

    function Replace-RequiredText([string]$FilePath, [string]$OldText, [string]$NewText, [string]$Label) {
        $source = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
        # GitHub archives usually use LF; normalize source and patch snippets before matching.
        $source = $source.Replace("`r`n", "`n")
        $OldText = $OldText.Replace("`r`n", "`n")
        $NewText = $NewText.Replace("`r`n", "`n")
        if (-not $source.Contains($OldText)) {
            if ($source.Contains($NewText)) { return }
            throw "Could not find expected upstream code for patch: $Label ($FilePath)"
        }
        $source = $source.Replace($OldText, $NewText)
        Set-Content -LiteralPath $FilePath -Value $source -Encoding UTF8
    }

    # Send the selected character ID through the existing WebSocket handshake.
    $onlinePath = Join-Path $ProjectPath "js\traditional\online.js"
    Replace-RequiredText $onlinePath "onlineSend({ type: 'create', playerId: onlinePlayerId });" "onlineSend({ type: 'create', playerId: onlinePlayerId, characterId: (localStorage.getItem('vidimahjong-character-id') || 'character-01') });" "online create character ID"
    Replace-RequiredText $onlinePath "onlineSend({ type: 'join', code, playerId: onlinePlayerId });" "onlineSend({ type: 'join', code, playerId: onlinePlayerId, characterId: (localStorage.getItem('vidimahjong-character-id') || 'character-01') });" "online join character ID"

    # Preserve and broadcast selected character IDs so every online client sees the same choices.
    $serverIndexPath = Join-Path $ProjectPath "server\index.js"
    Replace-RequiredText $serverIndexPath "room.addPlayer(ws, msg.playerId, msg.name)" "room.addPlayer(ws, msg.playerId, msg.name, msg.characterId)" "server handshake character ID"
    Replace-RequiredText $serverIndexPath "target.addPlayer(ws, msg.playerId, msg.name)" "target.addPlayer(ws, msg.playerId, msg.name, msg.characterId)" "join handshake character ID"

    $roomPath = Join-Path $ProjectPath "server\room.js"
    Replace-RequiredText $roomPath "addPlayer(ws, playerId, name) {`r`n    this.lastActivityAt = Date.now();" "addPlayer(ws, playerId, name, characterId) {`r`n    this.lastActivityAt = Date.now();`r`n    const normalizedCharacterId = require('../js/traditional/characters.js').has(characterId) ? characterId : null;" "room character ID parameter"
    Replace-RequiredText $roomPath "      this.seats[existing].ws = ws;`r`n      return { seatIndex: existing, reconnected: true };" "      this.seats[existing].ws = ws;`r`n      if (normalizedCharacterId) this.seats[existing].characterId = normalizedCharacterId;`r`n      return { seatIndex: existing, reconnected: true };" "reconnect character ID"
    Replace-RequiredText $roomPath '    this.seats[idx] = { ws, playerId, name: name || `Player ${idx + 1}` };' '    this.seats[idx] = { ws, playerId, name: name || `Player ${idx + 1}`, characterId: normalizedCharacterId };' 'store character ID in seat'
    Replace-RequiredText $roomPath "seats: this.seats.map((s) => (s ? { name: s.name, connected: !!s.ws } : null))," "seats: this.seats.map((s) => (s ? { name: s.name, connected: !!s.ws, characterId: s.characterId || null } : null))," "lobby character ID"
    Replace-RequiredText $roomPath "        name: this.seats[i] ? this.seats[i].name : null," "        name: this.seats[i] ? this.seats[i].name : null,`r`n        characterId: this.seats[i] ? this.seats[i].characterId || null : null," "state character ID"

    # Authoritative server-side cumulative loss and big-win deltas, shared by all clients.
    # The upstream match is a single match per room; fresh rooms start at zero.
    Replace-RequiredText $roomPath "    this.lastActivityAt = Date.now();`r`n  }`r`n`r`n  hasAnyConnection()" "    this.lastActivityAt = Date.now();`r`n    this.cumulativeLosses = [0, 0, 0, 0];`r`n    this.lastScoreSnapshot = null;`r`n    this.scoreRevision = 0;`r`n    this.recentGains = [0, 0, 0, 0];`r`n  }`r`n`r`n  hasAnyConnection()" "initial cumulative-loss state"
    $scoreTracking = @'
  trackCumulativeLosses() {
    if (!this.match || !this.match.engine) return;
    const scores = this.match.engine.seats.map((seat) => seat.points);
    if (!this.lastScoreSnapshot) {
      this.lastScoreSnapshot = scores;
      return;
    }
    let changed = false;
    this.recentGains = scores.map((score, i) => {
      const delta = Number(score) - Number(this.lastScoreSnapshot[i]);
      if (delta !== 0) changed = true;
      if (delta < 0) this.cumulativeLosses[i] += -delta;
      return Math.max(delta, 0);
    });
    if (changed) this.scoreRevision++;
    this.lastScoreSnapshot = scores;
  }
'@
    Replace-RequiredText $roomPath "  onMatchEvent(event) {`r`n    this.lastActivityAt = Date.now();`r`n    this.broadcastState();" ("  onMatchEvent(event) {`n    this.lastActivityAt = Date.now();`n    this.trackCumulativeLosses();`n    this.broadcastState();") "server tracking hook"
    Replace-RequiredText $roomPath "  onMatchEvent(event) {" ($scoreTracking.TrimEnd() + "`n  onMatchEvent(event) {") "cumulative-loss method"
    Replace-RequiredText $roomPath "      points: m.points,`r`n      riichiSticksOnTable:" "      points: m.points,`r`n      cumulativeLosses: this.cumulativeLosses.slice(),`r`n      scoreRevision: this.scoreRevision,`r`n      recentGains: this.recentGains.slice(),`r`n      riichiSticksOnTable:" "broadcast server loss and big-win state"


    # Presentation pause is an extension; do not edit the protected engine files.
    Copy-Item (Join-Path $Root "patch\server\stage-presentation.js") (Join-Path $ProjectPath "server\stage-presentation.js") -Force
    Add-Content -LiteralPath $roomPath -Value "require('./stage-presentation.js').install(Room);" -Encoding UTF8
    Copy-Item (Join-Path $Root "patch\server\riichi-actions.js") (Join-Path $ProjectPath "server\riichi-actions.js") -Force
    Copy-Item (Join-Path $Root "patch\server\shared-engine.js") (Join-Path $ProjectPath "server\shared-engine.js") -Force
    Add-Content -LiteralPath $roomPath -Value "require('./riichi-actions.js').install(Room);" -Encoding UTF8
    Copy-Item (Join-Path $Root "patch\server\voice-events.js") (Join-Path $ProjectPath "server\voice-events.js") -Force
    Add-Content -LiteralPath $roomPath -Value "require('./voice-events.js').install(Room);" -Encoding UTF8
    Copy-Item (Join-Path $Root "patch\server\random-character.js") (Join-Path $ProjectPath "server\random-character.js") -Force
    Add-Content -LiteralPath $roomPath -Value "require('./random-character.js').install(Room);" -Encoding UTF8

    Copy-Item (Join-Path $Root "patch\server\reconnect-view.js") (Join-Path $ProjectPath "server\reconnect-view.js") -Force
    Add-Content -LiteralPath $roomPath -Value "require('./reconnect-view.js').install(Room);" -Encoding UTF8
    Replace-RequiredText $serverIndexPath "    if (!room) {" "    if (msg.type === 'ping' && Number.isSafeInteger(msg.pingId)) { send(ws, { type: 'pong', pingId: msg.pingId }); return; }`r`n`r`n    if (!room) {" "connection heartbeat"
    Replace-RequiredText $serverIndexPath "const PORT = process.env.PORT || 8080;" "const PORT = process.env.PORT || 8080;`r`nconst HOST = process.env.HOST || '0.0.0.0';" "optional bind address"
    Replace-RequiredText $serverIndexPath "new WebSocketServer({ port: PORT });" "new WebSocketServer({ port: PORT, host: HOST });" "bind friend backend locally"
    Copy-Item (Join-Path $Root "patch\server\package-lock.json") (Join-Path $ProjectPath "server\package-lock.json") -Force

    $Output = Join-Path $Root "VidiMahjong-zh-customized.zip"
    if (Test-Path $Output) { Remove-Item $Output -Force }
    Compress-Archive -Path (Join-Path $ProjectPath "*") -DestinationPath $Output -CompressionLevel Optimal
    Write-Host ""
    Write-Host "Build complete: $Output" -ForegroundColor Green
    Write-Host "Unzip it, then read README_CN.md. The original game engine is retained."
} finally {
    if (Test-Path -LiteralPath $Work) {
        $resolvedWork = (Resolve-Path -LiteralPath $Work).Path
        $resolvedTemp = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
        if ((Split-Path -Parent $resolvedWork) -ne $resolvedTemp -or
            (Split-Path -Leaf $resolvedWork) -notmatch '^vidimahjong-zh-[0-9a-f]{32}$') {
            throw "Refusing cleanup outside the verified temporary build directory."
        }
        Remove-Item -LiteralPath $resolvedWork -Recurse -Force -ErrorAction SilentlyContinue
    }
}
