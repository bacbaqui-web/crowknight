#!/usr/bin/env python3
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from release_snapshot import RELEASE_LOCK, save_beta
from release_publisher import publish_beta

from background_asset_api import BackgroundAssetApi
from character_asset_api import CharacterAssetApi
from effect_asset_api import EffectAssetApi
from file_transaction import recover_file_transactions
from release_snapshot import write_json_atomic


class CrowKnightHandler(BackgroundAssetApi, CharacterAssetApi, EffectAssetApi, SimpleHTTPRequestHandler):
    psd_path = None
    output_path = None
    manifest_path = None
    layer_output_dir = None
    default_state_path = None
    uploaded_psd_dir = None
    characters_dir = None
    root_dir = None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/") and not self.validate_local_request():
            return
        if parsed.path == "/api/psd/refresh":
            self.run_asset_route(self.handle_psd_refresh)
            return
        if parsed.path == "/api/character/refresh":
            self.run_asset_route(self.handle_character_refresh, parsed)
            return
        if parsed.path == "/api/effect/refresh":
            self.run_asset_route(self.handle_effect_refresh, parsed)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/") and not self.validate_local_request():
            return
        if parsed.path in {"/api/project/save", "/api/project/publish"}:
            self.handle_project_release(parsed.path)
            return
        if parsed.path == "/api/psd/refresh":
            self.run_asset_route(self.handle_psd_upload_refresh)
            return
        if parsed.path == "/api/character/refresh":
            self.run_asset_route(self.handle_character_upload_refresh, parsed)
            return
        if parsed.path == "/api/character/create":
            self.run_asset_route(self.handle_character_create, parsed)
            return
        if parsed.path == "/api/character/move":
            self.run_asset_route(self.handle_character_move, parsed)
            return
        if parsed.path == "/api/character/copy":
            self.run_asset_route(self.handle_character_copy, parsed)
            return
        if parsed.path == "/api/character/delete":
            self.run_asset_route(self.handle_character_delete, parsed)
            return
        if parsed.path == "/api/effect/refresh":
            self.run_asset_route(self.handle_effect_upload_refresh, parsed)
            return
        if parsed.path == "/api/effect/upload":
            self.run_asset_route(self.handle_effect_local_upload, parsed)
            return
        if parsed.path == "/api/state/default":
            self.handle_default_state_save()
            return
        if parsed.path == "/api/characters/index":
            self.handle_character_index_save()
            return
        self.send_json(404, {"error": "Not found"})

    def handle_project_release(self, route):
        try:
            payload = json.loads(self.read_request_body().decode("utf-8"))
            with RELEASE_LOCK:
                if route == "/api/project/save":
                    state = save_beta(self.root_dir, payload)
                    self.send_json(200, {"ok": True, "revision": state["revision"]})
                else:
                    self.send_json(200, publish_beta(self.root_dir, payload.get("revision")))
        except (ValueError, FileNotFoundError) as exc:
            self.send_json(409, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


    def handle_default_state_save(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty request body"})
                return

            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
            if not isinstance(payload, dict):
                self.send_json(400, {"error": "State must be a JSON object"})
                return

            self.default_state_path.parent.mkdir(parents=True, exist_ok=True)
            write_json_atomic(self.default_state_path, payload)
            self.send_json(200, {"ok": True, "path": str(self.default_state_path)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_character_index_save(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty request body"})
                return

            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
            characters = payload.get("characters") if isinstance(payload, dict) else None
            if not isinstance(characters, list):
                self.send_json(400, {"error": "Character index must contain a characters array"})
                return

            index_path = self.characters_dir / "index.json"
            write_json_atomic(index_path, payload)
            self.send_json(200, {"ok": True, "path": str(index_path), "count": len(characters)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})


    def validate_local_request(self):
        origin = self.headers.get('Origin')
        expected = 'http://' + self.headers.get('Host', '')
        host = urlparse(expected).hostname
        if host not in {'localhost', '127.0.0.1', '::1'} or self.client_address[0] not in {'127.0.0.1', '::1'} or (origin and origin != expected) or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            self.send_json(403, {'ok': False, 'error': '로컬 제작툴에서만 사용할 수 있습니다.'})
            return False
        if self.command == 'POST':
            try:
                size = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                size = -1
            limit = 128 * 1024 * 1024 if '/psd/' in self.path or '/character/' in self.path or '/effect/' in self.path else 32 * 1024 * 1024
            if size < 0 or size > limit or self.headers.get('Transfer-Encoding'):
                self.send_json(413, {'ok': False, 'error': '요청 데이터 크기가 올바르지 않습니다.'})
                return False
        return True

    def read_request_body(self):
        length = int(self.headers.get('Content-Length', '0'))
        if length <= 0:
            raise ValueError('Empty request body')
        body = self.rfile.read(length)
        if len(body) != length:
            raise ValueError('Incomplete request body')
        return body

    def run_asset_route(self, handler, parsed=None):
        try:
            with RELEASE_LOCK:
                handler(parsed) if parsed is not None else handler()
        except (ValueError, FileNotFoundError) as exc:
            self.send_json(400, {'ok': False, 'error': str(exc)})
        except Exception as exc:
            self.send_json(500, {'ok': False, 'error': str(exc)})

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def create_server(args):
    root = Path(args.root).resolve()
    configured = type("ConfiguredCrowKnightHandler", (CrowKnightHandler,), {})
    configured.psd_path = (root / args.psd).resolve()
    configured.output_path = (root / args.output).resolve()
    configured.manifest_path = (root / args.manifest).resolve()
    configured.layer_output_dir = (root / args.layer_output_dir).resolve()
    configured.default_state_path = (root / args.default_state).resolve()
    configured.uploaded_psd_dir = (root / args.uploaded_psd_dir).resolve()
    configured.characters_dir = (root / args.characters_dir).resolve()
    configured.root_dir = root

    recover_file_transactions(root)
    handler = partial(configured, directory=str(root))

    for port in range(args.port, args.port + args.port_retries + 1):
        try:
            return ThreadingHTTPServer((args.host, port), handler), port
        except OSError:
            if port == args.port + args.port_retries:
                raise
    raise RuntimeError("No available port found")


def main():
    parser = argparse.ArgumentParser(description="Serve Crow Knight with local PSD refresh API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--port-retries", type=int, default=20)
    parser.add_argument("--root", default=".")
    parser.add_argument("--psd", default="assets/backgrounds/background_01.psd")
    parser.add_argument("--output", default="assets/backgrounds/current/background-preview.webp")
    parser.add_argument("--manifest", default="assets/backgrounds/current/background-preview.json")
    parser.add_argument("--layer-output-dir", default="assets/backgrounds/current/layers")
    parser.add_argument("--default-state", default="runtime/project-default-state.json")
    parser.add_argument("--uploaded-psd-dir", default="assets/backgrounds/uploaded-psds")
    parser.add_argument("--characters-dir", default="assets/characters")
    args = parser.parse_args()

    server, port = create_server(args)
    print(f"Serving Crow Knight at http://{args.host}:{port}/setting.html", flush=True)
    print("PSD refresh API: /api/psd/refresh", flush=True)
    print("Character PSD refresh API: /api/character/refresh", flush=True)
    print("Effect asset refresh API: /api/effect/refresh", flush=True)
    print("Effect asset upload API: /api/effect/upload", flush=True)
    print("Project default state API: /api/state/default", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
