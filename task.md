# Queue Recovery & Resiliency Checklist

- `[x]` Update `aiQueueService.js` to track `processingJob`, support high-priority job placement, and check for 5-minute boot thresholds.
- `[x]` Update `evaluateAnswer` in `evaluator.js` to support `useLocalFallback` short-circuit flag on HTTP 429 warnings.
- `[x]` Add `getQueueStatus` and `resumeEvaluation` controllers in `interviewController.js`.
- `[x]` Register queue status and manual resume routes in `interviewRoutes.js`.
- `[x]` Update frontend `InterviewQuestionsReview.jsx` with connection error states and cleanup hooks.
- `[x]` Update frontend `InterviewReport.jsx` with connection error states and cleanup hooks.
- `[x]` Verify server boot logs and run manual validations.
