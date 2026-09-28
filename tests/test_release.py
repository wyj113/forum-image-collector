"""Execute the release shell against fake external CLI boundaries; never publish."""
import os
from pathlib import Path
import shutil
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipIf(os.name == 'nt' or not shutil.which('bash'),
                 'Release shell runs on Ubuntu; exercise it on POSIX hosts')
class ReleaseTests(unittest.TestCase):
    def test_drafts_tags_and_lookup_failures_block_creation(self):
        workflow = (ROOT / '.github/workflows/release.yml').read_text()
        script = textwrap.dedent(workflow.split('        run: |\n', 1)[1])
        boundaries = r'''
node() { printf '2.1.0\n'; }
git() { [ "$EXISTING_TAG" = yes ]; }
gh() {
  if [ "$1" = api ]; then
    [ "$LOOKUP_FAIL" = no ] || return 7
    printf '%s\n' "$RELEASE_TAGS"
  elif [ "$1" = release ] && [ "$2" = create ]; then
    printf 'CREATED'
    printf ' <%s>' "$@"
    printf '\n'
  else
    return 9
  fi
}
'''
        cases = [
            ('new version', 'no', 'no', 'v2.0.0', True),
            ('existing tag', 'yes', 'no', '', False),
            ('existing draft', 'no', 'no', 'v2.0.0\nv2.1.0\nv1.0.0', False),
            ('lookup unavailable', 'no', 'yes', '', False),
            ('similar tag is distinct', 'no', 'no', 'v2.1.0-rc1', True),
        ]
        for name, tag, failed, releases, allowed in cases:
            with self.subTest(name=name):
                env = dict(os.environ, EXISTING_TAG=tag, LOOKUP_FAIL=failed,
                           RELEASE_TAGS=releases, GITHUB_SHA='tested-commit')
                result = subprocess.run(['bash', '-euo', 'pipefail', '-c', boundaries+script],
                                        cwd=ROOT, env=env, capture_output=True, text=True)
                self.assertEqual(result.returncode == 0, allowed, result.stdout+result.stderr)
                self.assertEqual('CREATED' in result.stdout, allowed)
                if allowed:
                    self.assertIn('<--draft>', result.stdout)
                    self.assertIn('<--target> <tested-commit>', result.stdout)
                    self.assertIn('<--notes-file> <docs/RELEASE_NOTES.md>', result.stdout)
                    self.assertIn('<dist/forum-image-collector-v2.1.0.zip>', result.stdout)


if __name__ == '__main__':
    unittest.main()
