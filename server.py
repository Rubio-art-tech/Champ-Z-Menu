#!/usr/bin/env python3
"""Dev server for Spice Route Kitchen.

Serves the static site and keeps one shared copy of the menu and order data, so
the admin console and the customer storefront stay in sync even when they are
open in different windows or different browsers.

    python server.py            # http://127.0.0.1:5173
    python server.py --port 8080

Shared data lives in .data/store.json next to this file. Without this server
(e.g. plain `python -m http.server`) both apps fall back to the browser's own
storage, which still syncs between tabs of the same browser.
"""

import argparse
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / ".data"
STATE_FILE = DATA_DIR / "store.json"
LOCK = threading.Lock()
MAX_BODY = 4 * 1024 * 1024

PORT = 5173


def read_state():
    if not STATE_FILE.exists():
        return {"version": 0, "data": None}
    try:
        payload = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": 0, "data": None}
    if not isinstance(payload, dict):
        return {"version": 0, "data": None}
    version = payload.get("version")
    data = payload.get("data")
    return {
        "version": version if isinstance(version, int) and version >= 0 else 0,
        "data": data if isinstance(data, dict) else None,
    }


def merge_orders(previous, incoming):
    """Keep every order either side knows about; the apps never delete orders."""
    previous = previous if isinstance(previous, list) else []
    incoming = incoming if isinstance(incoming, list) else []
    known = {order.get("id") for order in incoming if isinstance(order, dict)}
    extra = [order for order in previous if isinstance(order, dict) and order.get("id") not in known]
    return incoming + extra


def save_state(data):
    with LOCK:
        current = read_state()
        merged = dict(data)
        previous = (current.get("data") or {}).get("orders")
        merged["orders"] = merge_orders(previous, data.get("orders"))
        version = current["version"] + 1
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        temp = STATE_FILE.with_name("store.tmp")
        temp.write_text(
            json.dumps({"version": version, "data": merged}, ensure_ascii=False),
            encoding="utf-8",
        )
        temp.replace(STATE_FILE)
        return {"version": version, "data": merged}


def allowed_origin(origin):
    if not origin:
        return True
    host = (urlsplit(origin).hostname or "").lower()
    return host in {"127.0.0.1", "localhost", "::1"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Always serve the latest files while developing.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/api/state":
            self.send_json(read_state())
            return
        if self.blocked():
            self.send_error(404)
            return
        super().do_GET()

    def do_PUT(self):
        if self.path.split("?")[0] != "/api/state":
            self.send_error(404)
            return
        if not allowed_origin(self.headers.get("Origin")):
            self.send_error(403)
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.send_error(413)
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            self.send_error(400)
            return

        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            self.send_error(400)
            return

        self.send_json(save_state(data))

    def blocked(self):
        path = self.path.split("?")[0]
        return path.startswith("/.data") or path.startswith("/.git") or path == "/server.py"

    def send_json(self, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)


def main():
    global PORT
    parser = argparse.ArgumentParser(description="Spice Route dev server")
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    PORT = args.port

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Spice Route running at http://{args.host}:{args.port}/shop.html", flush=True)
    print("Admin console: http://%s:%d/index.html" % (args.host, args.port), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
