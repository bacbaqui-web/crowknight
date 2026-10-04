"""Publish only tested snapshots to the existing GitHub Pages source branch."""
import json
import subprocess
from file_transaction import FileTransaction
from release_snapshot import RELEASE_LOCK, local_asset_path, promote_beta


def git(root, *args):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or 'Git 작업 실패')
    return result.stdout.strip()


def snapshot_asset_paths(root, state):
    paths = set()
    def walk(value):
        if isinstance(value, dict):
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)
        elif isinstance(value, str) and value.startswith('./release-assets/'):
            paths.add(local_asset_path(root, value).relative_to(root).as_posix())
    walk(state)
    return sorted(paths)


def publish_beta(root, revision):
    with RELEASE_LOCK:
        config = json.loads((root / 'release.config.json').read_text())
        if git(root, 'branch', '--show-current') != config['branch']:
            raise ValueError('배포 브랜치에서 실행해 주세요: ' + config['branch'])
        dirty_code = git(root, 'status', '--porcelain', '--', 'src', 'tools', 'index.html', 'beta.html', 'setting.html', 'sw.js', 'release.config.json')
        if dirty_code:
            raise ValueError('게임 코드 변경을 먼저 커밋하고 배포해야 합니다. 베타와 공개 코드가 달라질 수 있습니다.')
        # Do not create a commit that silently carries somebody else's staged work.
        if git(root, 'diff', '--cached', '--name-only'):
            raise ValueError('다른 변경이 스테이징되어 있습니다. 먼저 해당 Git 작업을 마쳐 주세요.')
        state = json.loads((root / 'data/beta.json').read_text())
        paths = ['data/published.json', 'data/beta.json', 'data/draft.json', 'version.json'] + snapshot_asset_paths(root, state)
        previous_commit = git(root, 'rev-parse', 'HEAD')
        with FileTransaction(root, [root / 'data/published.json', root / 'version.json'], git_head=previous_commit, staged_paths=paths) as transaction:
            state = promote_beta(root, revision)
            try:
                git(root, 'add', '--', *paths)
                if git(root, 'diff', '--cached', '--name-only'):
                    git(root, 'commit', '-m', 'Publish tested beta ' + state['releaseVersion'], '--only', '--', *paths)
            except Exception:
                if git(root, 'rev-parse', 'HEAD') == previous_commit:
                    # Only our staging exists: the preflight rejected any pre-existing staged work.
                    git(root, 'reset', '--', *paths)
                else:
                    transaction.commit()
                raise
            commit = git(root, 'rev-parse', 'HEAD')
            transaction.commit()
        # A push failure keeps the committed snapshot for retry without rewriting history.
        git(root, 'push', config['remote'], config['branch'])
        return {'ok': True, 'revision': revision, 'commit': commit, 'url': config['url'],
                'message': '배포 요청을 전송했습니다. GitHub Pages 반영까지 잠시 기다려 주세요.'}
