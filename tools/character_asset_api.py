"""Character authoring API. Original PSDs are never moved, replaced or deleted."""
import shutil
import time
from pathlib import Path
from urllib.parse import parse_qs
from asset_source_store import active_source, convert_asset, copy_source_selection
from export_character_psd_parts import PART_LAYER_NAMES, export_character_parts, find_character_psd


def sanitize_character_folder(folder):
    parts = []
    for part in str(folder).split('/'):
        safe = ''.join(char if char.isalnum() or char in '._-' else '_' for char in part).strip('._-')
        if safe:
            parts.append(safe)
    if not parts:
        raise ValueError('Character folder is required')
    return '/'.join(parts)


class CharacterAssetApi:
    def character_folder_from_request(self, parsed, allow_create=False, allow_missing=False, name='folder'):
        folder = parse_qs(parsed.query).get(name, [''])[0]
        path = (self.characters_dir / sanitize_character_folder(folder)).resolve()
        if self.characters_dir not in path.parents:
            raise ValueError('Invalid character folder')
        if not allow_create and not allow_missing and not path.is_dir():
            raise ValueError('Invalid character folder')
        return path

    def character_source(self, folder):
        group = folder.relative_to(self.characters_dir).parts[0]
        original = folder / ('player.psd' if group == 'players' else 'enemy.psd')
        if not original.exists() and active_source(self.root_dir, original) == original:
            return find_character_psd(folder) or original
        return original

    def refresh_character(self, parsed, upload=False, create=False):
        folder = self.character_folder_from_request(parsed, allow_create=create)
        if create and folder.exists() and any(folder.iterdir()):
            self.send_json(409, {'error': 'Character folder already exists'})
            return
        original = self.character_source(folder)
        body = self.read_request_body() if upload else None

        def convert(source, work, source_url):
            output = work / 'parts'
            output.mkdir()
            exported = export_character_parts(source, output)
            if exported <= 0:
                raise ValueError('No character part layers exported from PSD')
            return {'ok': True, 'folder': folder.name, 'psd': original.name,
                    'exported': exported, 'parts': [p.name for p in output.glob('*.png')], 'updatedAt': time.time_ns() // 1_000_000}, {
                folder / part.name: part for part in output.glob('*.png')}

        old_outputs = [folder / (name + '.png') for name in PART_LAYER_NAMES]
        self.send_json(200, convert_asset(self.root_dir, original, convert, body, old_outputs=old_outputs))

    def handle_character_refresh(self, parsed):
        self.refresh_character(parsed)

    def handle_character_upload_refresh(self, parsed):
        self.refresh_character(parsed, upload=True)

    def handle_character_create(self, parsed):
        self.refresh_character(parsed, upload=True, create=True)

    def handle_character_copy(self, parsed):
        source = self.character_folder_from_request(parsed, name='from')
        target = self.character_folder_from_request(parsed, name='to', allow_create=True)
        if target == source or source in target.parents or target in source.parents:
            raise ValueError('중첩된 캐릭터 폴더로 복사할 수 없습니다.')
        if target.exists() and any(target.iterdir()):
            self.send_json(409, {'error': 'Target character folder already exists'})
            return
        try:
            shutil.copytree(source, target, dirs_exist_ok=True)
            copy_source_selection(self.root_dir, source, target)
        except Exception:
            # The destination was empty; keep the source and all its PSDs untouched.
            if target.exists():
                shutil.rmtree(target)
            raise
        self.send_json(200, {'ok': True, 'from': str(source), 'to': str(target), 'originalPreserved': True})

    def handle_character_move(self, parsed):
        # Metadata moves to the new group; physical source files remain at their original paths.
        self.handle_character_copy(parsed)

    def handle_character_delete(self, parsed):
        folder = self.character_folder_from_request(parsed, allow_missing=True)
        self.send_json(200, {'ok': True, 'folder': str(folder), 'originalPreserved': True})
