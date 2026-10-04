"""Create immutable, repository-owned game data and image snapshots."""
import base64
import copy
import hashlib
import json
import os
import threading
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import urlopen

IMAGE_SUFFIXES = {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'}
CHARACTER_PARTS = {
    'body': 'body.png', 'head': 'head.png', 'cape': 'cape.png', 'shield': 'shield.png',
    'upperArmL': 'upper_arm_l.png', 'lowerArmL': 'lower_arm_l.png',
    'upperArmR': 'upper_arm_r.png', 'lowerArmR': 'lower_arm_r.png',
    'upperLegL': 'upper_leg_l.png', 'lowerLegL': 'lower_leg_l.png',
    'upperLegR': 'upper_leg_r.png', 'lowerLegR': 'lower_leg_r.png', 'weapon': 'weapon.png',
}
RELEASE_LOCK = threading.RLock()


def write_json_atomic(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def local_asset_path(root, source):
    parsed = urlparse(source)
    if parsed.scheme or parsed.netloc:
        raise ValueError('외부 에셋은 먼저 로컬로 이전해야 합니다.')
    relative = unquote(parsed.path).removeprefix('./')
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()) or not relative.startswith(('assets/', 'release-assets/')):
        raise ValueError('프로젝트 에셋 경로만 사용할 수 있습니다.')
    return path


def store_image(root, body, suffix):
    if suffix not in IMAGE_SUFFIXES:
        raise ValueError('실행용 이미지 형식이 아닙니다.')
    digest = hashlib.sha256(body).hexdigest()
    path = root / 'release-assets' / (digest + suffix)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(body)
    return './' + path.relative_to(root).as_posix()


def freeze_image(root, source, allow_remote=False):
    parsed = urlparse(source)
    if parsed.scheme == 'data':
        header, encoded = source.split(',', 1)
        suffix = {'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg'}.get(header[5:].split(';')[0])
        if not suffix or not header.endswith(';base64'):
            raise ValueError('지원하지 않는 내장 이미지입니다.')
        return store_image(root, base64.b64decode(encoded, validate=True), suffix)
    if parsed.scheme or parsed.netloc:
        if not allow_remote or parsed.hostname != 'firebasestorage.googleapis.com':
            raise ValueError('외부 에셋은 먼저 로컬로 이전해야 합니다.')
        suffix = Path(unquote(parsed.path)).suffix.lower()
        with urlopen(source, timeout=30) as response:
            body = response.read()
        return store_image(root, body, suffix)
    path = local_asset_path(root, source)
    return store_image(root, path.read_bytes(), path.suffix.lower())


def create_snapshot(root, draft, allow_remote=False):
    if not isinstance(draft, dict) or not isinstance(draft.get('actors'), dict) or not draft.get('characters'):
        raise ValueError('캐릭터가 포함된 프로젝트 데이터가 필요합니다.')
    state = copy.deepcopy(draft)
    state.pop('sceneSession', None)
    for session in state.get('sessions', {}).values():
        background = session.get('background', {})
        for layer in background.get('layers', []):
            if layer.get('enabled') is False:
                layer['src'] = ''
    cache = {}

    def image(source):
        if source not in cache:
            cache[source] = freeze_image(root, source, allow_remote)
        return cache[source]

    def walk(value):
        if isinstance(value, dict):
            return {key: walk(item) for key, item in value.items() if key not in {'sourceUrl', 'psdFileName'}}
        if isinstance(value, list):
            return [walk(item) for item in value]
        if isinstance(value, str):
            suffix = Path(unquote(urlparse(value).path)).suffix.lower()
            if value.startswith('data:image/') or suffix in IMAGE_SUFFIXES and value.startswith(('./assets/', 'assets/', './release-assets/', 'https://')):
                return image(value)
            if suffix == '.psd':
                return ''
        return value

    # Explicit sources must all resolve. Optional absent character parts remain absent.
    state = walk(state)
    for character in state['characters']:
        actor = state['actors'].get(character['id'])
        if not actor:
            raise ValueError('캐릭터 저장 데이터가 없습니다: ' + character['id'])
        sources = actor.setdefault('assets', {})
        is_frozen = bool(sources.get('__snapshot'))
        sources['__snapshot'] = True
        if is_frozen:
            continue
        for key, filename in CHARACTER_PARTS.items():
            if not sources.get(key):
                path = root / 'assets' / 'characters' / character['folder'] / filename
                if path.is_file():
                    sources[key] = image('./' + path.relative_to(root).as_posix())
    effects = state.setdefault('effectAssets', {})
    defaults = {'slash1': 'slash_1.png', 'slash2': 'slash_2.png', 'slash3': 'slash_3.png'}
    if not effects.get('__snapshot'):
        for key in set(effects) | set(defaults):
            if key.endswith('Psd') or key == '__snapshot' or effects.get(key):
                continue
            if key in defaults:
                path = root / 'assets/effects/attack' / defaults[key]
            elif '/' in key:
                actor_id, image_key = key.split('/', 1)
                path = root / 'assets/effects' / actor_id / (image_key + '.png')
            else:
                path = root / 'assets/effects/custom' / (key + '.png')
            if path.is_file():
                effects[key] = image('./' + path.relative_to(root).as_posix())
            elif key not in defaults:
                raise FileNotFoundError('이펙트 이미지가 없습니다: ' + key)
    effects['__snapshot'] = True
    # Revision includes actual image content and settings, not editor save timestamps.
    revision_data = {key: value for key, value in state.items() if key not in {'savedAt', 'releaseVersion', 'revision'}}
    revision = hashlib.sha256(json.dumps(revision_data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    state['revision'] = revision
    state['releaseVersion'] = revision[:16]
    return state


def save_beta(root, draft):
    with RELEASE_LOCK:
        snapshot = create_snapshot(root, draft)
        write_json_atomic(root / 'data/draft.json', draft)
        write_json_atomic(root / 'data/beta.json', snapshot)
        return snapshot


def promote_beta(root, expected_revision):
    with RELEASE_LOCK:
        state = json.loads((root / 'data/beta.json').read_text())
        if not expected_revision or state.get('revision') != expected_revision:
            raise ValueError('베타가 변경되었습니다. 최신 베타를 플레이한 뒤 배포해 주세요.')
        # Check immutable assets still exist before changing the published pointer.
        if create_snapshot(root, state)['revision'] != expected_revision:
            raise ValueError('베타 데이터 또는 이미지가 변경되었습니다. 다시 저장하고 플레이해 주세요.')
        write_json_atomic(root / 'data/published.json', state)
        write_json_atomic(root / 'version.json', {'version': state['releaseVersion']})
        return state
