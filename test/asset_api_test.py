import io
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from dev_server import create_server
from asset_source_store import active_source


class AssetApiTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.folder = self.root / 'assets/characters/mobs/test'
        self.folder.mkdir(parents=True)
        self.psd = self.folder / 'enemy.psd'
        self.psd.write_bytes(b'original character')
        (self.folder / 'body.png').write_bytes(b'old body')
        (self.folder / 'head.png').write_bytes(b'old head')
        self.bg = self.root / 'assets/backgrounds/background_01.psd'
        self.bg.parent.mkdir(parents=True)
        self.bg.write_bytes(b'original background')
        self.effect = self.root / 'assets/effects/attack/slash_1.psd'
        self.effect.parent.mkdir(parents=True)
        self.effect.write_bytes(b'original effect')
        self.args = SimpleNamespace(root=str(self.root), host='127.0.0.1', port=0, port_retries=0,
            psd='assets/backgrounds/background_01.psd', output='assets/backgrounds/current/background-preview.webp',
            manifest='assets/backgrounds/current/background-preview.json', layer_output_dir='assets/backgrounds/current/layers',
            default_state='runtime/project-default-state.json', uploaded_psd_dir='assets/backgrounds/uploaded-psds', characters_dir='assets/characters')
        self.server, _ = create_server(self.args)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = 'http://127.0.0.1:' + str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, route, body=b'upload', headers=None, method='POST'):
        request = urllib.request.Request(self.base + route, data=body if method=='POST' else None,
            headers=headers or {}, method=method)
        try:
            response = urllib.request.urlopen(request)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_all_mutating_api_routes_reject_other_origins(self):
        routes = ['/api/psd/refresh', '/api/character/delete?folder=mobs/test', '/api/character/move?from=mobs/test&to=bosses/test',
                  '/api/character/create?folder=mobs/new', '/api/effect/upload?asset=slash1', '/api/state/default', '/api/characters/index', '/api/project/save']
        for route in routes:
            self.assertEqual(self.request(route, headers={'Origin': 'https://other.example'})[0], 403)
        self.assertEqual(self.request('/api/character/refresh?folder=mobs/test', method='GET', headers={'Origin': 'https://other.example'})[0], 403)
        self.assertEqual(self.psd.read_bytes(), b'original character')

    def test_oversized_asset_upload_rejected_before_conversion(self):
        status, _ = self.request('/api/psd/refresh', headers={'Content-Length': str(128*1024*1024+1)})
        self.assertEqual(status, 413)
        self.assertEqual(self.bg.read_bytes(), b'original background')

    def test_invalid_psd_upload_preserves_all_originals(self):
        for route in ['/api/psd/refresh', '/api/character/refresh?folder=mobs/test', '/api/effect/upload?asset=slash1']:
            status, _ = self.request(route, headers={'X-Effect-Filename': 'bad.psd'})
            self.assertIn(status, [400, 500])
        self.assertEqual(self.bg.read_bytes(), b'original background')
        self.assertEqual(self.psd.read_bytes(), b'original character')
        self.assertEqual(self.effect.read_bytes(), b'original effect')
        self.assertEqual((self.folder / 'body.png').read_bytes(), b'old body')

    def test_partial_character_export_does_not_publish_outputs(self):
        def export(source, folder):
            (folder / 'body.png').write_bytes(b'partial body')
            raise RuntimeError('conversion failed')
        with patch('character_asset_api.export_character_parts', export):
            self.assertEqual(self.request('/api/character/refresh?folder=mobs/test')[0], 500)
        self.assertEqual((self.folder / 'body.png').read_bytes(), b'old body')
        self.assertEqual(self.psd.read_bytes(), b'original character')

    def test_successful_upload_removes_stale_png_but_preserves_original_psd(self):
        def export(source, folder):
            self.assertEqual(source.read_bytes(), b'new character')
            (folder / 'body.png').write_bytes(b'new body')
            return 1
        with patch('character_asset_api.export_character_parts', export):
            status, result = self.request('/api/character/refresh?folder=mobs/test', b'new character')
            self.assertEqual(status, 200)
            self.assertTrue(result['sourceUrl'].startswith('./runtime/asset-sources/'))
            self.assertEqual(self.request('/api/character/refresh?folder=mobs/test', method='GET')[0], 200)
        self.assertEqual(self.psd.read_bytes(), b'original character')
        self.assertEqual((self.folder / 'body.png').read_bytes(), b'new body')
        self.assertFalse((self.folder / 'head.png').exists())
        self.assertEqual(active_source(self.root, self.psd).read_bytes(), b'new character')

    def test_manual_original_edit_is_used_by_refresh_after_an_upload(self):
        def export(source, folder):
            (folder / 'body.png').write_bytes(source.read_bytes())
            return 1
        with patch('character_asset_api.export_character_parts', export):
            self.assertEqual(self.request('/api/character/refresh?folder=mobs/test', b'uploaded')[0], 200)
            self.psd.write_bytes(b'manually edited original')
            self.assertEqual(self.request('/api/character/refresh?folder=mobs/test', method='GET')[0], 200)
        self.assertEqual((self.folder / 'body.png').read_bytes(), b'manually edited original')

    def test_move_and_delete_keep_original_psd_paths(self):
        status, _ = self.request('/api/character/move?from=mobs/test&to=bosses/test', b'')
        self.assertEqual(status, 200)
        self.assertEqual(self.psd.read_bytes(), b'original character')
        self.assertEqual((self.root / 'assets/characters/bosses/test/enemy.psd').read_bytes(), b'original character')
        self.assertEqual(self.request('/api/character/delete?folder=mobs/test', b'')[0], 200)
        self.assertTrue(self.psd.exists())

    def test_png_effect_upload_converts_and_refreshes_without_overwriting_psd(self):
        body = io.BytesIO()
        Image.new('RGBA', (3, 4), 'red').save(body, format='PNG')
        status, _ = self.request('/api/effect/upload?asset=slash1', body.getvalue(), {'X-Effect-Filename':'effect.png'})
        self.assertEqual(status, 200)
        self.assertEqual(self.request('/api/effect/refresh?asset=slash1', method='GET')[0], 200)
        self.assertEqual(self.effect.read_bytes(), b'original effect')
        with Image.open(self.effect.with_suffix('.png')) as image:
            self.assertEqual(image.size, (3, 4))

    def test_nested_character_copy_rejected_without_changing_sources(self):
        self.assertEqual(self.request('/api/character/copy?from=mobs/test&to=mobs/test/child', b'')[0], 400)
        self.assertTrue(self.psd.exists())
        self.assertFalse((self.folder / 'child').exists())
