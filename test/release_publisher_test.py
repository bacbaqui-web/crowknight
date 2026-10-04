import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import release_publisher
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from file_transaction import FileTransaction, recover_file_transactions
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

    def test_failed_commit_restores_published_and_removes_only_our_staging(self):
        published = self.root / 'data/published.json'
        published.write_text('{"old":true}')
        git(self.root, 'add', '.')
        git(self.root, 'commit', '-m', 'Previous data')
        previous_commit = git(self.root, 'rev-parse', 'HEAD')
        before = published.read_bytes()
        original = release_publisher.git
        def fail_commit(root, *args):
            if args[0] == 'commit':
                raise RuntimeError('commit failed')
            return original(root, *args)
        with patch.object(release_publisher, 'git', fail_commit), self.assertRaises(RuntimeError):
            publish_beta(self.root, self.beta['revision'])
        self.assertEqual(published.read_bytes(), before)
        self.assertEqual(git(self.root, 'diff', '--cached', '--name-only'), '')
        self.assertEqual(git(self.root, 'rev-parse', 'HEAD'), previous_commit)
        self.assertTrue(publish_beta(self.root, self.beta['revision'])['ok'])

    def test_push_failure_retries_same_committed_snapshot(self):
        original = release_publisher.git
        def fail_push(root, *args):
            if args[0] == 'push':
                raise RuntimeError('offline')
            return original(root, *args)
        with patch.object(release_publisher, 'git', fail_push), self.assertRaises(RuntimeError):
            publish_beta(self.root, self.beta['revision'])
        commit = git(self.root, 'rev-parse', 'HEAD')
        self.assertEqual(publish_beta(self.root, self.beta['revision'])['commit'], commit)

    def test_restart_does_not_revert_files_after_git_commit_succeeded(self):
        transaction = FileTransaction(self.root, [self.root / 'data/published.json', self.root / 'version.json'],
                                      git_head=git(self.root, 'rev-parse', 'HEAD'))
        transaction.__enter__()
        result = publish_beta(self.root, self.beta['revision'])
        recover_file_transactions(self.root)
        self.assertEqual(json.loads((self.root / 'data/published.json').read_text())['revision'], self.beta['revision'])
        self.assertEqual(git(self.root, 'rev-parse', 'HEAD'), result['commit'])


if __name__ == '__main__':
    unittest.main()
