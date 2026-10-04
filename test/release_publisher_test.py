import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from release_snapshot import save_beta
from release_publisher import git, publish_beta


class ReleasePublisherTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        base = Path(self.directory.name)
        self.root = base / 'work'
        self.root.mkdir()
        remote = base / 'remote.git'
        subprocess.run(['git', 'init', '--bare', str(remote)], check=True, capture_output=True)
        git(self.root, 'init', '-b', 'main')
        git(self.root, 'config', 'user.name', 'Release Test')
        git(self.root, 'config', 'user.email', 'release@example.invalid')
        git(self.root, 'remote', 'add', 'origin', str(remote))
        (self.root / 'release.config.json').write_text(json.dumps({'remote': 'origin', 'branch': 'main', 'url': 'https://example.invalid/'}))
        (self.root / 'index.html').write_text('test-runtime')
        git(self.root, 'add', '.')
        git(self.root, 'commit', '-m', 'Initial runtime')
        draft = {'characters': [{'id': 'player', 'folder': 'players/test'}], 'actors': {'player': {'assets': {}, 'tuning': {}}}, 'sessions': {}}
        self.beta = save_beta(self.root, draft)

    def tearDown(self):
        self.directory.cleanup()

    def test_publish_pushes_only_snapshots_and_preserves_unrelated_work(self):
        unrelated = self.root / 'notes.md'
        unrelated.write_text('unrelated work')
        result = publish_beta(self.root, self.beta['revision'])
        self.assertTrue(result['ok'])
        self.assertEqual(git(self.root, 'ls-remote', 'origin', 'refs/heads/main').split()[0], result['commit'])
        self.assertNotIn('notes.md', git(self.root, 'show', '--pretty=', '--name-only', 'HEAD'))
        self.assertEqual(unrelated.read_text(), 'unrelated work')
        self.assertEqual(json.loads((self.root / 'data/published.json').read_text())['revision'], self.beta['revision'])
        # Repeating the request keeps the same commit, without rewriting history.
        self.assertEqual(publish_beta(self.root, self.beta['revision'])['commit'], result['commit'])

    def test_dirty_runtime_blocks_promotion(self):
        (self.root / 'index.html').write_text('uncommitted-runtime')
        with self.assertRaises(ValueError):
            publish_beta(self.root, self.beta['revision'])
        self.assertFalse((self.root / 'data/published.json').exists())

    def test_other_staged_work_blocks_promotion(self):
        (self.root / 'notes.md').write_text('staged work')
        git(self.root, 'add', 'notes.md')
        with self.assertRaises(ValueError):
            publish_beta(self.root, self.beta['revision'])
        self.assertEqual(git(self.root, 'diff', '--cached', '--name-only'), 'notes.md')


if __name__ == '__main__':
    unittest.main()
