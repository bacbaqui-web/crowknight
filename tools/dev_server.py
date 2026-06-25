#!/usr/bin/env python3
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from clip_preview_watcher import export_preview
from psd_preview_exporter import export_psd_preview


class CrowKnightHandler(SimpleHTTPRequestHandler):
    clip_path = None
    output_path = None
    manifest_path = None
    layer_output_dir = None
    default_state_path = None
    uploaded_clip_dir = None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/clip/refresh":
            self.handle_clip_refresh()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/clip/refresh":
            self.handle_clip_upload_refresh()
            return
        if parsed.path == "/api/state/default":
            self.handle_default_state_save()
            return
        self.send_json(404, {"error": "Not found"})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def handle_clip_refresh(self, clip_path=None):
        try:
            manifest = export_background_preview(
                clip_path or self.clip_path,
                self.output_path,
                self.manifest_path,
                self.layer_output_dir,
            )
            self.send_json(200, manifest)
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_clip_upload_refresh(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.send_json(400, {"error": "Empty clip file"})
                return

            filename = self.headers.get("X-Clip-Filename", "uploaded.psd")
            uploaded_name = sanitize_clip_filename(filename)
            target_path = self.clip_path if Path(uploaded_name).suffix.lower() == self.clip_path.suffix.lower() else None
            if target_path is None:
                target_path = self.uploaded_clip_dir / uploaded_name

            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(self.rfile.read(content_length))
            self.handle_clip_refresh(target_path)
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
    CrowKnightHandler.clip_path = (root / args.clip).resolve()
    CrowKnightHandler.output_path = (root / args.output).resolve()
    CrowKnightHandler.manifest_path = (root / args.manifest).resolve()
    CrowKnightHandler.layer_output_dir = (root / args.layer_output_dir).resolve()
    CrowKnightHandler.default_state_path = (root / args.default_state).resolve()
    CrowKnightHandler.uploaded_clip_dir = (root / args.uploaded_clip_dir).resolve()

    for port in range(args.port, args.port + args.port_retries + 1):
        try:
            return ThreadingHTTPServer((args.host, port), handler), port
        except OSError:
            if port == args.port + args.port_retries:
                raise
    raise RuntimeError("No available port found")


def sanitize_clip_filename(filename):
    name = Path(unquote(filename)).name.strip() or "uploaded.psd"
    safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in name)
    if not safe.lower().endswith((".clip", ".psd")):
        safe = f"{safe}.psd"
    return safe or "uploaded.psd"


def export_background_preview(source_path, output_path, manifest_path, layer_output_dir):
    suffix = source_path.suffix.lower()
    if suffix == ".psd":
        return export_psd_preview(source_path, output_path.with_suffix(".webp"), manifest_path, layer_output_dir)
    return export_preview(source_path, output_path, manifest_path, layer_output_dir=layer_output_dir)


def main():
    parser = argparse.ArgumentParser(description="Serve Crow Knight with local CLIP refresh API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--port-retries", type=int, default=20)
    parser.add_argument("--root", default=".")
    parser.add_argument("--clip", default="assets/backgrounds/background_01.psd")
    parser.add_argument("--output", default="runtime/background-preview.webp")
    parser.add_argument("--manifest", default="runtime/background-preview.json")
    parser.add_argument("--layer-output-dir", default="runtime/background-layers")
    parser.add_argument("--default-state", default="runtime/project-default-state.json")
    parser.add_argument("--uploaded-clip-dir", default="runtime/uploaded-clips")
    args = parser.parse_args()

    server, port = create_server(args)
    print(f"Serving Crow Knight at http://{args.host}:{port}/setting.html", flush=True)
    print("CLIP refresh API: /api/clip/refresh", flush=True)
    print("Project default state API: /api/state/default", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
