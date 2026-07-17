// Unit test for dynamic local grading heuristics
const { evaluateAnswer } = require('./backend/services/ai/evaluator');

const mockSession = {
  role: "Software Engineer",
  difficulty: "Medium",
  experienceLevel: "Mid-level",
  interviewType: "technical"
};

const mockQuestion = {
  topic: "React hooks",
  questionType: "technical",
  question: "Explain the React hook dependency array and how to avoid closures stale state.",
  expectedAnswer: "React hook stale state occurs when closure captures old variables. Avoid this by adding dependencies to the array or using a functional state updater."
};

const runTests = async () => {
  console.log("=== STARTING DYNAMIC LOCAL HEURISTICS GRADING TESTS ===\n");

  const testCases = [
    {
      name: "Skipped / Empty response",
      answer: "",
      behavior: { skipped: true, timeTaken: 0 }
    },
    {
      name: "Poor response (too short, no relevant keywords)",
      answer: "I don't know much about this, maybe we just reload the page or state.",
      behavior: { skipped: false, timeTaken: 15 }
    },
    {
      name: "Average response (medium length, some technical vocabulary)",
      answer: "React hook stale state occurs when dependencies are not listed. We should include state values in the array or use functional updater to solve this stale state.",
      behavior: { skipped: false, timeTaken: 45 }
    },
    {
      name: "Excellent response (long, rich technical vocabulary, strong keyword match)",
      answer: "React hook stale closures happen when a callback captures old variables. To avoid stale state, we must list all referenced variables in the dependency array. Alternatively, we can use a functional state updater like setVal(prev => prev + 1) or utilize a useRef hook to store mutable references to prevent closures capturing stale state. Performance optimization and scaling component renders is also a design pattern consideration here.",
      behavior: { skipped: false, timeTaken: 120 }
    },
    {
      name: "Rushed response (rushed speed penalty test)",
      answer: "React hook stale closures happen when a callback captures old variables. To avoid stale state, we must list all referenced variables in the dependency array.",
      behavior: { skipped: false, timeTaken: 3 } // Rushed! 3 seconds.
    }
  ];

  for (const tc of testCases) {
    console.log(`--- Test Case: ${tc.name} ---`);
    const result = await evaluateAnswer(mockQuestion, tc.answer, mockSession, {
      forceLocal: true,
      behavior: tc.behavior
    });
    console.log(`Score: ${result.score}/10`);
    console.log(`Accuracy: ${result.accuracy}/10 | Completeness: ${result.completeness}/10 | Tech Depth: ${result.technicalDepth}/10 | Confidence: ${result.confidence}/10`);
    console.log(`Feedback: ${result.feedback}`);
    console.log(`Missing Points: ${JSON.stringify(result.missingPoints)}`);
    console.log(`Suggestions: ${JSON.stringify(result.improvementSuggestions)}`);
    console.log(`Engine: ${result.evaluationEngine}`);
    console.log("------------------------------------------\n");
  }

  console.log("=== TESTS COMPLETE ===");
};

runTests().catch(console.error);
