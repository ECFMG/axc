import tempfile
from pathlib import Path
import unittest
from coding_context import source_payload


class SharedContextTests(unittest.TestCase):
    def test_explicit_pages_share_cap_and_offsets_remain_retrievable(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            text = ''.join(str(n % 10) for n in range(30000))
            (repo / 'source.ts').write_text(text)
            names = {'source.ts'}
            request = '@source/source.ts:13000:12000'
            supplied = {request: 'old excerpt', '@log/repair-01/00.log': 'failure details'}
            snapshot, extra = source_payload(repo, names, names, 12000, supplied)
            self.assertLessEqual(sum(map(len, snapshot.values())) + len(extra[request]), 12000)
            header, body = extra[request].split('\n', 1)
            self.assertEqual(body, text[13000:13000 + len(body)])
            self.assertIn('next_offset=%d' % (13000 + len(body)), header)
            self.assertEqual(extra['@log/repair-01/00.log'], 'failure details')
            self.assertEqual(supplied[request], 'old excerpt')
            self.assertLess(len(body), 12000)

    def test_many_large_requested_pages_cannot_bypass_cap(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            (repo / 'source.ts').write_text('a' * 30000)
            requested = {'@source/source.ts:%d:12000' % n: 'b' * 12000 for n in range(5)}
            snapshot, extra = source_payload(repo, {'source.ts'}, {'source.ts'}, 12000, requested)
            self.assertLessEqual(sum(map(len, snapshot.values())) + sum(map(len, extra.values())), 12000)
