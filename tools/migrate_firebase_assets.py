"""One-time read-only migration of the live Firebase game, preserving authoring PSDs."""
import argparse
import base64
import gzip
import json
import re
from pathlib import Path
from urllib.request import urlopen
from release_snapshot import create_snapshot, save_beta, write_json_atomic


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--force', action='store_true', help='기존 snapshot을 덮어쓰는 초기 이전')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if (root / 'data/published.json').exists() and not args.force:
        parser.error('이미 snapshot이 있습니다. 일상 저장에는 이 도구를 사용하지 마세요.')
    config = (root / 'src/firebase_config_data.js').read_text()
    project = re.search(r"projectId: '([^']+)'", config)[1]
    api_key = re.search(r"apiKey: '([^']+)'", config)[1]
    url = f'https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/projectSettings/crowKnight?key={api_key}'
    with urlopen(url, timeout=30) as response:
        fields = json.load(response)['fields']
    if fields.get('stateEncoding', {}).get('stringValue') == 'gzip-base64':
        state = json.loads(gzip.decompress(base64.b64decode(fields['stateData']['stringValue'])))
    else:
        state = json.loads(fields['stateJson']['stringValue'])
    published = create_snapshot(root, state, allow_remote=True)
    write_json_atomic(root / 'data/published.json', published)
    write_json_atomic(root / 'version.json', {'version': published['releaseVersion']})
    draft = json.loads((root / 'runtime/project-default-state.json').read_text())
    save_beta(root, draft)
    print('Migrated published revision:', published['revision'])
    print('Prepared beta from local editor data. Remote files and PSDs were not modified.')


if __name__ == '__main__':
    main()
