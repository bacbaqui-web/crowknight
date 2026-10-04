"""Rollback grouped file edits, including recovery after an interrupted local server."""
import json
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path


def replace_bytes(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(body)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def json_bytes(payload):
    return (json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')


class FileTransaction:
    def __init__(self, root, paths, git_head=None, staged_paths=()):
        self.root = Path(root).resolve()
        self.paths = list(dict.fromkeys(Path(path).resolve() for path in paths))
        self.directory = self.root / 'runtime/file-transactions' / uuid.uuid4().hex
        self.entries = []
        self.committed = False
        self.git_head = git_head
        self.staged_paths = list(staged_paths)

    def __enter__(self):
        self.directory.mkdir(parents=True)
        for index, path in enumerate(self.paths):
            relative = path.relative_to(self.root).as_posix()
            backup = str(index) if path.is_file() else None
            if backup is not None:
                shutil.copy2(path, self.directory / backup)
            self.entries.append({'path': relative, 'backup': backup})
        replace_bytes(self.directory / 'journal.json', json_bytes({'entries': self.entries, 'gitHead': self.git_head, 'stagedPaths': self.staged_paths}))
        return self

    def commit(self):
        replace_bytes(self.directory / 'committed', b'committed')
        self.committed = True

    def __exit__(self, exc_type, exc, traceback):
        if not self.committed and not git_commit_changed(self.root, self.git_head):
            restore_files(self.root, self.directory, self.entries)
        shutil.rmtree(self.directory)
        return False


def restore_files(root, directory, entries):
    for entry in entries:
        path = (root / entry['path']).resolve()
        path.relative_to(root)
        backup = entry['backup']
        if backup is None:
            path.unlink(missing_ok=True)
        else:
            replace_bytes(path, (directory / backup).read_bytes())


def git_commit_changed(root, baseline):
    if not baseline:
        return False
    result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=root, capture_output=True, text=True, check=True)
    return result.stdout.strip() != baseline


def recover_file_transactions(root):
    root = Path(root).resolve()
    directory = root / 'runtime/file-transactions'
    if not directory.exists():
        return
    for transaction in directory.iterdir():
        journal = transaction / 'journal.json'
        if journal.exists() and not (transaction / 'committed').exists():
            state = json.loads(journal.read_text())
            if not git_commit_changed(root, state.get('gitHead')):
                restore_files(root, transaction, state['entries'])
                if state.get('stagedPaths'):
                    subprocess.run(['git', 'reset', '--', *state['stagedPaths']], cwd=root, capture_output=True, check=True)
        shutil.rmtree(transaction)


def write_json_bundle(root, payloads):
    with FileTransaction(root, payloads) as transaction:
        for path, payload in payloads.items():
            replace_bytes(path, json_bytes(payload))
        transaction.commit()
