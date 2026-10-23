"""Verify the pinned game ZIP without launching a browser."""
import hashlib
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parent.parent
protected = [f'js/traditional/{name}.js' for name in ('engine', 'hand-eval', 'yaku', 'scoring', 'bot', 'local-match')]
with ZipFile(root / 'VidiMahjong-zh-customized.zip') as archive:
    names = archive.namelist()
    entry = next(name for name in names if name.endswith('/traditional.html') or name == 'traditional.html')
    prefix = entry[:-len('traditional.html')]
    assert 'e4207acd04887355c012ee2ab9d9456c4cbcb874' in (root / 'build-from-upstream.ps1').read_text(encoding='utf-8')
    for path in protected:
        data = (root / path).read_bytes()
        assert data == archive.read(prefix + path), path + ': differs from pinned upstream build'
        assert data == (Path('G:/QueYe') / path).read_bytes(), path + ': existing game changed'
    for folder in ('js/traditional', 'css', 'server', 'tools', 'assets/tiles', 'assets/characters', 'assets/sfx', 'assets/bgm', 'deploy'):
        for patch in (root / 'patch' / folder).rglob('*'):
            if patch.is_file():
                path = patch.relative_to(root / 'patch').as_posix()
                assert patch.read_bytes() == archive.read(prefix + path), path
    scripts = ['js/traditional/page-load.js','js/traditional/riichi-rules.js','js/traditional/settlement.js','assets/characters/roster.js','js/traditional/characters.js','js/traditional/random-character.js','js/traditional/zh-custom.js','js/traditional/match-pause.js','js/traditional/stage-show.js','js/traditional/defeat-cg.js','js/traditional/table-ui.js','js/traditional/yaku-catalog.js','js/traditional/table-extras.js','js/traditional/dora-highlight.js','js/traditional/riichi-ui.js','js/traditional/score-show.js','js/traditional/dev-hand-fixtures.js','js/traditional/dev-tools.js','js/traditional/ui-sfx.js','js/traditional/bgm.js','assets/characters/voice-catalog.js','js/traditional/voice-events.js','js/traditional/voice-runtime.js']
    for path in ('asset-manager.html', 'start-asset-manager.bat', 'start-friend-test.bat', 'stop-friend-test.bat', 'js/asset-manager.js'):
        assert (root/'patch'/path).read_bytes() == archive.read(prefix+path), path
    scripts += ['js/traditional/reconnect-client.js','js/traditional/online-resume.js','js/traditional/table-focus.js','js/traditional/asset-entry.js']
    scripts += ['js/traditional/play-policy.js','js/traditional/play-options.js','js/traditional/friend-entry.js']
    html = archive.read(entry).decode('utf-8-sig')
    assert [html.index(path) for path in scripts] == sorted(html.index(path) for path in scripts)
    assert 'css/table-focus.css?v=8.2' in html
    assert 'data-i18n="playLocal">本地对局</button>' in html
    assert 'id="qy-page-load"' in html
    for document in ('AGENTS.md','PROGRESS.md','ARCHITECTURE.md','CHARACTER_GUIDE.md','RELEASE_NOTES_v6.md','RELEASE_NOTES_v7.md','RELEASE_NOTES_v7.2.md','RELEASE_NOTES_v7.3.md','RELEASE_NOTES_v8.md','RELEASE_NOTES_v8.1.md','RELEASE_NOTES_v8.2.md'):
        assert archive.read(prefix+document) == (root/document).read_bytes(), document
    room = archive.read(prefix+'server/room.js').decode('utf-8-sig')
    assert "require('../js/traditional/characters.js').has(characterId)" in room
    assert "require('./stage-presentation.js').install(Room)" in room
    assert "require('./riichi-actions.js').install(Room)" in room
    assert "require('./voice-events.js').install(Room)" in room
    assert "require('./random-character.js').install(Room)" in room
    assert "require('./reconnect-view.js').install(Room)" in room
    assert "require('./settlement-confirm.js').install(Room)" in room
    assert 'css/online-resume.css?v=8.2' in html
    assert "msg.type === 'ping' && Number.isSafeInteger(msg.pingId)" in archive.read(prefix+'server/index.js').decode('utf-8-sig')
    assert archive.read(prefix+'server/package.json')
    assert archive.read(prefix+'js/traditional/online.js')
print('Build ZIP PASS: fixed upstream six protected files unchanged; all patch files, script order, server extensions and handoff documents verified.')
print('ZIP SHA256:',hashlib.sha256((root/'VidiMahjong-zh-customized.zip').read_bytes()).hexdigest())
