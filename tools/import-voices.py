"""Import the user's batch WAV output, preserving originals and game slot aliases."""
import argparse
import csv
import hashlib
import json
import shutil
import wave
from pathlib import Path

ROLES = dict(zip(('wolf', 'fairy', 'lili', 'tina', 'shengdi', 'rabi'),
                 (f'character-{i:02}' for i in range(1, 7))))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Batch tool output folder with _manifest.csv')
    args = parser.parse_args()
    source = args.output.resolve()
    root = Path(__file__).resolve().parent.parent
    roster_path = root / 'patch/assets/characters/roster.js'
    roster_text = roster_path.read_text(encoding='utf-8')
    start = roster_text.index('  return [') + len('  return ')
    end = roster_text.rindex('];') + 1
    roster = json.loads(roster_text[start:end])
    by_id = {row['id']: row for row in roster}
    catalog, copies, seen = [], [], set()
    with (source / '_manifest.csv').open(encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            role, event = row['role_id'], row['event_id']
            if role not in ROLES or not event.replace('_', '').isalnum():
                raise ValueError('Unknown role or invalid event: ' + role + '/' + event)
            key = (role, event)
            if key in seen:
                raise ValueError('Duplicate event: ' + str(key))
            seen.add(key)
            file = (source / row['relative_wav']).resolve()
            if not file.is_relative_to(source) or file.suffix.lower() != '.wav':
                raise ValueError('Invalid WAV path: ' + str(file))
            with wave.open(str(file)) as audio:
                if not audio.getnframes() or not audio.getframerate():
                    raise ValueError('Empty WAV: ' + str(file))
                duration = audio.getnframes() / audio.getframerate()
            character_id = ROLES[role]
            if row['role_name'] != by_id[character_id]['name']:
                raise ValueError('Character name mismatch: ' + role)
            names = [event + '.wav']
            if event in ('stage_1', 'stage_2', 'stage_3', 'stage_4'):
                stage = event[-1]
                names.append('stage-' + stage + '.wav')
                by_id[character_id]['stageLines'][stage] = row['text_zh']
            if event == 'win_small':
                names.append('win.wav')
                by_id[character_id]['winLine'] = row['text_zh']
            for name in names:
                copies.append((file, Path(character_id) / 'voice' / name))
            catalog.append(dict(characterId=character_id, event=event,
                                textJa=row['text_ja'], textZh=row['text_zh'],
                                path=f'{character_id}/voice/{event}.wav',
                                durationSeconds=round(duration, 3),
                                sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    for role in ROLES:
        for event in ('stage_1', 'stage_2', 'stage_3', 'stage_4', 'win_small'):
            if (role, event) not in seen:
                raise ValueError('Required slot missing: ' + role + '/' + event)
    # Validate the entire manifest before writing any runtime files.
    for destination in (root / 'patch/assets/characters', root / 'assets/characters'):
        for file, relative in copies:
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, target)
        (destination / 'voice-catalog.json').write_bytes(
            (json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
        (destination / 'voice-catalog.js').write_bytes(
            ('/* Generated from the supplied voice manifest; see tools/import-voices.py. */\n'
             '(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();'
             'else root.QueYeVoiceCatalog=factory();})(typeof globalThis!=="undefined"?globalThis:this,function(){return '
             + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';});\n').encode('utf-8'))
        (destination / 'roster.js').write_bytes(
            (roster_text[:start] + json.dumps(roster, ensure_ascii=False, indent=2)
             + roster_text[end:]).encode('utf-8'))
    print(f'Imported {len(catalog)} WAV recordings and {len(copies)-len(catalog)} slot aliases '
          'into canonical patch and runtime assets. Subtitles match supplied manifest.')


if __name__ == '__main__':
    main()
