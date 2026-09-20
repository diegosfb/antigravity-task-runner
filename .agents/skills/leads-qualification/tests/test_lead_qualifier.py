import importlib.util
import pathlib
import unittest


SCRIPT = pathlib.Path(__file__).parents[1] / "scripts" / "lead_qualifier.py"
SPEC = importlib.util.spec_from_file_location("lead_qualifier", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def base_icp():
    return {
        "name": "Test ICP",
        "version": "1",
        "must_have": [
            {"field": "country", "value": ["US", "UK"], "weight": 10},
            {"field": "size", "match": "numeric_range", "min": 50, "max": 1000, "weight": 10},
        ],
        "nice_to_have": [
            {"field": "signals", "match": "token", "value": ["bigquery", "dbt"], "weight": 10}
        ],
        "disqualifiers": [
            {"field": "size", "match": "numeric_range", "min": 0, "max": 10}
        ],
    }


class LeadQualifierTests(unittest.TestCase):
    def test_exact_country_does_not_substring_match(self):
        scored = MODULE.score_lead(base_icp(), {"company": "A", "country": "Australia", "size": "100", "signals": "dbt"})
        self.assertEqual(scored["status"], "disqualified")
        self.assertTrue(scored["failed_must_haves"])

    def test_numeric_disqualifier_is_enforced(self):
        scored = MODULE.score_lead(base_icp(), {"company": "B", "country": "US", "size": "8", "signals": "dbt"})
        self.assertEqual(scored["status"], "disqualified")
        self.assertIn("numeric_range", scored["disqualifier"])

    def test_unknown_must_have_requires_data(self):
        scored = MODULE.score_lead(base_icp(), {"company": "C", "country": "UNKNOWN", "size": "100", "signals": "dbt"})
        self.assertEqual(scored["status"], "needs_data")
        self.assertIsNone(scored["score"])
        self.assertEqual(scored["unknown_signals"], ["country"])

    def test_token_mode_matches_complete_items(self):
        scored = MODULE.score_lead(base_icp(), {"company": "D", "country": "US", "size": "100", "signals": "snowflake; dbt"})
        self.assertEqual(scored["status"], "A")
        self.assertEqual(scored["score"], 100.0)

    def test_token_mode_rejects_partial_items(self):
        scored = MODULE.score_lead(base_icp(), {"company": "E", "country": "US", "size": "100", "signals": "dbt-cloud"})
        self.assertEqual(scored["status"], "B")

    def test_icp_requires_version(self):
        icp = base_icp()
        del icp["version"]
        self.assertIn("ICP requires a version", MODULE.validate_icp(icp))


if __name__ == "__main__":
    unittest.main()
