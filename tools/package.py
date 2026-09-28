"""Build runtime, clean source, and Mac handoff ZIPs from explicit file lists."""
from pathlib import Path
import hashlib, json, struct, zlib, zipfile

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'

def chunk(tag, data):
    return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)

def icon(size):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            a, b = x / size, y / size
            color = (31, 86, 64, 255)
            if ((.20 < a < .80 and (.23 < b < .29 or .71 < b < .77)) or (.23 < b < .77 and (.20 < a < .26 or .74 < a < .80))):
                color = (242, 249, 239, 255)
            if (a-.63)**2+(b-.40)**2 < .045**2:
                color = (239, 208, 113, 255)
            if .28 < a < .71 and .46 < b < .68 and b > .46 + abs(a-.44)*.85:
                color = (242, 249, 239, 255)
            rows.extend(color)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B',size,size,8,6,0,0,0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')

for size in (16,48,128):
    (EXT / f'icon{size}.png').write_bytes(icon(size))
manifest = json.loads((EXT/'manifest.json').read_text(encoding='utf-8'))
runtime_names = [manifest['background']['service_worker'], *manifest['icons'].values(), 'manifest.json','panel.html','panel.js','panel.css','core.js','workflow.js','dedup.js','thread.js','permissions.js','i18n.js']
for name in runtime_names:
    assert (EXT/name).is_file(), name
dist=ROOT/'dist'
dist.mkdir(exist_ok=True)
version=manifest['version']
runtime=dist/f'forum-image-collector-v{version}.zip'
source=dist/f'forum-image-collector-source-v{version}.zip'
handoff=dist/f'forum-image-collector-mac-handoff-v{version}.zip'
root_files=['README.en.md','README.md','LICENSE','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','AGENTS.md','package.json','package-lock.json','.gitignore','.gitattributes','.nvmrc']
source_names = root_files + ['extension/'+name for name in sorted(set(runtime_names))] + [
    'tests/public-check.test.js','tests/i18n.test.js','tests/language-panel.test.js','tests/test_package.py','tests/test_release.py','tests/filter-panel.test.js','tests/retry-panel.test.js','tests/workflow.test.js','tests/thread.test.js','tests/thread-panel.test.js',
    'tests/selection-panel.test.js','tests/public.test.js','tests/permissions.test.js',
    'tests/panel.test.js',
    'tests/dedup-panel.test.js','tests/core.test.js','tests/concurrency-panel.test.js',
    'tests/background.test.js','tests/access-panel.test.js',
    'tools/package.py','tools/mac-check.sh','tools/check.mjs',
    'docs/PUBLISHING.md','docs/PRIVACY.md','docs/MAC_HANDOFF.md',
    'docs/RELEASE_NOTES.md','docs/TROUBLESHOOTING.md','docs/SMOKE_TEST.md','docs/images/preview.png','docs/images/preview-en.png','docs/ARCHITECTURE.md','docs/ADAPTERS.md','docs/VALIDATION.md',
    '.github/pull_request_template.md','.github/workflows/ci.yml',
    '.github/ISSUE_TEMPLATE/bug_report.md','.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/workflows/release.yml','.github/dependabot.yml',
]
source_files=[ROOT/name for name in source_names]
for path in source_files:
    assert path.is_file() and not path.is_symlink(), path
def add_file(archive, path, name):
    # Stable metadata makes identical source bytes reproducible on this toolchain.
    info = zipfile.ZipInfo(str(name), date_time=(2020, 1, 1, 0, 0, 0))
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, path.read_bytes(), compresslevel=9)

with zipfile.ZipFile(runtime,'w',zipfile.ZIP_DEFLATED) as z:
    for name in sorted(set(runtime_names)):add_file(z,EXT/name,'extension/'+name)
    for name in ('README.md','README.en.md','LICENSE','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','docs/ARCHITECTURE.md','docs/RELEASE_NOTES.md','docs/PRIVACY.md','docs/ADAPTERS.md','docs/TROUBLESHOOTING.md','docs/SMOKE_TEST.md','docs/VALIDATION.md','docs/PUBLISHING.md','docs/images/preview.png','docs/images/preview-en.png'):add_file(z,ROOT/name,name)
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
    for path in sorted(source_files):add_file(z,path,'forum-image-collector/'+path.relative_to(ROOT).as_posix())
with zipfile.ZipFile(handoff,'w',zipfile.ZIP_DEFLATED) as z:
    add_file(z,ROOT/'docs/MAC_HANDOFF.md','START_HERE.md')
    for path in sorted(source_files):add_file(z,path,'forum-image-collector/'+path.relative_to(ROOT).as_posix())
    add_file(z,runtime,'install/'+runtime.name)
for archive in (runtime,source,handoff):
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert all(not name.startswith('/') and '..' not in name.split('/') for name in z.namelist())
        assert all(not any(part in ('.git','node_modules','preview','__pycache__') for part in name.split('/')) for name in z.namelist())
    print(archive.name,archive.stat().st_size,'bytes')
(dist/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in (runtime,source,handoff)),encoding='utf-8')
