# Clarification questions JSON

The output object has this shape:

```json
{
  "timestamp": "2026-08-26T19:41:01+00:00",
  "task_id": "NEW-006",
  "title": "API: Held-out estimation case 06",
  "description": "Task description",
  "questions": [
    {
      "id": "Q1",
      "category": "Architecture",
      "question": "Which services and public contracts must change?",
      "why_it_matters": "The number of services and contracts determines blast radius and compatibility burden.",
      "estimation_dimension": "integration_surface"
    }
  ]
}
```

Required question fields:

- `category`: a concise grouping such as Scope, Architecture, Dependencies, Integration, Compatibility, Testing, Migration, Uncertainty, or Risk.
- `question`: one concrete question answerable by a product or engineering stakeholder.
- `why_it_matters`: a concise explanation of how the answer affects story-point calibration or confidence.
- `estimation_dimension`: one of `scope`, `technical_complexity`, `uncertainty`, `dependencies`, `integration_surface`, `testing_burden`, `compatibility`, or `risk`.

The writer assigns sequential `Q1`, `Q2`, … IDs. Questions should be ordered by expected impact on estimation accuracy.

When local analysis finds no material unanswered ambiguity, write an empty `questions` list. This explicitly signals that estimation may continue without pausing.
