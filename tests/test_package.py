"""Exercise release ZIPs without browser or network access."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class PackageTests(unittest.TestCase):
    def test_archives_are_reproducible_and_source_is_self_contained(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'project'
            shutil.copytree(ROOT, root, ignore=shutil.ignore_patterns(
                '.git', 'dist', 'node_modules', 'preview', '__pycache__'))
            (root / '.env').write_text('PRIVATE_FIXTURE=do-not-ship')
            (root / 'unrelated.txt').write_text('do-not-ship')

            def build():
                subprocess.run([sys.executable, 'tools/package.py'], cwd=root,
                               check=True, capture_output=True, text=True)
                return {p.name: p.read_bytes() for p in (root / 'dist').glob('*.zip')}

            first = build()
            for path in root.rglob('*'):
                if path.is_file() and 'dist' not in path.parts:
                    os.utime(path, (1600000000, 1600000000))
            second = build()
            self.assertEqual({k: hashlib.sha256(v).hexdigest() for k,v in first.items()},
                             {k: hashlib.sha256(v).hexdigest() for k,v in second.items()},
                             'filesystem modification times must not change release bytes')
            version = json.loads((root / 'package.json').read_text())['version']
            with zipfile.ZipFile(root / 'dist' / f'forum-image-collector-source-v{version}.zip') as archive:
                names = archive.namelist()
                self.assertIn('forum-image-collector/tests/test_package.py', names)
                self.assertIn('forum-image-collector/tests/filter-panel.test.js', names)
                self.assertIn('forum-image-collector/tests/retry-panel.test.js', names)
                self.assertFalse(any(name.endswith(('.env', 'unrelated.txt')) for name in names))
                archive.extractall(Path(temporary) / 'unpacked')
            rebuilt = Path(temporary) / 'unpacked' / 'forum-image-collector'
            subprocess.run([sys.executable, 'tools/package.py'], cwd=rebuilt,
                           check=True, capture_output=True, text=True)
            self.assertEqual(second, {p.name:p.read_bytes() for p in (rebuilt / 'dist').glob('*.zip')})
            for line in (root / 'dist' / 'SHA256SUMS.txt').read_text().splitlines():
                digest, name = line.split('  ')
                self.assertEqual(digest, hashlib.sha256((root / 'dist' / name).read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
