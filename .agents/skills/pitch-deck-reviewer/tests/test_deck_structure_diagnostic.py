import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "deck_structure_scorer.py"
SPEC = importlib.util.spec_from_file_location("deck_structure_scorer", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class DeckStructureDiagnosticTests(unittest.TestCase):
    def test_diagnostic_has_no_numeric_quality_score(self):
        result = MODULE.diagnose("# Problem\n# Product\n# Team", "investor")
        self.assertNotIn("score", result)
        self.assertNotIn("verdict", result)

    def test_deck_types_have_distinct_coverage(self):
        text = "# Joint customer value\n# Co-sell model\n# Governance and owners\n# Pilot next step"
        partnership = MODULE.diagnose(text, "partnership")
        investor = MODULE.diagnose(text, "investor")
        self.assertIn("partnership model", partnership["observed_topics"])
        self.assertIn("business model", investor["topics_not_detected"])

    def test_visual_review_is_explicitly_out_of_scope(self):
        result = MODULE.diagnose("# Product", "product")
        self.assertTrue(any("Visual design" in item for item in result["limitations"]))


if __name__ == "__main__":
    unittest.main()
