"""Read-only archive of the old project Storage prefix, including legacy PSD copies."""
import json
import hashlib
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from urllib.request import urlopen
from release_snapshot import IMAGE_SUFFIXES, store_image, write_json_atomic


def referenced_images(original, migrated, mapping):
    if isinstance(original, dict) and isinstance(migrated, dict):
        for key in original.keys() & migrated.keys():
            referenced_images(original[key], migrated[key], mapping)
    elif isinstance(original, list) and isinstance(migrated, list):
        for old, new in zip(original, migrated):
            referenced_images(old, new, mapping)
    elif isinstance(original, str) and original.startswith('https://firebasestorage.googleapis.com/'):
        object_name = unquote(urlparse(original).path.split('/o/', 1)[1])
        mapping[object_name] = migrated


def archive_storage(root, original_state):
    bucket = 'crow-knight.firebasestorage.app'
    prefix = 'crow-knight/assets/'
    base = f'https://firebasestorage.googleapis.com/v0/b/{bucket}/o'
    mapping = {}
    referenced_images(original_state, json.loads((root / 'data/published.json').read_text()), mapping)
    items = []
    token = ''
    while True:
        url = base + '?prefix=' + quote(prefix, safe='') + '&maxResults=1000'
        if token:
            url += '&pageToken=' + quote(token, safe='')
        with urlopen(url, timeout=30) as response:
            page = json.load(response)
        items.extend(page.get('items', []))
        token = page.get('nextPageToken')
        if not token:
            break
    records = []
    for item in items:
        name = item['name']
        if name in mapping:
            local = mapping[name]
            body = (root / local.removeprefix('./')).read_bytes()
        else:
            relative = name.removeprefix(prefix)
            path = (root / 'runtime/firebase-migration-backup' / relative).resolve()
            if not path.is_relative_to((root / 'runtime/firebase-migration-backup').resolve()):
                raise ValueError('Invalid archive path')
            if path.exists():
                body = path.read_bytes()
            else:
                with urlopen(base + '/' + quote(name, safe='') + '?alt=media', timeout=60) as response:
                    body = response.read()
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(body)
            if path.suffix.lower() in IMAGE_SUFFIXES:
                local = store_image(root, body, path.suffix.lower())
            else:
                local = './' + path.relative_to(root).as_posix()
        records.append({'object': name, 'local': local, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()})
    write_json_atomic(root / 'data/storage-migration.json', {'bucket': bucket, 'prefix': prefix, 'objects': records})
    print('Archived Storage objects:', len(records), 'bytes:', sum(item['bytes'] for item in records))
    print('Remote objects and local original PSDs were not modified.')


if __name__ == '__main__':
    # Original metadata is a temporary local export from the initial migration.
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--original-state', required=True)
    args = parser.parse_args()
    archive_storage(Path(args.root).resolve(), json.loads(Path(args.original_state).read_text()))
