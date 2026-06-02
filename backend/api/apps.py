import os
import sys
import threading
import time
import urllib.request
from django.apps import AppConfig


def self_ping():
    # Wait for the web server process to completely boot
    time.sleep(30)
    url = "https://simply-useful-backend.onrender.com/api/v1/health"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    }
    while True:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response:
                response.read()
        except Exception:
            # Gracefully ignore network glitches or boot delays
            pass
        time.sleep(600)  # Ping every 10 minutes


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        import api.signals

        # Spawn the daemon keep-warm thread in production or if explicitly enabled
        if os.environ.get('RENDER') == 'true' or os.environ.get('KEEP_WARM') == 'true':
            # Do not run when executing common administrative/management commands
            admin_commands = {'migrate', 'makemigrations', 'collectstatic', 'check', 'shell', 'seed_kamla'}
            if not any(arg in sys.argv for arg in admin_commands):
                # Under local development reload, run only in the active server worker process
                if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
                    return

                t = threading.Thread(target=self_ping, daemon=True)
                t.start()
