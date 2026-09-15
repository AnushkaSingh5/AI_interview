const axios = require('axios');
const { parseGeminiJson } = require('../../utils/parseGeminiJson');

const apiKey = process.env.GEMINI_API_KEY;

/**
 * Raw Gemini caller with exponential backoff on 429
 */
const rawGeminiCall = async (prompt, timeoutMs = 45000, maxRetries = 2) => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeoutMs
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty text candidate returned by Gemini.');
      return text;
    } catch (error) {
      const status = error.response?.status;
      if (status === 429 && attempt < maxRetries) {
        const delay = (attempt + 1) * 2000;
        console.warn(`[CareerCoach] 429 Rate limited. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (attempt === maxRetries) throw error;
    }
  }
};

/**
 * Intelligent domain-specific career advice fallback when AI API quota is temporarily throttled
 */
const buildCareerCoachFallback = ({ user, resumeData, message }) => {
  const query = (message || '').toLowerCase();
  const targetRole = user?.targetRole || 'Software Development Engineer (SDE)';
  const targetCompany = user?.targetCompany || 'Top Tech Companies';
  const candidateName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'there';

  if (query.includes('sde') || query.includes('prepare') || query.includes('interview')) {
    return {
      reply: `### 🎯 SDE Interview Preparation Strategy for ${targetCompany}

Hi ${candidateName}! To excel in your **${targetRole}** interviews, here is a structured 4-pillar roadmap:

#### 1. Data Structures & Algorithms (40% Weight)
- **Top Patterns to Master:** Two Pointers, Sliding Window, Fast & Slow Pointers, Monotonic Stack, Tree Traversals (BFS/DFS), Graphs (Dijkstra, Topological Sort), and Dynamic Programming (Knapsack, Subsequences).
- **Goal:** Solve 150-200 medium LeetCode/InterviewAce problems with a timer. Practice explaining your thought process out loud before typing code.

#### 2. System Design & Architecture (30% Weight)
- **High-Level Design (HLD):** Rate Limiters, URL Shorteners, Notification Systems, Distributed Caching (Redis), and Database Sharding.
- **Low-Level Design (LLD):** Object-Oriented Principles (SOLID, Design Patterns like Factory, Strategy, Observer).

#### 3. Core Computer Science Fundamentals (15% Weight)
- Operating Systems (Threads, Concurrency, Deadlocks, Mutex).
- Databases (ACID, Indexing internals B-Trees, SQL Joins vs NoSQL Tradeoffs).
- Computer Networks (TCP/IP, HTTP/2 vs HTTP/3, WebSockets, DNS).

#### 4. Behavioral & Leadership Fit (15% Weight)
- Prepare 4-5 stories using the **STAR Method** (Situation, Task, Action, Result) showcasing leadership, technical disagreements, and dealing with ambiguity.`,
      suggestedFollowUps: [
        `What projects should I add to my resume for ${targetRole}?`,
        `Give me a 30-day technical interview study schedule.`,
        `How do I answer "Tell me about a time you resolved a conflict"?`
      ],
      category: 'interview_prep',
      threadTitle: 'SDE Interview Preparation Strategy'
    };
  }

  if (query.includes('project') || query.includes('resume') || query.includes('portfolio')) {
    return {
      reply: `### 💼 High-Impact Resume Projects for ${targetRole}

To make your resume stand out to recruiters and engineering managers at **${targetCompany}**, avoid generic CRUD apps and build projects demonstrating **scale, concurrency, and real-world utility**:

#### 1. Distributed Task Queue & Rate Limiter
- **Tech Stack:** Node.js / Go, Redis Streams, Docker, PostgreSQL.
- **Key Concepts:** Token Bucket algorithm, exponential backoff retries, worker thread pools, and idempotent job processing.
- **Resume Bullet:** *"Architected a distributed background task engine processing 10k+ events/sec using Redis Streams and Go worker pools."*

#### 2. Real-Time Collaborative System (e.g. Doc Editor or Chat Engine)
- **Tech Stack:** React, WebSockets, Node.js / Python, CRDTs (Conflict-free Replicated Data Types).
- **Key Concepts:** WebSocket connection scaling, heartbeats, state synchronization, message ordering.

#### 3. AI-Powered Developer Tool / Code Intelligence Engine
- **Tech Stack:** TypeScript, Vector Databases (Pinecone/Milvus), LLM APIs, Next.js.
- **Key Concepts:** Embeddings, semantic code search, AST parsing, retrieval-augmented generation (RAG).

#### 💡 Actionable Resume Tips:
- Always format bullets as: **[Accomplished X] by doing [Y], resulting in [Z metric]**.
- Include live demo links and clean GitHub repositories with detailed architecture diagrams.`,
      suggestedFollowUps: [
        `How should I write bullet points using the STAR method?`,
        `What should I study for backend development?`,
        `How can I prepare for system design rounds?`
      ],
      category: 'resume_advice',
      threadTitle: 'Resume Project Recommendations'
    };
  }

  if (query.includes('backend') || query.includes('study') || query.includes('roadmap')) {
    return {
      reply: `### 💻 Comprehensive Backend Development Roadmap (2026)

Here is the modern backend engineering curriculum recommended for **${targetRole}** candidates:

#### Phase 1: Core Languages & Concurrency
- Master a primary backend runtime: **Node.js (TypeScript)**, **Go**, or **Java (Spring Boot)**.
- Understand event loops, thread pools, asynchronous I/O, and memory management.

#### Phase 2: Database Engineering & Data Modeling
- **Relational:** PostgreSQL / MySQL — indexing strategies (B-Tree, GIN), EXPLAIN query analysis, transaction isolation levels.
- **NoSQL & In-Memory:** MongoDB (document modeling) and Redis (caching, pub/sub, distributed locks).

#### Phase 3: API Design & Microservices Architecture
- RESTful API design standards (versioning, pagination, idempotency).
- gRPC & Protocol Buffers for high-throughput service-to-service communication.
- Message Brokers: Apache Kafka or RabbitMQ for event-driven asynchronous processing.

#### Phase 4: Cloud, DevOps & Observability
- Docker containerization & Kubernetes fundamentals.
- CI/CD pipelines (GitHub Actions).
- Monitoring & Tracing: Prometheus, Grafana, OpenTelemetry, and structured JSON logging.`,
      suggestedFollowUps: [
        `How do database indexes actually work under the hood?`,
        `Which projects demonstrate advanced backend skills?`,
        `How should I prepare for an SDE interview?`
      ],
      category: 'roadmap',
      threadTitle: 'Backend Development Study Roadmap'
    };
  }

  // General career guidance
  return {
    reply: `### 🧭 Strategic Career Guidance for ${candidateName}

I am here to help you accelerate your technical career and conquer your engineering interviews!

As your AI Career Coach, I can help you with:
- **Interview Preparation Strategy**: Coding patterns, System Design frameworks, and company-specific assessment styles (${targetCompany}).
- **Resume & Project Optimization**: High-converting project ideas and metric-driven bullet point rewriting.
- **Technical Study Plans**: Tailored weekly curriculums for Frontend, Backend, Full-Stack, and DevOps.
- **Behavioral & Leadership Coaching**: STAR response formulations for tough leadership questions.
- **Offer Negotiation & Strategy**: How to evaluate compensation packages and communicate with recruiters.

Feel free to ask a specific question or select one of the suggested topics below!`,
    suggestedFollowUps: [
      `How should I prepare for an SDE interview?`,
      `Which projects should I add to my resume?`,
      `What should I study for backend development?`
    ],
    category: 'general',
    threadTitle: 'Career Strategy & Advice'
  };
};

/**
 * Main Career Coach Conversation Engine
 */
const chatWithCareerCoach = async ({
  user,
  resumeData,
  conversationHistory = [],
  message,
  currentTopic
}) => {
  const candidateName = resumeData?.personalInformation?.name || user?.fullName || user?.name || 'Candidate';
  const targetRole = user?.targetRole || 'Software Engineer';
  const targetCompany = user?.targetCompany || 'Top Tech Companies';
  const experienceLevel = user?.experienceLevel || '1-3 Years';

  const skills = [
    ...(resumeData?.technicalSkills || []),
    ...(resumeData?.programmingLanguages || []),
    ...(resumeData?.frameworks || []),
    ...(user?.skills || [])
  ];
  const uniqueSkills = Array.from(new Set(skills)).slice(0, 18);

  const projects = (resumeData?.projects || []).map(p => p.title).filter(Boolean);

  // Format previous conversation messages
  const formattedHistory = conversationHistory.slice(-8).map(m => ({
    role: m.role,
    content: m.content
  }));

  const prompt = `You are an elite Principal Career Coach, FAANG Interview Bar Raiser, and Staff Engineering Leader.
You provide deep, actionable, pragmatic, and inspiring career coaching for software engineers and technical candidates.

=== CANDIDATE PROFILE ===
Name: ${candidateName}
Target Role: ${targetRole}
Target Company: ${targetCompany}
Experience Level: ${experienceLevel}
Technical Skills: ${uniqueSkills.join(', ') || 'JavaScript, React, Node.js, Python, SQL'}
Verified Projects: ${projects.join(', ') || 'Web and backend software projects'}

=== CONVERSATION HISTORY ===
${JSON.stringify(formattedHistory)}

=== USER'S NEW MESSAGE ===
"${message}"

=== INSTRUCTIONS ===
1. Tone: Encouraging, authoritative, structured, and deeply technical yet accessible.
2. Provide comprehensive, actionable advice with clean Markdown headers, bullet points, concrete technology stacks, real-world examples, and step-by-step frameworks.
3. If they ask about interview preparation, give prioritized DSA patterns, System Design roadmaps, and timeline recommendations.
4. If they ask about projects, give production-grade, resume-worthy project architectures with concrete metrics.
5. If they ask what to study, provide a progressive phase-by-phase learning curriculum.
6. Provide 2-3 natural, highly engaging follow-up prompt questions for the candidate to click.
7. Categorize the topic: 'interview_prep' | 'resume_advice' | 'roadmap' | 'negotiation' | 'behavioral' | 'general'.
8. If this is a new thread, provide a concise 3-6 word title.

Return strictly a valid JSON object matching this schema:
{
  "reply": "Full formatted Markdown response with headings, bullet points, and code/tech highlights",
  "suggestedFollowUps": [
    "Follow-up question 1",
    "Follow-up question 2",
    "Follow-up question 3"
  ],
  "category": "interview_prep",
  "threadTitle": "SDE Interview Preparation Strategy"
}`;

  try {
    const rawJson = await rawGeminiCall(prompt);
    return parseGeminiJson(rawJson, 'Career Coach Service');
  } catch (error) {
    console.warn('[CareerCoachService] Gemini error/rate-limit. Generating domain-specific fallback response:', error.message);
    return buildCareerCoachFallback({ user, resumeData, message });
  }
};

module.exports = {
  chatWithCareerCoach
};
