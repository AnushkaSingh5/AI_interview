const CURATED_SCENARIOS = [
  {
    "problemId": "tinyurl-shortener",
    "title": "Design a Scalable URL Shortener (TinyURL / Bitly)",
    "difficulty": "Easy",
    "domain": "Distributed Systems & High Read Throughput",
    "description": "Design a distributed URL shortening service like TinyURL or Bit.ly that generates short aliases for long URLs, redirects users with ultra-low latency (<20ms), and provides analytics.",
    "functionalRequirements": [
      "Given a long URL, generate a unique, short URL alias (e.g., https://tiny.url/abc1234).",
      "When users navigate to a short URL, redirect them to the original long URL with HTTP 301/302.",
      "Allow users to optionally choose a custom alias.",
      "Track real-time click counts and analytics (country, timestamp, referrers)."
    ],
    "nonFunctionalRequirements": [
      "Highly Available (99.999% uptime) - redirection must never fail.",
      "Ultra-low latency (<20ms for redirection).",
      "Read-heavy system with a 100:1 read-to-write ratio.",
      "URLs should have an optional expiration date (default 2 years)."
    ],
    "scaleEstimates": [
      "Write Traffic: 500 Million new URLs created per month (200 writes/sec).",
      "Read Traffic: 50 Billion URL redirections per month (20,000 reads/sec peak).",
      "Storage: 500 bytes per URL mapping -> ~15 TB storage over 5 years.",
      "Bandwidth: ~10 MB/sec incoming writes, ~200 MB/sec outgoing redirection reads."
    ],
    "keyArchitectureFocus": [
      "Base62 Encoding vs MD5/SHA256 Hashing with Distributed Token Ranges (KGS - Key Generation Service).",
      "Multi-level Caching (Redis / Memcached) for the top 20% hottest URLs (80-20 rule).",
      "Database Selection: NoSQL Key-Value (DynamoDB/Cassandra) vs Relational (PostgreSQL with read replicas).",
      "Global Load Balancing with CDN / Anycast IP."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Client Devices", "subLabel": "Mobile / Browser", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "dns", "label": "DNS / CDN", "subLabel": "Cloudflare Anycast", "category": "edge", "x": 260, "y": 180, "color": "#06b6d4" },
      { "id": "c3", "type": "lb", "label": "Load Balancer", "subLabel": "Nginx / ALB", "category": "compute", "x": 440, "y": 180, "color": "#8b5cf6" },
      { "id": "c4", "type": "service", "label": "URL Service", "subLabel": "Node/Go Microservice", "category": "compute", "x": 620, "y": 180, "color": "#10b981" }
    ]
  },
  {
    "problemId": "video-streaming-platform",
    "title": "Design a Video Streaming Platform (YouTube / Netflix)",
    "difficulty": "Hard",
    "domain": "High-Throughput Media & Event Streaming",
    "description": "Design a global video sharing and streaming platform that allows creators to upload massive video files, processes and transcodes them into multiple resolutions (1080p, 720p, 480p, 4K), and streams them seamlessly to millions of concurrent viewers worldwide.",
    "functionalRequirements": [
      "Users can upload high-definition video files up to 10GB.",
      "Asynchronous video chunking, transcoding (HLS / DASH), and thumbnail generation.",
      "Adaptive bitrate video streaming tailored to user network bandwidth.",
      "Users can search videos, view video statistics, and post comments in real-time."
    ],
    "nonFunctionalRequirements": [
      "Zero buffering and minimal startup playback latency (<2 seconds).",
      "High scalability supporting 50 Million daily active video streamers.",
      "High fault tolerance with multi-region video replication and CDN edge caching.",
      "Strong eventual consistency for view counts, likes, and comments."
    ],
    "scaleEstimates": [
      "Active Users: 1 Billion monthly active users, 100M daily active users.",
      "Video Uploads: 500 hours of video uploaded every minute.",
      "Egress Bandwidth: 1 Petabyte/hour during peak streaming hours.",
      "Storage: 100+ Petabytes of new transcoded media storage per year."
    ],
    "keyArchitectureFocus": [
      "Blob Storage (AWS S3 / GCS) with presigned direct-to-cloud upload URLs.",
      "Distributed Transcoding Workers & Task Queues (Kafka / RabbitMQ).",
      "Global Edge CDN (Cloudflare / Akamai) with byte-range chunk caching.",
      "Separate Metadata DB (PostgreSQL / DynamoDB) vs Search Index (Elasticsearch)."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Video Viewers", "subLabel": "Mobile / TV / Web", "category": "client", "x": 80, "y": 120, "color": "#3b82f6" },
      { "id": "c2", "type": "client", "label": "Video Creators", "subLabel": "Upload Clients", "category": "client", "x": 80, "y": 260, "color": "#3b82f6" },
      { "id": "c3", "type": "cdn", "label": "Global Video CDN", "subLabel": "Edge Caching HLS", "category": "edge", "x": 300, "y": 120, "color": "#06b6d4" },
      { "id": "c4", "type": "service", "label": "Upload Gateway", "subLabel": "Direct-to-S3 Uploads", "category": "compute", "x": 300, "y": 260, "color": "#8b5cf6" }
    ]
  },
  {
    "problemId": "realtime-chat-messenger",
    "title": "Design a Real-Time Messaging & Chat App (WhatsApp / Slack)",
    "difficulty": "Medium",
    "domain": "Real-Time WebSockets & Message Persistence",
    "description": "Design a distributed real-time 1-on-1 and group chat messaging system that delivers messages with sub-second latency, supports offline message sync, read receipts, and user presence tracking.",
    "functionalRequirements": [
      "Real-time 1-on-1 messaging and group chat rooms (up to 1,000 members).",
      "Online/Offline presence status indicators (last seen, active now).",
      "Message delivery status: Sent (single check), Delivered (double check), Read (blue check).",
      "Offline message queuing and immediate synchronization upon reconnection."
    ],
    "nonFunctionalRequirements": [
      "Ultra-low latency message delivery (<100ms globally).",
      "End-to-end reliability (zero message loss under network partitions).",
      "High concurrent connection handling (10 Million concurrent WebSocket connections)."
    ],
    "scaleEstimates": [
      "Daily Active Users: 100 Million DAU.",
      "Message Volume: 10 Billion messages per day (115,000 messages/sec average, 500,000/sec peak).",
      "Storage: 2 KB per message -> 20 TB storage per day, 7.3 PB per year."
    ],
    "keyArchitectureFocus": [
      "Stateful WebSocket Gateway Clusters behind TCP Load Balancers with sticky sessions.",
      "Distributed Pub/Sub Session Manager (Redis Pub/Sub or Kafka) for inter-server routing.",
      "High-Write Message Store: Wide-Column NoSQL (Apache Cassandra / HBase / DynamoDB).",
      "Heartbeat & Presence Server with Redis TTL Key Expiry."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Chat Clients", "subLabel": "Mobile App (iOS/Android)", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "lb", "label": "TCP / WS Load Balancer", "subLabel": "Envoy / HAProxy", "category": "edge", "x": 280, "y": 180, "color": "#8b5cf6" },
      { "id": "c3", "type": "service", "label": "WebSocket Gateway", "subLabel": "Persistent Connections", "category": "compute", "x": 480, "y": 180, "color": "#10b981" },
      { "id": "c4", "type": "cache", "label": "Redis Pub/Sub", "subLabel": "User Session Routing", "category": "cache", "x": 680, "y": 180, "color": "#ef4444" }
    ]
  },
  {
    "problemId": "ecommerce-flash-sale",
    "title": "Design a High-Concurrency Flash Sale & Inventory System (Amazon)",
    "difficulty": "Hard",
    "domain": "Distributed Transactions, Caching & Concurrency",
    "description": "Design a flash sale checkout and real-time inventory management engine that can handle 1 Million simultaneous purchase requests for 10,000 limited inventory units without overselling or database lock contention.",
    "functionalRequirements": [
      "Browse flash sale items with countdown timer and stock indicator.",
      "Place order with atomic inventory reservation and 10-minute payment grace period.",
      "Strict prevention of inventory overselling or double allocation.",
      "Release reserved stock if user fails to complete payment within grace period."
    ],
    "nonFunctionalRequirements": [
      "High Consistency (ACID compliance on stock deduction).",
      "High Availability and surge resilience against bot traffic.",
      "Sub-50ms checkout latency during flash sale burst."
    ],
    "scaleEstimates": [
      "Peak Traffic: 1 Million RPS hitting checkout endpoint in the first 60 seconds.",
      "Inventory: 10,000 limited high-demand items.",
      "Concurrent DB Writes: Must be throttled to prevent relational lock exhaustion."
    ],
    "keyArchitectureFocus": [
      "Redis Distributed In-Memory Atomic Decrement (DECR) with Lua scripts.",
      "Message Queue Asynchronous Order Processing (Kafka / RabbitMQ).",
      "Rate Limiting & Token Bucket Bot Protection at API Gateway.",
      "Optimistic vs. Pessimistic Locking in Relational Database."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Shoppers", "subLabel": "Web / App Users", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "edge", "label": "API Gateway", "subLabel": "Rate Limiter & Bot Filter", "category": "edge", "x": 280, "y": 180, "color": "#06b6d4" },
      { "id": "c3", "type": "service", "label": "Order Service", "subLabel": "Lua Script Execution", "category": "compute", "x": 480, "y": 180, "color": "#8b5cf6" },
      { "id": "c4", "type": "cache", "label": "Redis Cluster", "subLabel": "Atomic Stock Decr", "category": "cache", "x": 680, "y": 180, "color": "#ef4444" }
    ]
  },
  {
    "problemId": "social-media-feed",
    "title": "Design a Social Media News Feed & Fanout System (Twitter / Instagram)",
    "difficulty": "Medium",
    "domain": "Graph Modeling & Fanout-on-Write Caching",
    "description": "Design a scalable social news feed system that allows users to post status updates, follow other users, and view a personalized chronological and ranked timeline feed generated from followed accounts.",
    "functionalRequirements": [
      "Users can post tweets / status updates with text and images.",
      "Users can follow / unfollow other users.",
      "Users can view their personalized Home Timeline feed with low latency.",
      "Users with millions of followers (celebrities) must be handled gracefully without fanout bottlenecks."
    ],
    "nonFunctionalRequirements": [
      "Ultra-fast feed generation (<200ms latency).",
      "High Read-to-Write ratio (1000:1 reads vs writes).",
      "Eventual consistency for timeline updates."
    ],
    "scaleEstimates": [
      "Daily Active Users: 300 Million DAU.",
      "New Posts: 500 Million posts per day (6,000 writes/sec average, 30,000/sec peak).",
      "Feed Queries: 300 Billion feed queries/day (3.5 Million reads/sec)."
    ],
    "keyArchitectureFocus": [
      "Fanout-on-Write (Push Model) for standard users vs Fanout-on-Read (Pull Model) for celebrities.",
      "Redis In-Memory Timeline Caching (list of post IDs per user).",
      "Distributed Graph Database (Neo4j) vs Relational Follower Table (PostgreSQL).",
      "Social Graph Sharding & Cold Storage Archival."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Mobile / Web", "subLabel": "Social Feed Readers", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "lb", "label": "Load Balancer", "subLabel": "Global Traffic Director", "category": "edge", "x": 280, "y": 180, "color": "#8b5cf6" },
      { "id": "c3", "type": "service", "label": "Feed Service", "subLabel": "Timeline Aggregator", "category": "compute", "x": 480, "y": 180, "color": "#10b981" },
      { "id": "c4", "type": "cache", "label": "Redis Timeline Cache", "subLabel": "User In-Memory Feeds", "category": "cache", "x": 680, "y": 180, "color": "#ef4444" }
    ]
  },
  {
    "problemId": "distributed-cache-redis",
    "title": "Design a Distributed In-Memory Cache (Redis Cluster)",
    "difficulty": "Hard",
    "domain": "Consistent Hashing, Replication & Sharding",
    "description": "Design a distributed, highly available in-memory key-value caching system supporting high throughput, consistent hashing data distribution, configurable eviction policies (LRU/LFU), and master-replica failover.",
    "functionalRequirements": [
      "Support Put(key, value, ttl) and Get(key) operations with sub-millisecond latency.",
      "Support configurable cache eviction strategies (LRU - Least Recently Used, LFU).",
      "Automatic key expiration via proactive and reactive TTL cleanup.",
      "Dynamic node addition and removal with minimal key redistribution."
    ],
    "nonFunctionalRequirements": [
      "Sub-millisecond read/write latency.",
      "High throughput (>1 Million operations per second across the cluster).",
      "High availability with zero single points of failure (SPOF)."
    ],
    "scaleEstimates": [
      "Total Cached Data: 10 TB of in-memory data across 100 cache nodes.",
      "QPS: 5 Million QPS total throughput.",
      "Key Size: Average 100 bytes, Value Size: Average 1 KB."
    ],
    "keyArchitectureFocus": [
      "Consistent Hashing with Virtual Nodes (100-200 vnodes per physical node).",
      "Cache-Aside, Write-Through, and Write-Back cache write policies.",
      "Gossip Protocol for cluster state and node health detection.",
      "Master-Slave Async Replication with Raft / Sentinel consensus."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Application Servers", "subLabel": "App Pods / Microservices", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "service", "label": "Cache Router Proxy", "subLabel": "Consistent Hash Ring", "category": "compute", "x": 280, "y": 180, "color": "#8b5cf6" },
      { "id": "c3", "type": "cache", "label": "Master Cache Node A", "subLabel": "In-Memory Key-Value", "category": "cache", "x": 500, "y": 100, "color": "#ef4444" },
      { "id": "c4", "type": "cache", "label": "Master Cache Node B", "subLabel": "In-Memory Key-Value", "category": "cache", "x": 500, "y": 260, "color": "#ef4444" }
    ]
  },
  {
    "problemId": "ride-sharing-dispatch",
    "title": "Design a Real-Time Ride Matching & Geospatial Dispatch System (Uber / Lyft)",
    "difficulty": "Hard",
    "domain": "Geospatial Indexing & Location Streaming",
    "description": "Design a real-time ride dispatching and matching engine that ingests GPS locations from millions of active drivers every 3 seconds, indexes them spatially, and pairs riders with the nearest optimal drivers.",
    "functionalRequirements": [
      "Drivers emit GPS coordinates every 3-4 seconds.",
      "Riders request a ride and receive instant nearby driver availability and estimated pickup ETA.",
      "Match rider to optimal driver based on proximity, traffic, and acceptance rating.",
      "Trip lifecycle management: Request -> Matched -> Arrived -> In Progress -> Completed."
    ],
    "nonFunctionalRequirements": [
      "Real-time responsiveness (<2 seconds matching latency).",
      "Zero double-booking of drivers.",
      "High durability for trip invoices and geospatial trajectory logs."
    ],
    "scaleEstimates": [
      "Active Drivers: 1 Million concurrent active drivers emitting GPS pings.",
      "Active Riders: 10 Million active riders querying ETAs.",
      "GPS Location Ingestion: ~350,000 location updates/sec."
    ],
    "keyArchitectureFocus": [
      "Geospatial Partitioning: Uber H3 Hexagonal Hierarchical Spatial Index / Google S2 Cells / QuadTrees.",
      "In-Memory Geospatial Store: Redis GEO / Location Tracker Cluster.",
      "Matching Engine: Distributed Lock / Redis Redlock to avoid race conditions on driver assignments.",
      "Kafka Event Streaming for Trip State Transitions and Pricing Surge Engine."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Driver App", "subLabel": "GPS Pings (3s interval)", "category": "client", "x": 80, "y": 120, "color": "#3b82f6" },
      { "id": "c2", "type": "client", "label": "Rider App", "subLabel": "Ride Booking & ETA", "category": "client", "x": 80, "y": 260, "color": "#3b82f6" },
      { "id": "c3", "type": "service", "label": "Location Ingestion", "subLabel": "H3 Spatial Indexing", "category": "compute", "x": 320, "y": 120, "color": "#10b981" },
      { "id": "c4", "type": "service", "label": "Dispatch Engine", "subLabel": "Matching & ETA Calc", "category": "compute", "x": 320, "y": 260, "color": "#8b5cf6" }
    ]
  },
  {
    "problemId": "distributed-rate-limiter",
    "title": "Design a Global API Rate Limiter & Security Gateway (Cloudflare / Stripe)",
    "difficulty": "Medium",
    "domain": "API Gateways & Security Throttling",
    "description": "Design a distributed rate limiter and API gateway that protects backend microservices from DDoS, spam, and API quota abuse across multiple geographically distributed regions.",
    "functionalRequirements": [
      "Enforce flexible rate limits per IP, User ID, API Key, or endpoint (e.g., 100 requests/minute).",
      "Return HTTP 429 (Too Many Requests) with Retry-After headers when limit is exceeded.",
      "Support tiered quota tiers (Free vs. Pro vs. Enterprise accounts)."
    ],
    "nonFunctionalRequirements": [
      "Minimal latency overhead (<2ms added per API call).",
      "Accurate distributed counting across multiple edge gateway instances.",
      "High fault tolerance: Fallback policy (fail open vs fail closed) if rate limiter is unreachable."
    ],
    "scaleEstimates": [
      "Traffic: 500,000 API requests per second peak.",
      "Rules: 100,000 distinct tenant rate limit rule configurations."
    ],
    "keyArchitectureFocus": [
      "Rate Limiting Algorithms: Token Bucket, Leaky Bucket, Fixed Window, Sliding Window Log, Sliding Window Counter.",
      "Redis In-Memory Distributed Counters with atomic multi-exec or Lua scripts.",
      "Local Gateway In-Memory Caching with asynchronous batch synchronization to reduce Redis roundtrips.",
      "Distributed synchronization and cross-region synchronization trade-offs."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "API Clients", "subLabel": "SDKs / REST Callers", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "edge", "label": "API Gateway", "subLabel": "Rate Limiter Middleware", "category": "edge", "x": 300, "y": 180, "color": "#06b6d4" },
      { "id": "c3", "type": "cache", "label": "Redis Token Cluster", "subLabel": "Sliding Window Counters", "category": "cache", "x": 520, "y": 100, "color": "#ef4444" },
      { "id": "c4", "type": "service", "label": "Core Backend APIs", "subLabel": "Protected Microservices", "category": "compute", "x": 520, "y": 260, "color": "#10b981" }
    ]
  },
  {
    "problemId": "cloud-file-storage",
    "title": "Design Cloud File Storage & Sync Service (Google Drive / Dropbox)",
    "difficulty": "Hard",
    "domain": "Blob Storage, Chunking & Deduplication",
    "description": "Design a scalable cloud file hosting and synchronization service that allows users to upload, download, and synchronize files across multiple devices with block-level deduplication and delta sync.",
    "functionalRequirements": [
      "Upload and download files of arbitrary sizes (up to 50GB).",
      "Automatic file synchronization across desktop and mobile devices.",
      "File versioning, revision history, and conflict resolution.",
      "Block-level chunking and deduplication to save bandwidth and storage."
    ],
    "nonFunctionalRequirements": [
      "High Data Durability (99.999999999% 11 9s durability).",
      "Fast sync speeds with resumable and parallel multi-part uploads.",
      "Strong consistency for file metadata and folder hierarchies."
    ],
    "scaleEstimates": [
      "Users: 50 Million registered users, 10 Million DAU.",
      "Storage Volume: 100 Petabytes total storage.",
      "Upload QPS: 5,000 file chunks uploaded per second."
    ],
    "keyArchitectureFocus": [
      "Chunking Engine (splitting files into 4MB hashed blocks using SHA-256 for deduplication).",
      "Object Storage (AWS S3 / Ceph) for file chunks vs Relational/NoSQL (PostgreSQL/DynamoDB) for Metadata.",
      "Notification Service (WebSockets / Long Polling) for real-time file change sync alerts.",
      "Delta Sync: Uploading only modified chunks rather than the entire file."
    ],
    "starterComponents": [
      { "id": "c1", "type": "client", "label": "Desktop Sync Client", "subLabel": "Local File Watcher", "category": "client", "x": 80, "y": 180, "color": "#3b82f6" },
      { "id": "c2", "type": "edge", "label": "API Gateway", "subLabel": "Chunk Orchestrator", "category": "edge", "x": 280, "y": 180, "color": "#06b6d4" },
      { "id": "c3", "type": "storage", "label": "S3 Blob Storage", "subLabel": "4MB Deduplicated Chunks", "category": "storage", "x": 500, "y": 100, "color": "#f59e0b" },
      { "id": "c4", "type": "db", "label": "Metadata Database", "subLabel": "PostgreSQL File Tree", "category": "db", "x": 500, "y": 260, "color": "#3b82f6" }
    ]
  },
  {
    "problemId": "global-notification-service",
    "title": "Design a Global Notification & Alerting Service (Firebase FCM / Twilio)",
    "difficulty": "Medium",
    "domain": "Event-Driven Architecture & Message Prioritization",
    "description": "Design a multi-channel notification platform capable of delivering billions of Push notifications, SMS messages, and Emails per day with priority routing, rate limiting, and delivery status tracking.",
    "functionalRequirements": [
      "Support multi-channel dispatch: Mobile Push (APNS, FCM), SMS (Twilio), Email (SendGrid), In-App.",
      "Support user notification preferences and quiet hour settings.",
      "Priority queues: Critical OTP/2FA alerts must bypass marketing queues with <1s delivery.",
      "Deduplication and rate limiting (prevent sending duplicate notifications to users within a short window)."
    ],
    "nonFunctionalRequirements": [
      "High throughput handling 10 Billion notifications per day.",
      "Low latency for transactional/OTP alerts (<1 second).",
      "Fault tolerance and automatic retry with exponential backoff on vendor outages."
    ],
    "scaleEstimates": [
      "Volume: 10 Billion notifications/day (115,000/sec average, 500,000/sec peak during breaking news).",
      "Channels: 70% Push, 20% Email, 10% SMS."
    ],
    "keyArchitectureFocus": [
      "Prioritized Message Queues (Kafka / RabbitMQ) with separate Critical vs Marketing topics.",
      "Rate Limiting & Deduplication Layer with Redis Sliding Window.",
      "Third-party Vendor Circuit Breakers and fallback routing.",
      "Analytics & Delivery Tracking Pipeline (ClickHouse / Elasticsearch)."
    ],
    "starterComponents": [
      { "id": "c1", "type": "service", "label": "Business Microservices", "subLabel": "Auth / Order / Marketing", "category": "compute", "x": 80, "y": 180, "color": "#10b981" },
      { "id": "c2", "type": "edge", "label": "Notification Gateway", "subLabel": "Validation & Deduplication", "category": "edge", "x": 280, "y": 180, "color": "#06b6d4" },
      { "id": "c3", "type": "queue", "label": "Kafka Priority Queue", "subLabel": "High vs Normal Topics", "category": "queue", "x": 480, "y": 180, "color": "#ec4899" },
      { "id": "c4", "type": "service", "label": "Dispatch Workers", "subLabel": "APNS / FCM / Twilio", "category": "compute", "x": 680, "y": 180, "color": "#8b5cf6" }
    ]
  }
]
;

async function getScenarioForInterview({ problemId, domain, difficulty }) {
  if (problemId) {
    const found = CURATED_SCENARIOS.find(s => s.problemId === problemId);
    if (found) return found;
  }

  if (domain || difficulty) {
    const filtered = CURATED_SCENARIOS.filter(s => {
      let matches = true;
      if (difficulty) matches = matches && s.difficulty.toLowerCase() === difficulty.toLowerCase();
      if (domain) matches = matches && (s.domain.toLowerCase().includes(domain.toLowerCase()) || s.title.toLowerCase().includes(domain.toLowerCase()));
      return matches;
    });

    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }

  return CURATED_SCENARIOS[Math.floor(Math.random() * CURATED_SCENARIOS.length)];
}

module.exports = {
  CURATED_SCENARIOS,
  getScenarioForInterview
};