"""Exercise download integrity locally without network access or real votes."""
import hashlib
from pathlib import Path
import unittest
from uuid import uuid4
from build_snapshot import download

TEST_TEMP = Path(__file__).resolve().parents[2]/'.qa'
TEST_TEMP.mkdir(exist_ok=True)


class DownloadTests(unittest.TestCase):
    def setUp(self):
        self.prefix = 'arena-test-'+uuid4().hex
        self.source = TEST_TEMP/(self.prefix+'-source')
        self.target = TEST_TEMP/(self.prefix+'-target.parquet')

    def tearDown(self):
        for path in [self.source, self.target, self.target.with_suffix('.parquet.part')]:
            if path.exists(): path.unlink()

    def test_download_hash_and_cache(self):
        source, target = self.source, self.target
        source.write_bytes(b'synthetic test metadata')
        expected = hashlib.sha256(source.read_bytes()).hexdigest()
        download(source.as_uri(), target, expected)
        self.assertEqual(target.read_bytes(), b'synthetic test metadata')
        # A valid cached file must not require the source again.
        source.unlink()
        download(source.as_uri(), target, expected)
        self.assertTrue(target.exists())

    def test_bad_hash_preserves_existing_output_and_removes_partial(self):
        source, target = self.source, self.target
        source.write_bytes(b'bad'); target.write_bytes(b'previous')
        with self.assertRaises(ValueError): download(source.as_uri(), target, '0'*64)
        self.assertEqual(target.read_bytes(), b'previous')
        self.assertFalse(target.with_suffix('.parquet.part').exists())

    def test_missing_expected_hash_rejects_before_downloading(self):
        self.source.write_bytes(b'synthetic metadata')
        with self.assertRaises(ValueError): download(self.source.as_uri(), self.target)
        self.assertFalse(self.target.exists())


if __name__ == '__main__': unittest.main()
