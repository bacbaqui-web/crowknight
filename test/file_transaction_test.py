import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import file_transaction as files
from release_snapshot import save_beta


class FileTransactionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.a = self.root / 'data/draft.json'
        self.b = self.root / 'data/beta.json'
        self.a.parent.mkdir()
        self.a.write_bytes(b'old draft')
        self.b.write_bytes(b'old beta')

    def tearDown(self):
        self.temp.cleanup()

    def test_second_file_failure_restores_both_files(self):
        original = files.replace_bytes
        failed = False
        def write(path, body):
            nonlocal failed
            if path == self.b and not failed:
                failed = True
                raise OSError('disk error')
            original(path, body)
        with patch.object(files, 'replace_bytes', write), self.assertRaises(OSError):
            files.write_json_bundle(self.root, {self.a: {'new': 1}, self.b: {'new': 2}})
        self.assertEqual(self.a.read_bytes(), b'old draft')
        self.assertEqual(self.b.read_bytes(), b'old beta')

    def test_server_restart_recovers_interrupted_transaction(self):
        created = self.root / 'created.json'
        transaction = files.FileTransaction(self.root, [self.a, created])
        transaction.__enter__()
        self.a.write_bytes(b'partial')
        created.write_bytes(b'partial')
        files.recover_file_transactions(self.root)
        self.assertEqual(self.a.read_bytes(), b'old draft')
        self.assertFalse(created.exists())

    def test_committed_transaction_is_not_rolled_back_after_restart(self):
        transaction = files.FileTransaction(self.root, [self.a])
        transaction.__enter__()
        self.a.write_bytes(b'committed')
        transaction.commit()
        files.recover_file_transactions(self.root)
        self.assertEqual(self.a.read_bytes(), b'committed')

    def test_save_beta_failure_preserves_the_previous_pair(self):
        draft = {'characters': [{'id': 'p', 'folder': 'players/p'}], 'actors': {'p': {'assets': {}}}, 'sessions': {}}
        original = files.replace_bytes
        failed = False
        def write(path, body):
            nonlocal failed
            if path == self.b and not failed:
                failed = True
                raise OSError('disk error')
            original(path, body)
        with patch.object(files, 'replace_bytes', write), self.assertRaises(OSError):
            save_beta(self.root, draft)
        self.assertEqual(self.a.read_bytes(), b'old draft')
        self.assertEqual(self.b.read_bytes(), b'old beta')
