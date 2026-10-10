"""Local/CI disposable-container drill. Never uses production secrets or contacts."""

import argparse
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
import uuid

from cryptography.fernet import Fernet


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    image = parser.parse_args().image
    if not re.fullmatch(r"sinyolanda-(?:loyalty-intake|intake-ci):[A-Za-z0-9_.-]+", image):
        parser.error("An explicit local candidate image is required")
    marker = "sy-intake-smoke-" + uuid.uuid4().hex
    volume = marker + "-data"
    env = {**os.environ,
           "SY_INTAKE_ENCRYPTION_KEY": Fernet.generate_key().decode(),
           "SY_INTAKE_TURNSTILE_SECRET": "synthetic-container-smoke-not-a-valid-secret"}

    def docker(*args: str, check: bool = True) -> str:
        result = subprocess.run(["docker", *args], env=env, capture_output=True, text=True, timeout=60)
        if check and result.returncode:
            # Docker may echo environment/configuration. Never expose its raw diagnostic.
            raise RuntimeError("Disposable container check failed")
        return result.stdout.strip()

    stage = "missing-config"
    try:
        missing = subprocess.run(["docker", "run", "--rm", "--network", "none", image],
                                 capture_output=True, text=True, timeout=30)
        assert missing.returncode == 1
        assert missing.stderr.strip() == "Production intake startup failed"
        assert not missing.stdout.strip()
        stage = "volume"
        docker("volume", "create", volume)
        stage = "startup"
        docker("run", "--detach", "--name", marker, "--read-only", "--cap-drop=ALL",
               "--security-opt=no-new-privileges", "--pids-limit=128", "--memory=256m",
               "--tmpfs", "/tmp:rw,noexec,nosuid,size=16777216,mode=1777",
               "--publish", "127.0.0.1::8000", "--mount", f"type=volume,source={volume},target=/data",
               "--env", "SY_INTAKE_ENCRYPTION_KEY", "--env", "SY_INTAKE_TURNSTILE_SECRET",
               "--env", "SY_INTAKE_DATABASE=/data/registrations.sqlite",
               "--env", "SY_INTAKE_MODE=production", image)
        def address() -> str:
            bindings = json.loads(docker("inspect", "--format", '{{json .NetworkSettings.Ports}}', marker))
            binding = bindings["8000/tcp"][0]
            assert binding["HostIp"] == "127.0.0.1"
            return "http://127.0.0.1:" + binding["HostPort"]

        url = address()

        def ready() -> None:
            for _ in range(80):
                try:
                    with urllib.request.urlopen(url + "/health", timeout=1) as response:
                        if json.load(response) == {"status": "ok", "capture": "enabled"}:
                            return
                except (OSError, ValueError, urllib.error.URLError):
                    pass
                time.sleep(0.2)
            raise RuntimeError("Disposable runtime did not become ready")

        ready()
        stage = "private-endpoints"
        assert docker("exec", marker, "id", "-u") == "10001"
        for path in ("/docs", "/openapi.json", "/admin", "/contacts"):
            try:
                urllib.request.urlopen(url + path, timeout=2)
                raise AssertionError("Private endpoint was exposed")
            except urllib.error.HTTPError as exc:
                assert exc.code == 404
        req = urllib.request.Request(url + "/api/registrations", data=b"{}", method="POST",
                                     headers={"Content-Type": "application/json", "Origin": "https://wrong.example"})
        try:
            urllib.request.urlopen(req, timeout=2)
            raise AssertionError("Unexpected origin accepted")
        except urllib.error.HTTPError as exc:
            assert exc.code == 403
            assert json.load(exc) == {"code": "unavailable"}

        # Fixture goes directly into the private Store, not through a simulated bot success.
        fixture = """
from sy_intake.settings import Settings
from sy_intake.storage import Store
s=Settings.from_env(); store=Store(s.database_path,s.encryption_key); store.initialize()
store.save('container-synthetic-fixture', {'full_name':'Synthetic Container Guest','email':'container@example.test',
 'phone':None,'birthday_day_month':'09/10','locale':'es','branch':'el-paso','registration_consent':True,
 'email_marketing_consent':False,'consent_version':'sy-el-paso-registration-v2-2026-10-09',
 'source':{'utm_source':'qr','utm_medium':'offline','utm_campaign':'loyalty_el_paso','utm_content':'registro_v2'}})
assert b'container@example.test' not in s.database_path.read_bytes()
"""
        stage = "synthetic-write"
        docker("exec", marker, "python", "-c", fixture)
        stage = "backup"
        docker("exec", marker, "python", "-m", "sy_intake.operations", "backup", "--destination-dir", "/data/smoke-backup")
        stage = "restart"
        docker("restart", marker)
        # Docker can reassign an automatically published local port on restart.
        url = address()
        ready()
        stage = "status"
        result = json.loads(docker("exec", marker, "python", "-m", "sy_intake.operations", "status"))
        assert result["ok"] is True and result["counts"]["registrations"] == 1
        stage = "verify"
        docker("exec", marker, "python", "-m", "sy_intake.operations", "verify", "--snapshot", "/data/smoke-backup/intake.sqlite3")
        stage = "restore"
        docker("exec", marker, "python", "-m", "sy_intake.operations", "restore", "--snapshot", "/data/smoke-backup/intake.sqlite3", "--destination-dir", "/data/smoke-restored")
        print("Synthetic container: non-root startup, private API, durable restart and encrypted restore passed.")
        return 0
    except (RuntimeError, AssertionError, KeyError, ValueError, subprocess.TimeoutExpired):
        # Stage labels are fixed; never print arguments, environment or raw errors.
        print("Disposable smoke failed at: " + stage)
        if stage == "restart":
            print("Disposable runtime state: " + docker("inspect", "--format", "{{.State.Status}} {{.State.ExitCode}}", marker, check=False))
        raise
    finally:
        # These exact UUID-named resources were created here and contain only the fixture above.
        docker("rm", "--force", marker, check=False)
        docker("volume", "rm", volume, check=False)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, AssertionError, KeyError, ValueError, subprocess.TimeoutExpired):
        raise SystemExit("Disposable container smoke failed; no production resources were used.") from None
