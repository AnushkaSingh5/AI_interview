# JSON Resiliency & Heuristic Local Evaluation Checklist

- `[x]` Add `evaluationEngine` field to Mongoose schemas: `QuestionEvaluation.js` and `InterviewEvaluation.js`.
- `[x]` Implement robust JSON extractor and parsing helper `parseGeminiResponse` in `evaluator.js`.
- `[x]` Update prompts in `evaluator.js` with strict formatting instructions.
- `[x]` Build dynamic local heuristic grading in `evaluator.js` (skipped, length, keywords, speed, density).
- `[x]` Update `compileOverallReport` to compile dynamic strengths/weaknesses/roadmap based on question topics and scores.
- `[x]` Update `aiQueueService.js` to pass `evaluationEngine` into Mongoose creations.
- `[x]` Display `evaluationEngine` badge on the report summary header in `InterviewReport.jsx`.
- `[x]` Create unit testing script `verify_grading_heuristics.js` and run it.
