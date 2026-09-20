import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1] / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class PartnershipToolTests(unittest.TestCase):
    def test_evaluator_requires_reviewed_dimension_scores(self):
        evaluator = load("partner_evaluation_scorer")
        with self.assertRaises(ValueError):
            evaluator.evaluate({"name": "Example", "realistic_pipeline_24mo": 99_000_000})

    def test_evaluator_uses_supplied_bands_without_approving(self):
        evaluator = load("partner_evaluation_scorer")
        scores = {
            key: {"score": 4, "rationale": "Reviewed evidence"}
            for key in ("strategic_fit", "economic_potential", "partner_credibility", "mutual_commitment", "operational_fit", "reversibility")
        }
        result = evaluator.evaluate({"name": "Example", "dimension_scores": scores, "decision_bands": {"pilot_min": 18, "proceed_min": 24}})
        self.assertEqual(result.recommendation, "PROCEED-TO-APPROVAL")

    def test_roi_rejects_silent_cost_defaults(self):
        roi = load("partnership_roi_modeler")
        with self.assertRaises(ValueError):
            roi.model({"partnership_name": "Example", "revenue_year1": 1_000_000})

    def test_program_staffing_uses_supplied_capacity(self):
        designer = load("partner_program_designer")
        org = {
            "baseline_assumptions_acknowledged": True,
            "name": "Example",
            "stage": "growth",
            "target_active_partners": 13,
            "icp_segment": "enterprise",
            "partners_per_manager": 5,
            "year1_costs": {"manager_loaded_cost": 1, "portal": 0, "enablement": 0, "legal_review": 0, "travel_events": 0, "pilot_mdf": 0},
        }
        self.assertEqual(designer.design_program(org).channel_manager_count, 3)


if __name__ == "__main__":
    unittest.main()
