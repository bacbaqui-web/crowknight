import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from release_snapshot import create_snapshot, local_asset_path, promote_beta, save_beta, write_json_atomic


class ReleaseSnapshotTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.image = self.root / 'assets/characters/players/test/body.png'
        self.image.parent.mkdir(parents=True)
        self.image.write_bytes(b'first-image')
        self.draft = {'version': 2, 'characters': [{'id': 'player', 'folder': 'players/test'}],
                      'actors': {'player': {'tuning': {}, 'assets': {}}},
                      'sessions': {'default': {'background': {'layers': []}}}}

    def tearDown(self):
        self.directory.cleanup()

    def test_editing_images_does_not_change_published_images(self):
        first = save_beta(self.root, self.draft)
        promote_beta(self.root, first['revision'])
        path = local_asset_path(self.root, first['actors']['player']['assets']['body'])
        self.image.write_bytes(b'second-image')
        second = save_beta(self.root, self.draft)
        self.assertNotEqual(first['revision'], second['revision'])
        self.assertEqual(path.read_bytes(), b'first-image')
        self.assertEqual(json.loads((self.root / 'data/published.json').read_text())['revision'], first['revision'])

    def test_stale_beta_cannot_be_promoted(self):
        first = save_beta(self.root, self.draft)
        self.draft['actors']['player']['name'] = 'changed'
        save_beta(self.root, self.draft)
        with self.assertRaises(ValueError):
            promote_beta(self.root, first['revision'])
        self.assertFalse((self.root / 'data/published.json').exists())

    def test_missing_asset_does_not_replace_beta_or_draft(self):
        first = save_beta(self.root, self.draft)
        before = (self.root / 'data/draft.json').read_bytes()
        self.draft['actors']['player']['assets']['weapon'] = './assets/missing.png'
        with self.assertRaises(FileNotFoundError):
            save_beta(self.root, self.draft)
        self.assertEqual((self.root / 'data/draft.json').read_bytes(), before)
        self.assertEqual(json.loads((self.root / 'data/beta.json').read_text())['revision'], first['revision'])

    def test_remote_assets_and_path_traversal_are_rejected(self):
        self.draft['effectAssets'] = {'bad': 'https://firebasestorage.googleapis.com/image.png'}
        with self.assertRaises(ValueError):
            create_snapshot(self.root, self.draft)
        with self.assertRaises(ValueError):
            local_asset_path(self.root, './assets/../../outside.png')

    def test_same_content_deduplicates_and_timestamps_do_not_change_revision(self):
        first = save_beta(self.root, self.draft)
        self.draft['savedAt'] = 100
        second = save_beta(self.root, self.draft)
        self.assertEqual(first['revision'], second['revision'])
        self.assertEqual(len(list((self.root / 'release-assets').iterdir())), 1)

    def test_disabled_legacy_layers_and_psd_are_not_published(self):
        self.draft['sessions']['default']['background']['layers'] = [{'enabled': False, 'src': './assets/missing.png'}]
        self.draft['actors']['player']['assets']['characterPsd'] = './assets/original.psd'
        snapshot = create_snapshot(self.root, self.draft)
        self.assertEqual(snapshot['sessions']['default']['background']['layers'][0]['src'], '')
        self.assertNotIn('.psd', json.dumps(snapshot))

    def test_corrupted_snapshot_image_cannot_be_published(self):
        beta = save_beta(self.root, self.draft)
        image = local_asset_path(self.root, beta['actors']['player']['assets']['body'])
        image.write_bytes(b'corrupted')
        with self.assertRaises(ValueError):
            promote_beta(self.root, beta['revision'])
        self.assertFalse((self.root / 'data/published.json').exists())

    def test_effect_keys_are_frozen_even_without_explicit_source_urls(self):
        effect = self.root / 'assets/effects/player/effect_attack.png'
        effect.parent.mkdir(parents=True)
        effect.write_bytes(b'effect-image')
        self.draft['effectAssets'] = {'player/effect_attack': ''}
        beta = save_beta(self.root, self.draft)
        frozen = local_asset_path(self.root, beta['effectAssets']['player/effect_attack'])
        self.assertEqual(frozen.read_bytes(), b'effect-image')
        self.assertTrue(beta['effectAssets']['__snapshot'])

    def test_promoted_snapshot_is_identical_to_tested_beta(self):
        beta = save_beta(self.root, self.draft)
        promoted = promote_beta(self.root, beta['revision'])
        self.assertEqual(beta, promoted)
        self.assertEqual((self.root / 'data/beta.json').read_bytes(), (self.root / 'data/published.json').read_bytes())


if __name__ == '__main__':
    unittest.main()
