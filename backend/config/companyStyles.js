/**
 * Company-Specific Interview Styles, Rubrics, Competencies, and Question Templates
 * Tailored for Google, Amazon, Microsoft, Infosys, TCS, and Accenture
 */

const COMPANY_INTERVIEW_STYLES = {
  Google: {
    id: 'google',
    name: 'Google',
    tagline: 'Algorithmic Excellence & Large-Scale Systems',
    badgeColor: '#4285F4',
    badgeBg: 'rgba(66, 133, 244, 0.1)',
    defaultRole: 'Software Engineer',
    recommendedDifficulty: 'Hard',
    focusAreas: [
      'Data Structures & Algorithms',
      'Dynamic Programming',
      'Graphs & Trees',
      'Distributed Systems',
      'Scalability & Trade-offs',
      'Googleyness & Leadership'
    ],
    technicalStyle: `
- Emphasis on optimal time and space complexity (Big-O analysis).
- Rigorous exploration of edge cases and boundary conditions.
- Deep algorithmic design: Dynamic Programming, Graph algorithms (Dijkstra, BFS/DFS, Topological Sort), Segment Trees, Trie, and Heaps.
- System Design: High scalability (Billions of users, Global CDNs, Distributed Caches like Bigtable/GFS, MapReduce, Low Latency Streaming).
`,
    behavioralStyle: `
- **Googleyness**: Intellectual humility, navigating ambiguity, doing the right thing, proactive collaboration, and thriving in unconstrained problem spaces.
- Open-ended discussions on technical decisions and ethical tech dilemmas.
`,
    rubricHighlights: [
      'Optimal Big-O Time/Space Complexity',
      'Edge Case & Error Handling Coverage',
      'Clean Modular Code Execution',
      'Googleyness & Collaborative Mindset',
      'Trade-Off & Scalability Justification'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'technical',
        topic: 'System Architecture & Concurrency',
        difficulty: 'Hard',
        question: 'How would you design a globally distributed rate limiter that handles 10 million requests per second with sub-5ms latency across multi-region data centers?',
        expectedAnswer: 'Token bucket or Sliding Window Counter with Redis Cluster, local memory token caching (Token Bucket in-memory + async sync), gossip protocol or geo-distributed DNS routing.'
      },
      {
        questionNumber: 2,
        questionType: 'coding',
        topic: 'Dynamic Programming & Graphs',
        difficulty: 'Hard',
        question: 'Given a directed weighted graph representing network router latencies, find the shortest cycle path that visits at least K distinct nodes.',
        expectedAnswer: 'State-space search using Dijkstra with bitmask DP or modified Bellman-Ford tracking node visit count and path cost.'
      },
      {
        questionNumber: 3,
        questionType: 'behavioral',
        topic: 'Googleyness & Navigating Ambiguity',
        difficulty: 'Medium',
        question: 'Describe a situation where project requirements were completely ambiguous or conflicting. How did you formulate a hypothesis, drive alignment across teams, and execute?',
        expectedAnswer: 'STAR methodology demonstrating initiative, proactive data gathering, iterative prototyping, stakeholder alignment, and data-driven decision making.'
      }
    ]
  },

  Amazon: {
    id: 'amazon',
    name: 'Amazon',
    tagline: '16 Leadership Principles & Bar Raiser Standards',
    badgeColor: '#FF9900',
    badgeBg: 'rgba(255, 153, 0, 0.12)',
    defaultRole: 'Software Development Engineer (SDE)',
    recommendedDifficulty: 'Medium',
    focusAreas: [
      'Amazon Leadership Principles (LP)',
      'STAR Method Behavioral',
      'Low-Level Object Oriented Design (LLD)',
      'Microservices Architecture',
      'AWS Cloud Design (DynamoDB, SQS)',
      'Data Structures & Problem Solving'
    ],
    technicalStyle: `
- Practical, production-ready coding with focus on maintainability, readability, and modular design.
- Low-Level Object-Oriented Design (Design Amazon Locker, Parking Lot, Delivery Routing, Shopping Cart).
- High-Level Architecture: Microservices, Event-Driven Architectures (SQS, SNS, EventBridge), DynamoDB single-table design, horizontal scaling.
`,
    behavioralStyle: `
- **Strict 16 Amazon Leadership Principles**:
  1. Customer Obsession
  2. Ownership
  3. Invent and Simplify
  4. Are Right, A Lot
  5. Learn and Be Curious
  6. Hire and Develop the Best
  7. Insist on the Highest Standards
  8. Think Big
  9. Bias for Action
  10. Frugality
  11. Earn Trust
  12. Dive Deep
  13. Have Backbone; Disagree and Commit
  14. Deliver Results
  15. Strive to be Earth's Best Employer
  16. Success and Scale Bring Broad Responsibility
- Candidate MUST provide structured STAR answers (Situation, Task, Action, Result) with quantified business metrics (% latency drop, $ revenue, customer count).
`,
    rubricHighlights: [
      'Customer Obsession & Working Backwards',
      'Concrete STAR Answers with Quantified Results',
      'Ownership & Bias for Action Evidence',
      'Robust Low-Level OOP Design & Clean APIs',
      'High-Scale Microservices & Fault Tolerance'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'behavioral',
        topic: 'Customer Obsession & Bias for Action (Amazon LP)',
        difficulty: 'Medium',
        question: 'Tell me about a time when you had to make a high-stakes decision under tight deadlines without complete data to prevent customer friction.',
        expectedAnswer: 'STAR response highlighting calculated risk-taking (two-way door decision), rapid experimentation, customer impact metrics, and post-launch validation.'
      },
      {
        questionNumber: 2,
        questionType: 'coding',
        topic: 'Data Structures & Sliding Window',
        difficulty: 'Medium',
        question: 'Design an order tracking stream that calculates the maximum number of concurrent package deliveries in any sliding 15-minute window for an Amazon fulfillment hub.',
        expectedAnswer: 'Sliding window with two pointers or two-end priority queue (min-heap of package dispatch/delivery timestamps) achieving O(N log N) or O(N) complexity.'
      },
      {
        questionNumber: 3,
        questionType: 'system_design',
        topic: 'Low-Level OOP & Microservices Design',
        difficulty: 'Hard',
        question: 'Design an Amazon Locker Automated Delivery System: model the physical locker sizes, reservation state machine, customer PIN generation, and expiration notification services.',
        expectedAnswer: 'Clean OOP classes (Locker, Package, ReservationService, NotificationWorker), state transition handling (Available -> Reserved -> Occupied -> Expired), and async queue for customer pickup alerts.'
      }
    ]
  },

  Microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    tagline: 'Practical Engineering, Cloud Scale & Growth Mindset',
    badgeColor: '#00A4EF',
    badgeBg: 'rgba(0, 164, 239, 0.1)',
    defaultRole: 'Software Engineer',
    recommendedDifficulty: 'Medium',
    focusAreas: [
      'Data Structures (Trees, Linked Lists, Strings)',
      'Clean Code & Defensive Programming',
      'Azure Cloud & Resilient Architecture',
      'Unit Testing & Refactoring',
      'Growth Mindset & Collaboration',
      'API Design & Maintainability'
    ],
    technicalStyle: `
- Strong emphasis on writing clean, defensive, production-ready code with solid unit tests and edge-case validation.
- Data structures: Trees, BST, Linked Lists, Matrix manipulations, Trie, and Recursion/Backtracking.
- Architecture: Azure cloud patterns (Cosmos DB, Event Hubs, Azure App Services, Blob Storage), resilience, circuit breakers, multi-tier caching.
`,
    behavioralStyle: `
- **Growth Mindset**: Learning from past engineering mistakes, receiving constructive feedback with openness, championing diversity & inclusion, cross-team empathy.
- Collaborative problem solving where the interviewer acts as a peer engineer.
`,
    rubricHighlights: [
      'Clean Code Structure & Readable Naming',
      'Defensive Error Handling & Unit Testability',
      'Growth Mindset & Feedback Adaptability',
      'Cloud Architecture & Disaster Recovery',
      'Collaborative Engineering Communication'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'coding',
        topic: 'Trees & Linked Structures',
        difficulty: 'Medium',
        question: 'Given the root of a binary search tree, serialize the tree to a compact string format and write a companion deserializer function that reconstructs the identical tree.',
        expectedAnswer: 'Pre-order traversal with delimiter or level-order BFS serialization handling null nodes efficiently.'
      },
      {
        questionNumber: 2,
        questionType: 'system_design',
        topic: 'Resilient Cloud Architecture',
        difficulty: 'Medium',
        question: 'Design a high-reliability Office 365 collaborative document autosave service that supports real-time conflict resolution and offline syncing.',
        expectedAnswer: 'Operational Transformation (OT) or CRDTs, WebSocket gateway, Redis pub/sub, append-only change logs, and Cosmos DB with configurable consistency levels.'
      },
      {
        questionNumber: 3,
        questionType: 'behavioral',
        topic: 'Growth Mindset & Collaboration',
        difficulty: 'Medium',
        question: 'Describe a project where your initial technical approach failed in staging or production. What did you learn, how did you pivot, and how did it change your engineering practices?',
        expectedAnswer: 'Demonstrating accountability, blameless post-mortem analysis, proactive learning, sharing lessons with teammates, and establishing automated safeguards.'
      }
    ]
  },

  Infosys: {
    id: 'infosys',
    name: 'Infosys',
    tagline: 'Core CS Fundamentals, DBMS & Enterprise Software',
    badgeColor: '#007CC3',
    badgeBg: 'rgba(0, 124, 195, 0.1)',
    defaultRole: 'Systems Engineer / Specialist Programmer (SES/SP)',
    recommendedDifficulty: 'Medium',
    focusAreas: [
      'Object-Oriented Programming (OOPs)',
      'DBMS, SQL Queries & Normalization',
      'Java / Python / C++ Basics',
      'Operating Systems & Networking',
      'Software Development Life Cycle (SDLC)',
      'Client Communication & Aptitude'
    ],
    technicalStyle: `
- Strong focus on fundamental Computer Science concepts:
  - OOPs: Inheritance, Polymorphism, Abstraction, Encapsulation, Interface vs Abstract Class.
  - DBMS: Complex SQL Queries (Joins, Nested Subqueries, Group By, Having, Indexing, ACID properties, 1NF to 3NF).
  - Programming: Java (Collections framework, JVM memory, Exception hierarchy) or Python / C++.
  - DSA: Stacks, Queues, Linked Lists, Searching & Sorting algorithms, Matrix rotations.
`,
    behavioralStyle: `
- Client-facing professionalism, clarity of communication, adaptability to shift between technologies, willingness to learn enterprise platforms, and teamwork.
`,
    rubricHighlights: [
      'Conceptual Clarity in OOPs & Data Modeling',
      'Accurate SQL Query Crafting & Normalization',
      'Understanding of SDLC & Agile Practices',
      'Communication Clarity & Articulation',
      'Problem-Solving Fundamentals & Logic'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'technical',
        topic: 'OOPs & Java / C++ Fundamentals',
        difficulty: 'Medium',
        question: 'Explain the difference between Method Overloading and Method Overriding with runtime behavior. How does the JVM dynamically dispatch overridden methods at runtime?',
        expectedAnswer: 'Compile-time vs runtime polymorphism, method signatures, vtable/virtual method table lookup in JVM memory space.'
      },
      {
        questionNumber: 2,
        questionType: 'technical',
        topic: 'DBMS & Complex SQL Queries',
        difficulty: 'Medium',
        question: 'Write an SQL query to find the second highest salary in each department. Also explain when to use INNER JOIN vs LEFT JOIN with a concrete business example.',
        expectedAnswer: 'DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) or subquery with NOT IN / MAX. Clear join trade-offs.'
      },
      {
        questionNumber: 3,
        questionType: 'behavioral',
        topic: 'Client Consulting & Adaptability',
        difficulty: 'Easy',
        question: 'If assigned to a project involving a legacy tech stack you have never used before, how would you ramp up quickly while ensuring zero delivery delays for the client?',
        expectedAnswer: 'Structured learning roadmap, reviewing existing test cases and architecture docs, pairing with senior engineers, and maintaining transparent milestone tracking.'
      }
    ]
  },

  TCS: {
    id: 'tcs',
    name: 'TCS',
    tagline: 'Ninja, Digital & Prime Engineering Assessment',
    badgeColor: '#E82127',
    badgeBg: 'rgba(232, 33, 39, 0.1)',
    defaultRole: 'System Engineer (Ninja / Digital / Prime)',
    recommendedDifficulty: 'Medium',
    focusAreas: [
      'C / C++ / Java / Python Programming',
      'Arrays, Strings & Sorting Logic',
      'SQL Joins & Data Integrity',
      'Agile & Scrum Methodologies',
      'Logical & Analytical Reasoning',
      'Enterprise Solution Delivery'
    ],
    technicalStyle: `
- Evaluation across TCS Tracks:
  - **Ninja Track**: Core programming syntax, flowcharts, recursion, basic arrays, strings, and SQL selects.
  - **Digital Track**: Intermediate DSA (Binary search, Stacks, Queues, Hash Maps), REST APIs, Web architecture, DBMS constraints.
  - **Prime Track**: Advanced problem solving, microservices concepts, cloud basics, and data optimization.
- Software engineering: Agile vs Waterfall, Version Control (Git), CI/CD pipelines, code debugging.
`,
    behavioralStyle: `
- Strong work ethics, adaptability to global delivery teams, structured problem breakdown, client empathy, and adherence to security/compliance standards.
`,
    rubricHighlights: [
      'Programming Logic & Pseudocode Accuracy',
      'Algorithmic Complexity Optimization',
      'Database Schema & Transaction Understanding',
      'Agile Methodology & Project Lifecycle',
      'Professional Demeanor & Ethical Integrity'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'coding',
        topic: 'Arrays & Two Pointers (Digital / Prime Track)',
        difficulty: 'Medium',
        question: 'Given an array of customer transaction amounts, find the longest contiguous subarray whose sum equals zero in O(N) time complexity.',
        expectedAnswer: 'Prefix sum hash map storing first occurrence indices to achieve O(N) linear time and O(N) auxiliary space.'
      },
      {
        questionNumber: 2,
        questionType: 'technical',
        topic: 'DBMS Transactions & Indexing',
        difficulty: 'Medium',
        question: 'What is Database Indexing? Compare B-Tree vs Hash Indexing. Explain what happens during a Deadlock in a banking transaction database and how to resolve it.',
        expectedAnswer: 'B-Tree range query efficiency vs Hash O(1) equality, lock ordering, timeout detection, and deadlock graph cycle detection.'
      },
      {
        questionNumber: 3,
        questionType: 'behavioral',
        topic: 'Agile Teamwork & Ethics',
        difficulty: 'Easy',
        question: 'During a sprint release, you notice a potential data security vulnerability in code written by a peer right before deadline. How would you handle this situation?',
        expectedAnswer: 'Immediately flag to peer constructively, notify tech lead/scrum master, assist in creating a hotfix, and uphold compliance/data integrity over rushing.'
      }
    ]
  },

  Accenture: {
    id: 'accenture',
    name: 'Accenture',
    tagline: 'Enterprise Cloud Architecture & Consulting Innovation',
    badgeColor: '#A100FF',
    badgeBg: 'rgba(161, 0, 255, 0.1)',
    defaultRole: 'Associate Software Engineer / Advanced App Engineer',
    recommendedDifficulty: 'Medium',
    focusAreas: [
      'Full-Stack Frameworks (React, Node, Spring Boot)',
      'Enterprise Cloud (AWS, Azure, GCP)',
      'Microservices & REST API Architecture',
      'Modern Data Pipelines & NoSQL',
      'Agile Delivery & Client Consulting',
      'Problem-Solving & Situational Scenarios'
    ],
    technicalStyle: `
- Applied enterprise engineering:
  - Full-stack web architectures (React/Angular frontend + Node.js/Spring Boot backend).
  - Cloud modernization: Migrating legacy monoliths to containerized microservices (Docker, Kubernetes).
  - API Design: RESTful standards, authentication (JWT, OAuth2), API Gateway routing, rate limiting.
  - Data: Relational (PostgreSQL/MySQL) vs NoSQL (MongoDB/DynamoDB) suitability.
`,
    behavioralStyle: `
- Consulting mindset: Translating business needs into technical architectures, client expectation management, change management, clear stakeholder communication.
`,
    rubricHighlights: [
      'Full-Stack & Cloud Architecture Vision',
      'API Security & Scalable Microservices',
      'Business Problem to Tech Translation',
      'Agile Sprint Planning & Delivery Focus',
      'Client Presentation & Consulting Polish'
    ],
    curatedQuestions: [
      {
        questionNumber: 1,
        questionType: 'system_design',
        topic: 'Enterprise Cloud Modernization',
        difficulty: 'Medium',
        question: 'A retail client is migrating their monolithic e-commerce application to AWS/Azure microservices. How would you architect the User Authentication and Order Processing services to ensure zero downtime during migration?',
        expectedAnswer: 'Strangler Fig pattern, API Gateway facade routing traffic progressively, JWT bearer authentication, event-driven order processing via Kafka/SQS, dual-write database sync.'
      },
      {
        questionNumber: 2,
        questionType: 'technical',
        topic: 'Full-Stack Performance & Security',
        difficulty: 'Medium',
        question: 'How do you secure a single-page application (React) communicating with a Node.js/Express backend against XSS, CSRF, and SQL/NoSQL Injection vulnerabilities?',
        expectedAnswer: 'HttpOnly SameSite cookies for JWTs, DOMPurify/sanitization, CSP headers, parameterized queries/Mongoose schema sanitization, CORS configuration.'
      },
      {
        questionNumber: 3,
        questionType: 'behavioral',
        topic: 'Consulting Mindset & Client Delivery',
        difficulty: 'Medium',
        question: 'Describe a situation where a client demanded a feature modification two days before a major release. How did you assess trade-offs, communicate risks, and deliver a solution?',
        expectedAnswer: 'Structured impact assessment (scope vs timeline vs quality), proposing phased delivery (MVP now, enhancement in next sprint), clear data-backed stakeholder communication.'
      }
    ]
  }
};

function getCompanyStyle(companyName) {
  if (!companyName || typeof companyName !== 'string') {
    return null;
  }
  const clean = companyName.trim().toLowerCase();
  for (const [key, value] of Object.entries(COMPANY_INTERVIEW_STYLES)) {
    if (key.toLowerCase() === clean || clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) {
      return value;
    }
  }
  return null;
}

function getAllCompanyProfiles() {
  return Object.values(COMPANY_INTERVIEW_STYLES).map(c => ({
    id: c.id,
    name: c.name,
    tagline: c.tagline,
    badgeColor: c.badgeColor,
    badgeBg: c.badgeBg,
    defaultRole: c.defaultRole,
    recommendedDifficulty: c.recommendedDifficulty,
    focusAreas: c.focusAreas,
    rubricHighlights: c.rubricHighlights
  }));
}

module.exports = {
  COMPANY_INTERVIEW_STYLES,
  getCompanyStyle,
  getAllCompanyProfiles
};
