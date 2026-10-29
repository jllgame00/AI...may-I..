"""Synthetic data only; never write these results into the web snapshot."""
import unittest
import math
from compute import prepare_votes, compute_snapshot


def votes(a, b, wins, losses, ties=0, start=0):
    outcomes = ['model_a'] * wins + ['model_b'] * losses + ['tie'] * ties
    return [dict(id=f'{a}-{b}-{start+i}', model_a=a, model_b=b, winner=w,
                 evaluation_session_id=f'{a}-{b}-{start+i}', evaluation_order=0,
                 timestamp='2025-05-01T00:00:00Z') for i, w in enumerate(outcomes)]


class CalculationTests(unittest.TestCase):
    def test_two_model_mle_and_sandwich_interval(self):
        result = compute_snapshot(votes('A', 'B', 75, 25), min_votes=100)
        rows = result['components'][0]['models']
        # log odds log(3); sum-zero means each beta is +/- log(3)/2.
        expected = 1000 + 200 * math.log10(3)
        self.assertAlmostEqual(rows[0]['rating'], expected, places=3)
        self.assertAlmostEqual(rows[1]['rating'], 2000-expected, places=3)
        se = 400 / math.log(10) * math.sqrt((1/75 + 1/25)/4)
        self.assertAlmostEqual(rows[0]['ci95'][1], expected + 1.959963984540054*se, places=3)
        self.assertEqual(rows[0]['samples'], 100)

    def test_ties_and_both_bad_are_half_results(self):
        data = votes('A', 'B', 25, 25, 50)
        for row in data[75:]: row['winner'] = 'both_bad'
        result = compute_snapshot(data, min_votes=100)
        self.assertAlmostEqual(result['components'][0]['models'][0]['rating'], 1000)
        self.assertEqual(result['counts']['bothBad'], 25)

    def test_sessions_duplicates_missing_and_private_fields(self):
        data = votes('A', 'B', 2, 2)
        data[1]['evaluation_session_id'] = data[0]['evaluation_session_id']
        data[1]['evaluation_order'] = 1
        data[2]['evaluation_session_id'] = None
        data.append(dict(data[0]))
        data[0]['conversation_a'] = 'PRIVATE MUST NOT APPEAR'
        clean, counts, _ = prepare_votes(data)
        self.assertEqual(len(clean), 2)
        self.assertEqual(counts['duplicateRows'], 1)
        self.assertEqual(counts['repeatedSessionRows'], 1)
        self.assertEqual(counts['invalidRows'], 1)
        self.assertNotIn('PRIVATE', str(clean))

    def test_conflicting_duplicate_ids_fail(self):
        data = votes('A', 'B', 1, 1)
        data[1]['id'] = data[0]['id']
        with self.assertRaises(ValueError): prepare_votes(data)

    def test_disconnected_components_never_share_a_rank(self):
        result = compute_snapshot(votes('A', 'B', 6, 4)+votes('C', 'D', 8, 2), min_votes=10)
        self.assertEqual(len(result['components']), 2)
        self.assertEqual([c['modelIds'] for c in result['components']], [['A','B'], ['C','D']])
        self.assertNotIn('rank', str(result))
        self.assertTrue(all(c['status'] == 'scored' for c in result['components']))

    def test_small_samples_and_nonfinite_mle_are_held(self):
        result = compute_snapshot(votes('A', 'B', 2, 1), min_votes=100)
        self.assertEqual(len(result['components']), 0)
        self.assertTrue(all(m['rating'] is None for m in result['excludedModels']))
        self.assertEqual(result['excludedModels'][0]['opponents'], 1)
        result = compute_snapshot(votes('A', 'B', 100, 0), min_votes=100)
        self.assertEqual(result['components'][0]['status'], 'unidentifiable')
        self.assertIsNone(result['components'][0]['models'][0]['ci95'])

    def test_missing_rows_and_determinism(self):
        result = compute_snapshot([], min_votes=100)
        self.assertEqual(result['counts']['inputRows'], 0)
        self.assertIsNone(result['period'])
        data = votes('A','B',6,4)
        self.assertEqual(compute_snapshot(data, min_votes=10), compute_snapshot(list(reversed(data)), min_votes=10))

    def test_timestamps_are_chronological_with_fractional_seconds(self):
        data = votes('A', 'B', 1, 1)
        data[0]['timestamp'] = '2025-05-01T00:00:00Z'
        data[1]['timestamp'] = '2025-05-01T00:00:00.100000Z'
        _, _, actual = prepare_votes(data)
        self.assertEqual(actual, {'start':'2025-05-01T00:00:00.000000Z', 'end':'2025-05-01T00:00:00.100000Z'})


if __name__ == '__main__': unittest.main()
