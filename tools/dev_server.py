#!/usr/bin/env python3
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from effect_asset_exporter import effect_asset_path, effect_source_psd_path, export_effect_asset
from export_character_psd_parts import export_character_parts, find_character_psd
from psd_preview_exporter import export_psd_preview


class CrowKnightHandler(SimpleHTTPRequestHandler):
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
        if parsed.path == "/api/psd/refresh":
            self.handle_psd_refresh()
            return
        if parsed.path == "/api/character/refresh":
            self.handle_character_refresh(parsed)
            return
        if parsed.path == "/api/effect/refresh":
            self.handle_effect_refresh(parsed)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/psd/refresh":
            self.handle_psd_upload_refresh()
            return
        if parsed.path == "/api/character/refresh":
            self.handle_character_upload_refresh(parsed)
            return
        if parsed.path == "/api/effect/refresh":
            self.handle_effect_upload_refresh(parsed)
            return
        if parsed.path == "/api/state/default":
            self.handle_default_state_save()
            return
        self.send_json(404, {"error": "Not found"})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def handle_psd_refresh(self, psd_path=None):
        try:
            manifest = export_background_preview(
                psd_path or self.psd_path,
                self.output_path,
                self.manifest_path,
                self.layer_output_dir,
            )
            self.send_json(200, manifest)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_psd_upload_refresh(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty PSD file"})
                return

            filename = self.headers.get("X-Psd-Filename", "uploaded.psd")
            uploaded_name = sanitize_psd_upload_filename(filename)
            target_path = self.psd_path if Path(uploaded_name).suffix.lower() == self.psd_path.suffix.lower() else None
            if target_path is None:
                target_path = self.uploaded_psd_dir / uploaded_name

            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(self.rfile.read(content_length))
            self.handle_psd_refresh(target_path)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

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
            self.default_state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            self.send_json(200, {"ok": True, "path": str(self.default_state_path)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_character_refresh(self, parsed):
        try:
            folder_path = self.character_folder_from_request(parsed)
            psd_path = find_character_psd(folder_path)
            if not psd_path:
                self.send_json(404, {"error": "PSD file not found"})
                return

            exported = export_character_parts(psd_path, folder_path)
            self.send_json(200, {"ok": True, "folder": folder_path.name, "psd": psd_path.name, "exported": exported, "updatedAt": int(psd_path.stat().st_mtime * 1000)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_character_upload_refresh(self, parsed):
        try:
            folder_path = self.character_folder_from_request(parsed)
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty PSD file"})
                return

            filename = self.headers.get("X-Character-Filename", f"{folder_path.name}.psd")
            uploaded_name = sanitize_psd_filename(filename)
            target_path = find_character_psd(folder_path) or folder_path / uploaded_name
            target_path.write_bytes(self.rfile.read(content_length))
            exported = export_character_parts(target_path, folder_path)
            self.send_json(200, {"ok": True, "folder": folder_path.name, "psd": target_path.name, "exported": exported, "updatedAt": int(target_path.stat().st_mtime * 1000)})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_effect_refresh(self, parsed):
        try:
            asset = effect_asset_from_request(parsed)
            source_path = effect_source_psd_path(self.root_dir, asset)
            if not source_path.exists():
                self.send_json(404, {"error": "Effect PSD file not found"})
                return

            output_path = effect_asset_path(self.root_dir, asset)
            result = export_effect_asset(source_path, output_path)
            result["asset"] = asset
            self.send_json(200, result)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_effect_upload_refresh(self, parsed):
        try:
            asset = effect_asset_from_request(parsed)
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty effect file"})
                return

            filename = self.headers.get("X-Effect-Filename", f"{asset}.psd")
            output_path = effect_asset_path(self.root_dir, asset)
            source_path = effect_source_psd_path(self.root_dir, asset)
            if not sanitize_effect_filename(filename).lower().endswith(".psd"):
                source_path = output_path.with_suffix(".upload")

            source_path.write_bytes(self.rfile.read(content_length))
            result = export_effect_asset(source_path, output_path)
            result["asset"] = asset
            self.send_json(200, result)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def character_folder_from_request(self, parsed):
        folder = ""
        for item in parsed.query.split("&"):
            key, _, value = item.partition("=")
            if key == "folder":
                folder = unquote(value)
                break
        safe = sanitize_character_folder(folder)
        folder_path = (self.characters_dir / safe).resolve()
        if not folder_path.is_dir() or self.characters_dir not in folder_path.parents:
            raise RuntimeError("Invalid character folder")
        return folder_path

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def create_server(args):
    root = Path(args.root).resolve()
    handler = partial(CrowKnightHandler, directory=str(root))
    CrowKnightHandler.psd_path = (root / args.psd).resolve()
    CrowKnightHandler.output_path = (root / args.output).resolve()
    CrowKnightHandler.manifest_path = (root / args.manifest).resolve()
    CrowKnightHandler.layer_output_dir = (root / args.layer_output_dir).resolve()
    CrowKnightHandler.default_state_path = (root / args.default_state).resolve()
    CrowKnightHandler.uploaded_psd_dir = (root / args.uploaded_psd_dir).resolve()
    CrowKnightHandler.characters_dir = (root / args.characters_dir).resolve()
    CrowKnightHandler.root_dir = root

    for port in range(args.port, args.port + args.port_retries + 1):
        try:
            return ThreadingHTTPServer((args.host, port), handler), port
        except OSError:
            if port == args.port + args.port_retries:
                raise
    raise RuntimeError("No available port found")


def sanitize_psd_upload_filename(filename):
    name = Path(unquote(filename)).name.strip() or "uploaded.psd"
    safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in name)
    if not safe.lower().endswith(".psd"):
        safe = f"{safe}.psd"
    return safe or "uploaded.psd"


def sanitize_psd_filename(filename):
    name = Path(unquote(filename)).name.strip() or "character.psd"
    safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in name)
    if not safe.lower().endswith(".psd"):
        safe = f"{safe}.psd"
    return safe or "character.psd"


def sanitize_character_folder(folder):
    safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in folder)
    if not safe:
        raise RuntimeError("Character folder is required")
    return safe


def sanitize_effect_filename(filename):
    name = Path(unquote(filename)).name.strip() or "effect.psd"
    return "".join(char if char.isalnum() or char in "._-" else "_" for char in name) or "effect.psd"


def effect_asset_from_request(parsed):
    asset = ""
    for item in parsed.query.split("&"):
        key, _, value = item.partition("=")
        if key == "asset":
            asset = unquote(value)
            break
    if asset not in {"slash1", "slash2", "slash3"}:
        raise RuntimeError("Invalid effect asset")
    return asset


def export_background_preview(source_path, output_path, manifest_path, layer_output_dir):
    suffix = source_path.suffix.lower()
    if suffix != ".psd":
        raise RuntimeError("Background source must be a PSD file")
    return export_psd_preview(source_path, output_path.with_suffix(".webp"), manifest_path, layer_output_dir)


def main():
    parser = argparse.ArgumentParser(description="Serve Crow Knight with local PSD refresh API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--port-retries", type=int, default=20)
    parser.add_argument("--root", default=".")
    parser.add_argument("--psd", default="assets/backgrounds/background_01.psd")
    parser.add_argument("--output", default="runtime/background-preview.webp")
    parser.add_argument("--manifest", default="runtime/background-preview.json")
    parser.add_argument("--layer-output-dir", default="runtime/background-layers")
    parser.add_argument("--default-state", default="runtime/project-default-state.json")
    parser.add_argument("--uploaded-psd-dir", default="runtime/uploaded-psds")
    parser.add_argument("--characters-dir", default="assets/characters")
    args = parser.parse_args()

    server, port = create_server(args)
    print(f"Serving Crow Knight at http://{args.host}:{port}/setting.html", flush=True)
    print("PSD refresh API: /api/psd/refresh", flush=True)
    print("Character PSD refresh API: /api/character/refresh", flush=True)
    print("Effect asset refresh API: /api/effect/refresh", flush=True)
    print("Project default state API: /api/state/default", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
