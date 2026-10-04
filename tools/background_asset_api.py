"""Background PSD conversion in a temporary workspace."""
from asset_source_store import convert_asset
from file_transaction import json_bytes
from psd_preview_exporter import export_psd_preview


class BackgroundAssetApi:
    def refresh_background(self, upload=False):
        body = self.read_request_body() if upload else None

        def convert(source, work, source_url):
            output = work / self.output_path.with_suffix('.webp').name
            manifest_path = work / self.manifest_path.name
            layers = work / 'layers'
            manifest = export_psd_preview(source, output, manifest_path, layers)
            manifest['assetBase'] = './' + self.manifest_path.parent.relative_to(self.root_dir).as_posix()
            manifest['sourceUrl'] = source_url
            manifest_path.write_bytes(json_bytes(manifest))
            outputs = {self.output_path.with_suffix('.webp'): output, self.manifest_path: manifest_path}
            outputs.update({self.layer_output_dir / p.name: p for p in layers.glob('*') if p.is_file()})
            return manifest, outputs

        old_outputs = list(self.layer_output_dir.glob('*.webp')) if self.layer_output_dir.exists() else []
        result = convert_asset(self.root_dir, self.psd_path, convert, body, old_outputs=old_outputs)
        self.send_json(200, result)

    def handle_psd_refresh(self):
        self.refresh_background()

    def handle_psd_upload_refresh(self):
        self.refresh_background(upload=True)
