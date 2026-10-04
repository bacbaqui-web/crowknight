"""Effect conversion API with staged output and preserved original sources."""
import time
from pathlib import Path
from urllib.parse import parse_qs
from asset_source_store import convert_asset
from effect_asset_exporter import effect_asset_path, effect_source_psd_path, export_effect_asset


def effect_asset_from_request(parsed):
    asset = parse_qs(parsed.query).get('asset', [''])[0].strip()
    if asset not in {'slash1', 'slash2', 'slash3'}:
        parts = asset.split('/')
        if len(parts) not in {1, 2} or not parts[-1].startswith('effect_') or not all(
                part and all(char.isalnum() or char in '_-' for char in part) for part in parts):
            raise ValueError('Invalid effect asset')
    return asset


class EffectAssetApi:
    def refresh_effect(self, parsed, upload=False):
        asset = effect_asset_from_request(parsed)
        output = effect_asset_path(self.root_dir, asset)
        original = effect_source_psd_path(self.root_dir, asset)
        suffix = Path(self.headers.get('X-Effect-Filename', 'effect.psd')).suffix.lower() if upload else '.psd'
        if suffix not in {'.png', '.webp', '.jpg', '.jpeg', '.psd'}:
            raise ValueError('Unsupported effect file')
        body = self.read_request_body() if upload else None

        def convert(source, work, source_url):
            staged = work / output.name
            result = export_effect_asset(source, staged)
            result['output'] = str(output)
            result.update({'ok': True, 'asset': asset, 'updatedAt': time.time_ns() // 1_000_000})
            return result, {output: staged}

        result = convert_asset(self.root_dir, original, convert, body, suffix)
        result['sourceUrl'] = './' + output.relative_to(self.root_dir).as_posix()
        self.send_json(200, result)

    def handle_effect_refresh(self, parsed):
        self.refresh_effect(parsed)

    def handle_effect_upload_refresh(self, parsed):
        self.refresh_effect(parsed, upload=True)

    def handle_effect_local_upload(self, parsed):
        self.refresh_effect(parsed, upload=True)
