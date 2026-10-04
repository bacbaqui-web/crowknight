"""Keep uploaded sources separate from original PSDs; publish derived files after conversion."""
import hashlib
import json
import tempfile
from pathlib import Path
from file_transaction import FileTransaction, json_bytes, replace_bytes


def source_index_path(root):
    return root / 'runtime/asset-sources/index.json'


def read_source_index(root):
    path = source_index_path(root)
    return json.loads(path.read_text()) if path.exists() else {}


def active_source(root, original):
    root = Path(root).resolve()
    original = Path(original)
    relative = original.resolve().relative_to(root).as_posix()
    saved = read_source_index(root).get(relative)
    if saved:
        if isinstance(saved, dict):
            mtime = original.stat().st_mtime_ns if original.exists() else None
            if mtime != saved.get('originalMtimeNs'):
                return original
            saved = saved['path']
        path = (root / saved).resolve()
        path.relative_to(root / 'runtime/asset-sources')
        if not path.is_file():
            raise FileNotFoundError('보관한 업로드 원본이 없습니다: ' + saved)
        return path
    return original


def convert_asset(root, original, convert, upload=None, suffix='.psd', old_outputs=()):
    """convert(source, work, source_url) returns (result, {final_path: staged_path})."""
    root = Path(root).resolve()
    with tempfile.TemporaryDirectory(prefix='crow-knight-asset-') as temporary:
        work = Path(temporary)
        source = active_source(root, original)
        if upload is not None:
            source = work / ('source' + suffix)
            source.write_bytes(upload)
        saved = root / 'runtime/asset-sources' / (hashlib.sha256(upload).hexdigest() + suffix) if upload is not None else source
        source_url = './' + saved.relative_to(root).as_posix()
        result, outputs = convert(source, work, source_url)
        index = read_source_index(root)
        changes = {Path(path): Path(staged).read_bytes() for path, staged in outputs.items()}
        for obsolete in old_outputs:
            if obsolete not in changes:
                changes[obsolete] = None
        if upload is not None:
            changes[saved] = upload
            index[Path(original).relative_to(root).as_posix()] = {'path': saved.relative_to(root).as_posix(),
                'originalMtimeNs': Path(original).stat().st_mtime_ns if Path(original).exists() else None}
            changes[source_index_path(root)] = json_bytes(index)
        with FileTransaction(root, changes) as transaction:
            for path, body in changes.items():
                if body is None:
                    path.unlink(missing_ok=True)
                else:
                    replace_bytes(path, body)
            transaction.commit()
        result['sourceUrl'] = source_url
        return result


def copy_source_selection(root, source_folder, target_folder):
    index = read_source_index(root)
    source_prefix = source_folder.relative_to(root).as_posix() + '/'
    target_prefix = target_folder.relative_to(root).as_posix() + '/'
    for path, saved in list(index.items()):
        if path.startswith(source_prefix):
            index[target_prefix + path[len(source_prefix):]] = saved
    replace_bytes(source_index_path(root), json_bytes(index))
