#!/usr/bin/env python3
"""Verify the real preview server before exposing a new artifact. No host ports or network."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import uuid


def verify(artifact, config=None):
    artifact = Path(artifact).resolve()
    recipe = Path(__file__).resolve().parent
    config = Path(config or recipe / 'nginx.conf').resolve()
    manifest = json.loads((artifact / 'release.json').read_text())
    public = artifact / 'public'
    assert manifest['audience'] == 'visual-preview' and not manifest['officialPublicationEnabled']
    files = {str(p.relative_to(public)) for p in public.rglob('*') if p.is_file()}
    assert files == set(manifest['hashes'])
    assert not any(p.is_symlink() for p in public.rglob('*'))
    for name, digest in manifest['hashes'].items():
        assert re.fullmatch(r'[A-Za-z0-9_./-]+', name) and '..' not in Path(name).parts
        assert hashlib.sha256((public / name).read_bytes()).hexdigest() == digest
    image = re.search(r'^    image: (nginx@sha256:[a-f0-9]{64})$', (recipe / 'compose.yml').read_text(), re.M).group(1)
    name = 'sy-reservas-preflight-' + uuid.uuid4().hex[:12]
    container = None
    try:
        container = subprocess.check_output([
            'docker', 'run', '-d', '--name', name, '--network', 'none', '--read-only',
            '--user', '101:101', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--memory', '64m', '--cpus', '.25', '--pids-limit', '64',
            '--tmpfs', '/var/cache/nginx:mode=1777', '--tmpfs', '/var/run:mode=1777',
            '--tmpfs', '/tmp:mode=1777', '-v', str(public) + ':/usr/share/nginx/html:ro',
            '-v', str(config) + ':/etc/nginx/conf.d/default.conf:ro', image,
        ], text=True).strip()
        for _ in range(30):
            result = subprocess.run(['docker', 'exec', container, 'wget', '-qO-', 'http://127.0.0.1:8080/health'], capture_output=True)
            if result.returncode == 0 and result.stdout == b'ok':
                break
            time.sleep(.2)
        else:
            raise RuntimeError('Candidate nginx did not become ready')
        verified = 0
        for path, digest in manifest['hashes'].items():
            if path == '404.html':
                continue  # Internal error document; verified separately after activation.
            route = 'reservar' if path == 'reservar.html' else path
            result = subprocess.run(['docker', 'exec', container, 'wget', '-qO-', 'http://127.0.0.1:8080/' + route], capture_output=True)
            assert result.returncode == 0 and hashlib.sha256(result.stdout).hexdigest() == digest, 'Candidate cannot serve ' + path
            verified += 1
        return {'commit': manifest['commit'], 'httpHashesVerified': verified, 'publicFileCount': len(files),
                'network': 'none', 'hostPorts': False, 'image': image}
    finally:
        if container:
            subprocess.run(['docker', 'rm', '-f', container], check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact')
    parser.add_argument('--config')
    args = parser.parse_args()
    print(json.dumps(verify(args.artifact, args.config)))
