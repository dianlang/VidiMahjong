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
    for folder in ('js/traditional', 'css', 'assets/tiles', 'assets/characters', 'assets/sfx', 'assets/bgm'):
        for patch in (root / 'patch' / folder).rglob('*'):
            if patch.is_file():
                path = patch.relative_to(root / 'patch').as_posix()
                assert patch.read_bytes() == archive.read(prefix + path), path
    scripts = ['assets/characters/roster.js','js/traditional/characters.js','js/traditional/zh-custom.js','js/traditional/defeat-cg.js','js/traditional/table-ui.js','js/traditional/yaku-catalog.js','js/traditional/table-extras.js','js/traditional/dev-tools.js','js/traditional/ui-sfx.js','js/traditional/bgm.js']
    html = archive.read(entry).decode('utf-8-sig')
    assert [html.index(path) for path in scripts] == sorted(html.index(path) for path in scripts)
    for document in ('AGENTS.md','PROGRESS.md','ARCHITECTURE.md','CHARACTER_GUIDE.md','RELEASE_NOTES_v6.md'):
        assert archive.read(prefix+document) == (root/document).read_bytes(), document
    room = archive.read(prefix+'server/room.js').decode('utf-8-sig')
    assert "require('../js/traditional/characters.js').has(characterId)" in room
    assert archive.read(prefix+'server/package.json')
    assert archive.read(prefix+'js/traditional/online.js')
print('Build ZIP PASS: fixed upstream six protected files unchanged; all patch files, script order, server registry validation and five handoff documents verified.')
print('ZIP SHA256:',hashlib.sha256((root/'VidiMahjong-zh-customized.zip').read_bytes()).hexdigest())
