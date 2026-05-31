"""
Minimal HTTP server for SMS Native Lite.
Serves frontend files and proxies /api requests to FastAPI.
"""
import json
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Optional
import sys


class FrontendHTTPHandler(SimpleHTTPRequestHandler):
    """HTTP handler that serves frontend and proxies API requests."""

    frontend_dir: Optional[Path] = None

    def log_message(self, format, *args):
        """Suppress HTTP server logs."""
        pass

    def do_GET(self):
        """Handle GET requests."""
        # API requests should go through FastAPI (running in main thread or via ASGI)
        if self.path.startswith('/api/'):
            # For now, return 503 - FastAPI will be integrated separately
            self.send_error(503, 'API not available in HTTP mode')
            return

        # Serve index.html for SPA routes
        if self.path in ('/', '/index.html'):
            self.serve_file(self.frontend_dir / 'index.html')
            return

        # Serve static files (assets, css, js, etc)
        filepath = self.frontend_dir / self.path.lstrip('/')
        if filepath.exists() and filepath.is_file():
            self.serve_file(filepath)
            return

        # Fallback to index.html for SPA routing
        if not self.path.startswith('.'):
            self.serve_file(self.frontend_dir / 'index.html')
            return

        self.send_error(404)

    def serve_file(self, filepath: Path):
        """Serve a file with appropriate content type."""
        if not filepath.exists():
            self.send_error(404)
            return

        # Determine content type
        if filepath.suffix == '.html':
            content_type = 'text/html'
        elif filepath.suffix == '.js':
            content_type = 'application/javascript'
        elif filepath.suffix == '.css':
            content_type = 'text/css'
        elif filepath.suffix == '.json':
            content_type = 'application/json'
        elif filepath.suffix == '.png':
            content_type = 'image/png'
        elif filepath.suffix == '.svg':
            content_type = 'image/svg+xml'
        else:
            content_type = 'application/octet-stream'

        try:
            with open(filepath, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))


def start_frontend_server(frontend_dir: Path, port: int = 8765) -> HTTPServer:
    """Start the HTTP server for the frontend."""
    FrontendHTTPHandler.frontend_dir = frontend_dir

    server = HTTPServer(('127.0.0.1', port), FrontendHTTPHandler)
    return server


def run_server_in_thread(frontend_dir: Path, port: int = 8765) -> threading.Thread:
    """Start server in a background thread."""
    server = start_frontend_server(frontend_dir, port)

    def serve():
        server.serve_forever()

    thread = threading.Thread(target=serve, daemon=False)
    thread.start()
    return thread
