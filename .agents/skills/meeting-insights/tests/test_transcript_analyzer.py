import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "transcript_analyzer.py"
SPEC = importlib.util.spec_from_file_location("transcript_analyzer", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class TranscriptAnalyzerTests(unittest.TestCase):
    def test_candidates_include_timestamp_and_line_provenance(self):
        result = MODULE.analyze("[00:14:20] Ana: We decided to test onboarding.\n[00:15:00] Bob: I'll share the prototype by Friday.")
        self.assertEqual(result["decisions"][0]["source"], "Ana @ 00:14:20, line 1")
        self.assertEqual(result["action_items"][0]["owner"], "Bob")
        self.assertEqual(result["action_items"][0]["due"], "by friday")

    def test_only_problem_related_statements_become_quotes(self):
        result = MODULE.analyze("Ana: Our kickoff agenda contains many routine words but no customer problem.\nBob: It is frustrating that exporting a report takes way too long every week.")
        self.assertEqual(len(result["quotes"]), 1)
        self.assertIn("frustrating", result["quotes"][0]["text"])

    def test_unknown_owner_is_not_invented(self):
        result = MODULE.analyze("Next step is to review the legal terms tomorrow.")
        self.assertEqual(result["action_items"][0]["owner"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
