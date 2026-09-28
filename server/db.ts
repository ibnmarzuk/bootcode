import fs from 'fs';
import path from 'path';
import {
  QuizEvent,
  QuizGame,
  Question,
  Participant,
  ParticipantAnswer,
  DocumentItem,
  AuditLog,
  LeaderboardEntry
} from '../src/types';

interface DatabaseSchema {
  events: QuizEvent[];
  games: QuizGame[];
  questions: Question[];
  documents: DocumentItem[];
  participants: Participant[];
  answers: ParticipantAnswer[];
  auditLogs: AuditLog[];
}

const DATA_FILE = path.resolve(process.cwd(), 'server-data.json');

// Realistic Initial Seed Data
const defaultEvents: QuizEvent[] = [
  {
    id: 'evt-skill-africa-50',
    name: 'SKILL AFRICA 5.0',
    description: 'Empowering 50,000+ tech learners and professionals across Africa with live real-time challenges in AI, Cloud, and Product.',
    eventDate: '2026-10-15',
    endDate: '2026-10-17',
    logoUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&h=200&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=400&fit=crop&q=80',
    organizerInfo: {
      name: 'Ibn Marzuk',
      email: 'ibnmarzuk207@gmail.com'
    },
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    gameIds: ['game-ai-challenge', 'game-social-media', 'game-digital-skills'],
    createdAt: new Date().toISOString()
  }
];

const defaultQuestions: Question[] = [
  {
    id: 'q-ai-1',
    text: 'What does LLM stand for in modern artificial intelligence?',
    options: [
      { id: 'A', text: 'Linear Logic Model' },
      { id: 'B', text: 'Large Language Model' },
      { id: 'C', text: 'Linked Latent Memory' },
      { id: 'D', text: 'Low Latency Matrix' }
    ],
    correctAnswer: 'B',
    explanation: 'LLM stands for Large Language Model, a type of neural network trained on vast amounts of text.',
    category: 'Artificial Intelligence',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 4,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-2',
    text: 'Which attention mechanism was introduced in the breakthrough paper "Attention Is All You Need"?',
    options: [
      { id: 'A', text: 'Self-Attention (Transformer)' },
      { id: 'B', text: 'Recurrent Memory Gate' },
      { id: 'C', text: 'Convolutional Pooling' },
      { id: 'D', text: 'Markovian State Cache' }
    ],
    correctAnswer: 'A',
    explanation: 'Vaswani et al. (2017) introduced the Transformer architecture based on multi-head self-attention mechanisms.',
    category: 'Artificial Intelligence',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 12,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-3',
    text: 'What is the primary role of "Temperature" in LLM text generation sampling?',
    options: [
      { id: 'A', text: 'Controls hardware cooling fan speeds' },
      { id: 'B', text: 'Determines the randomness and diversity of token selection' },
      { id: 'C', text: 'Sets the maximum context window token length' },
      { id: 'D', text: 'Measures model confidence in raw percentage' }
    ],
    correctAnswer: 'B',
    explanation: 'Temperature scales logits prior to softmax; lower values yield deterministic output while higher values increase randomness.',
    category: 'Machine Learning',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 28,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-4',
    text: 'What is RAG in contemporary enterprise AI architectures?',
    options: [
      { id: 'A', text: 'Random Asynchronous Generation' },
      { id: 'B', text: 'Retrieval-Augmented Generation' },
      { id: 'C', text: 'Recursive Audio Grammar' },
      { id: 'D', text: 'Rate-Adjusted Graph' }
    ],
    correctAnswer: 'B',
    explanation: 'Retrieval-Augmented Generation grounds LLMs with external authoritative documents before generating answers.',
    category: 'Artificial Intelligence',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 34,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-5',
    text: 'Which vector database metric is most commonly used for dense embedding semantic similarity?',
    options: [
      { id: 'A', text: 'Cosine Similarity' },
      { id: 'B', text: 'Hamming Weight' },
      { id: 'C', text: 'Levenshtein Distance' },
      { id: 'D', text: 'Flesch-Kincaid Index' }
    ],
    correctAnswer: 'A',
    explanation: 'Cosine similarity measures the cosine of the angle between two multi-dimensional dense vectors regardless of magnitude.',
    category: 'Databases',
    difficulty: 'HARD',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 42,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-sm-1',
    text: 'What algorithm signal prioritizes content on modern feed-based social networks?',
    options: [
      { id: 'A', text: 'Meaningful engagement (comments, shares, watch duration)' },
      { id: 'B', text: 'Alphabetical username order' },
      { id: 'C', text: 'Reverse chronological order only' },
      { id: 'D', text: 'File compression ratio' }
    ],
    correctAnswer: 'A',
    explanation: 'High dwell time, active commenting, and shares are heavily weighted in distribution ranking algorithms.',
    category: 'Social Media',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ds-1',
    text: 'Which HTTP status code represents an unauthorized request requiring authentication?',
    options: [
      { id: 'A', text: '200 OK' },
      { id: 'B', text: '401 Unauthorized' },
      { id: 'C', text: '404 Not Found' },
      { id: 'D', text: '500 Internal Server Error' }
    ],
    correctAnswer: 'B',
    explanation: 'HTTP 401 denotes lack of valid authentication credentials for the target resource.',
    category: 'Web Architecture',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-6',
    text: 'What is the function of positional encoding in Transformer networks?',
    options: [
      { id: 'A', text: 'Encodes word sequence order into permutation-invariant attention' },
      { id: 'B', text: 'Compresses vocabulary size into byte-pair tokens' },
      { id: 'C', text: 'Encrypts embeddings against prompt injection attacks' },
      { id: 'D', text: 'Calculates cross-entropy loss during backpropagation' }
    ],
    correctAnswer: 'A',
    explanation: 'Since self-attention processes all tokens in parallel, positional encodings supply order information.',
    category: 'Deep Learning',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 14,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-7',
    text: 'What does RLHF stand for in large language model post-training?',
    options: [
      { id: 'A', text: 'Reinforcement Learning from Human Feedback' },
      { id: 'B', text: 'Recursive Latent Hyperparameter Fitting' },
      { id: 'C', text: 'Rate-Limited Heuristic Filtering' },
      { id: 'D', text: 'Residual Layer Hardmax Function' }
    ],
    correctAnswer: 'A',
    explanation: 'RLHF aligns raw base models with human preferences using reward models and PPO or DPO.',
    category: 'Artificial Intelligence',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 22,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-8',
    text: 'Which quantization format reduces weights to 4 bits while preserving high task perplexity?',
    options: [
      { id: 'A', text: 'AWQ / GPTQ' },
      { id: 'B', text: 'FP64 Double Precision' },
      { id: 'C', text: 'ASCII String Hex' },
      { id: 'D', text: 'BFloat32' }
    ],
    correctAnswer: 'A',
    explanation: 'Activation-aware Weight Quantization (AWQ) and GPTQ compress model weights to 4-bit integers efficiently.',
    category: 'Machine Learning',
    difficulty: 'HARD',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 38,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-9',
    text: 'What does LoRA stand for in parameter-efficient fine-tuning (PEFT)?',
    options: [
      { id: 'A', text: 'Low-Rank Adaptation' },
      { id: 'B', text: 'Long Range Attention' },
      { id: 'C', text: 'Linear Output Reduction Algorithm' },
      { id: 'D', text: 'Latent Online Reward Architecture' }
    ],
    correctAnswer: 'A',
    explanation: 'LoRA freezes pretrained weights and injects trainable rank-decomposition matrices into transformer layers.',
    category: 'Machine Learning',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    sourceDocument: 'Intro_to_AI_Curriculum_2026.pdf',
    sourcePage: 45,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-10',
    text: 'What is the primary role of a System Prompt in instruction-tuned conversational models?',
    options: [
      { id: 'A', text: 'Establishes persistent behavioral persona and boundary constraints' },
      { id: 'B', text: 'Increases the clock frequency of the GPU memory' },
      { id: 'C', text: 'Calculates cosine similarity of output vectors' },
      { id: 'D', text: 'Converts English audio into Spanish subtitles' }
    ],
    correctAnswer: 'A',
    explanation: 'System instructions define the model persona, tone, guidelines, and behavioral boundaries.',
    category: 'Prompt Engineering',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-11',
    text: 'What is the advantage of FlashAttention over vanilla self-attention implementations?',
    options: [
      { id: 'A', text: 'IO-awareness with tiling to avoid slow GPU High Bandwidth Memory reads' },
      { id: 'B', text: 'Removes the need for vector embeddings' },
      { id: 'C', text: 'Replaces backpropagation with evolutionary heuristics' },
      { id: 'D', text: 'Converts Python code into assembly language' }
    ],
    correctAnswer: 'A',
    explanation: 'FlashAttention reorganizes attention computation into tiles stored in fast on-chip SRAM.',
    category: 'Deep Learning',
    difficulty: 'HARD',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-12',
    text: 'What is "Hallucination" in the context of generative AI models?',
    options: [
      { id: 'A', text: 'Generating plausible-sounding but factually false or ungrounded assertions' },
      { id: 'B', text: 'A hardware overheating cycle on NVIDIA H100 servers' },
      { id: 'C', text: 'The compression phase of token serialization' },
      { id: 'D', text: 'Dropping TCP packets during WebSocket handshakes' }
    ],
    correctAnswer: 'A',
    explanation: 'Hallucination occurs when a model produces confident output unsupported by factual reality.',
    category: 'Artificial Intelligence',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-13',
    text: 'Which data structure is optimal for sub-millisecond Approximate Nearest Neighbor vector search?',
    options: [
      { id: 'A', text: 'HNSW (Hierarchical Navigable Small World)' },
      { id: 'B', text: 'Linked List with sequential traversal' },
      { id: 'C', text: 'Circular FIFO Queue' },
      { id: 'D', text: 'Binary Heap Priority Queue' }
    ],
    correctAnswer: 'A',
    explanation: 'HNSW builds multi-layer proximity graphs providing logarithmic search times in dense vector spaces.',
    category: 'Databases',
    difficulty: 'HARD',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-14',
    text: 'In cloud computing, what does "Scale-to-Zero" mean for serverless deployments?',
    options: [
      { id: 'A', text: 'Container instances shut down when idle so costs drop to zero' },
      { id: 'B', text: 'Network bandwidth is throttled to 0 kbps' },
      { id: 'C', text: 'Hard drives erase all stored files automatically' },
      { id: 'D', text: 'Database tables drop all schema columns' }
    ],
    correctAnswer: 'A',
    explanation: 'Scale-to-zero terminates idle compute instances, only spinning up when incoming traffic arrives.',
    category: 'Cloud Architecture',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-15',
    text: 'What is the purpose of CORS (Cross-Origin Resource Sharing) in browser web security?',
    options: [
      { id: 'A', text: 'Restricts web pages from requesting APIs from a different origin domain' },
      { id: 'B', text: 'Compresses JPEG photos into WebP format' },
      { id: 'C', text: 'Measures internet download ping times' },
      { id: 'D', text: 'Encrypts local hard drives with BitLocker' }
    ],
    correctAnswer: 'A',
    explanation: 'CORS uses HTTP headers to tell browsers whether requests from other origins are allowed.',
    category: 'Web Architecture',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-16',
    text: 'Which protocol enables full-duplex, persistent two-way communication between client and server?',
    options: [
      { id: 'A', text: 'WebSockets (ws://)' },
      { id: 'B', text: 'Standard HTTP/1.0' },
      { id: 'C', text: 'SMTP Email protocol' },
      { id: 'D', text: 'DNS lookup queries' }
    ],
    correctAnswer: 'A',
    explanation: 'WebSockets maintain open TCP connections allowing real-time bidirectional message exchange.',
    category: 'Web Architecture',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-17',
    text: 'What is the time complexity of looking up a key in a balanced Hash Map on average?',
    options: [
      { id: 'A', text: 'O(1) Constant Time' },
      { id: 'B', text: 'O(N) Linear Time' },
      { id: 'C', text: 'O(N^2) Quadratic Time' },
      { id: 'D', text: 'O(N!) Factorial Time' }
    ],
    correctAnswer: 'A',
    explanation: 'Hash maps compute bucket indices via hashing functions, resulting in average O(1) retrieval.',
    category: 'Computer Science',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-18',
    text: 'Which design pattern is used when a server notifies multiple subscribed clients of state changes?',
    options: [
      { id: 'A', text: 'Observer / Pub-Sub pattern' },
      { id: 'B', text: 'Singleton pattern' },
      { id: 'C', text: 'Decorator pattern' },
      { id: 'D', text: 'Facade pattern' }
    ],
    correctAnswer: 'A',
    explanation: 'Publish-Subscribe (Pub-Sub) broadcasts events from publishers to all registered subscriber rooms.',
    category: 'Software Design',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-19',
    text: 'What does "Server-Authoritative Timing" prevent in real-time online games?',
    options: [
      { id: 'A', text: 'Cheating through client-side clock tampering and late answer spoofing' },
      { id: 'B', text: 'Server memory leaks' },
      { id: 'C', text: 'CSS styling bugs on mobile screens' },
      { id: 'D', text: 'DNS cache expiration errors' }
    ],
    correctAnswer: 'A',
    explanation: 'Server-authoritative timing enforces expiration based on the host server clock, ignoring tampered client timestamps.',
    category: 'Software Design',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-20',
    text: 'What is the main goal of Continuous Integration (CI) in modern DevOps pipelines?',
    options: [
      { id: 'A', text: 'Automating code builds, linting, and automated tests on every push' },
      { id: 'B', text: 'Manually emailing code zip files to production servers' },
      { id: 'C', text: 'Preventing developers from writing unit tests' },
      { id: 'D', text: 'Shutting down staging environments on weekends' }
    ],
    correctAnswer: 'A',
    explanation: 'CI validates software changes continuously through automated build, type-check, and test suites.',
    category: 'DevOps',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-21',
    text: 'Which HTTP method is specifically idempotent for replacing a complete resource representation?',
    options: [
      { id: 'A', text: 'PUT' },
      { id: 'B', text: 'POST' },
      { id: 'C', text: 'PATCH' },
      { id: 'D', text: 'CONNECT' }
    ],
    correctAnswer: 'A',
    explanation: 'HTTP PUT is idempotent; executing the identical PUT request multiple times leaves the server state identical.',
    category: 'Web Architecture',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-22',
    text: 'What is the purpose of JWT (JSON Web Token) signatures in stateless authentication?',
    options: [
      { id: 'A', text: 'Ensures the payload has not been tampered with by clients or intermediaries' },
      { id: 'B', text: 'Encrypts the token so nobody can read the payload fields' },
      { id: 'C', text: 'Stores database passwords in plain text' },
      { id: 'D', text: 'Limits token transfer speed to 10kbps' }
    ],
    correctAnswer: 'A',
    explanation: 'Cryptographic HMAC or RSA signatures allow verifying token authenticity without database lookups.',
    category: 'Cybersecurity',
    difficulty: 'MEDIUM',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-23',
    text: 'In distributed databases, what does the CAP theorem state is impossible to guarantee simultaneously in a partition?',
    options: [
      { id: 'A', text: 'Consistency and Availability' },
      { id: 'B', text: 'Encryption and Compression' },
      { id: 'C', text: 'Memory and CPU speed' },
      { id: 'D', text: 'JSON and XML serialization' }
    ],
    correctAnswer: 'A',
    explanation: 'During a network partition, distributed systems must choose between Consistency or Availability.',
    category: 'Databases',
    difficulty: 'HARD',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-24',
    text: 'What is the purpose of Docker containerization in software deployment?',
    options: [
      { id: 'A', text: 'Packages application code with all dependencies into immutable, portable images' },
      { id: 'B', text: 'Replaces the Linux operating system kernel with Python' },
      { id: 'C', text: 'Doubles the physical RAM of motherboard slots' },
      { id: 'D', text: 'Monitors user keystrokes in background threads' }
    ],
    correctAnswer: 'A',
    explanation: 'Containers package dependencies and code together so apps run reliably across any cloud environment.',
    category: 'DevOps',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-ai-25',
    text: 'What is the primary role of Redis in high-throughput real-time web applications?',
    options: [
      { id: 'A', text: 'In-memory key-value caching and sub-millisecond pub/sub message brokering' },
      { id: 'B', text: 'Rendering 3D graphic models in the browser' },
      { id: 'C', text: 'Replacing CSS grid layout stylesheets' },
      { id: 'D', text: 'Compiling TypeScript into WebAssembly' }
    ],
    correctAnswer: 'A',
    explanation: 'Redis keeps data in RAM, serving millions of operations per second with microsecond latencies.',
    category: 'Databases',
    difficulty: 'EASY',
    points: 1,
    timeLimit: 5,
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  }
];

const defaultGames: QuizGame[] = [
  {
    id: 'game-ai-challenge',
    eventId: 'evt-skill-africa-50',
    name: 'AI Challenge (Skill Africa)',
    description: 'High-speed live test on Transformers, LLMs, RAG, and Vector Retrieval.',
    joinCode: 'SA50AI',
    status: 'LOBBY',
    questionIds: [
      'q-ai-1', 'q-ai-2', 'q-ai-3', 'q-ai-4', 'q-ai-5',
      'q-ai-6', 'q-ai-7', 'q-ai-8', 'q-ai-9', 'q-ai-10',
      'q-ai-11', 'q-ai-12', 'q-ai-13', 'q-ai-14', 'q-ai-15',
      'q-ai-16', 'q-ai-17', 'q-ai-18', 'q-ai-19', 'q-ai-20'
    ],
    timePerQuestion: 5,
    pointsPerCorrect: 1,
    leaderboardVisibility: 'AFTER_EACH',
    randomizeQuestions: false,
    randomizeOptions: false,
    maxParticipants: 1000,
    currentQuestionIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-social-media',
    eventId: 'evt-skill-africa-50',
    name: 'Social Media Challenge',
    description: 'Rapid-fire digital marketing and viral growth quiz.',
    joinCode: 'SA50SM',
    status: 'READY',
    questionIds: ['q-sm-1'],
    timePerQuestion: 5,
    pointsPerCorrect: 1,
    leaderboardVisibility: 'FINAL_ONLY',
    randomizeQuestions: true,
    randomizeOptions: true,
    maxParticipants: 500,
    currentQuestionIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-digital-skills',
    eventId: 'evt-skill-africa-50',
    name: 'Digital Skills Challenge',
    description: 'Essential web tech and internet literacy showdown.',
    joinCode: 'SA50DS',
    status: 'READY',
    questionIds: ['q-ds-1'],
    timePerQuestion: 5,
    pointsPerCorrect: 1,
    leaderboardVisibility: 'AFTER_EACH',
    randomizeQuestions: false,
    randomizeOptions: false,
    maxParticipants: 500,
    currentQuestionIndex: 0,
    createdAt: new Date().toISOString()
  }
];

const defaultDocuments: DocumentItem[] = [
  {
    id: 'doc-intro-ai',
    filename: 'Intro_to_AI_Curriculum_2026.pdf',
    size: 2450000,
    uploadDate: new Date().toISOString(),
    status: 'READY',
    pageCount: 48,
    textExtractionStatus: 'SUCCESS',
    chunks: [
      {
        id: 'chunk-1',
        documentId: 'doc-intro-ai',
        page: 4,
        section: 'Module 1: Foundations of LLMs',
        text: 'Large Language Models (LLMs) represent foundational neural architectures trained on billions of tokens. Transformers utilize self-attention mechanisms to weigh contextual relationships across arbitrary sequence distances.'
      },
      {
        id: 'chunk-2',
        documentId: 'doc-intro-ai',
        page: 12,
        section: 'Module 2: Self-Attention & Transformers',
        text: 'The Transformer architecture, introduced by Vaswani et al. in 2017, eliminated recurrence entirely in favor of multi-head self-attention. This allows unprecedented parallelization across GPU clusters during pre-training.'
      },
      {
        id: 'chunk-3',
        documentId: 'doc-intro-ai',
        page: 34,
        section: 'Module 3: Retrieval-Augmented Generation',
        text: 'Retrieval-Augmented Generation (RAG) combines dense semantic retrieval with parametric generator models. By indexing proprietary enterprise knowledge bases into vector spaces using cosine similarity, hallucinations are dramatically reduced.'
      }
    ],
    questionsGeneratedCount: 5
  }
];

const defaultParticipants: Participant[] = [
  {
    id: 'part-tunde-01',
    gameId: 'game-ai-challenge',
    eventId: 'evt-skill-africa-50',
    firstName: 'Tunde',
    username: 'tunde_dev',
    joinedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isConnected: true,
    score: 3,
    correctAnswers: 3,
    wrongAnswers: 0,
    unanswered: 0,
    totalResponseTimeMs: 4200,
    lastActiveAt: new Date().toISOString()
  },
  {
    id: 'part-amina-02',
    gameId: 'game-ai-challenge',
    eventId: 'evt-skill-africa-50',
    firstName: 'Amina',
    username: 'amina_ai',
    joinedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    isConnected: true,
    score: 2,
    correctAnswers: 2,
    wrongAnswers: 1,
    unanswered: 0,
    totalResponseTimeMs: 3800,
    lastActiveAt: new Date().toISOString()
  },
  {
    id: 'part-chidi-03',
    gameId: 'game-ai-challenge',
    eventId: 'evt-skill-africa-50',
    firstName: 'Chidi',
    username: 'chidi_cloud',
    joinedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    isConnected: true,
    score: 2,
    correctAnswers: 2,
    wrongAnswers: 1,
    unanswered: 0,
    totalResponseTimeMs: 5100,
    lastActiveAt: new Date().toISOString()
  }
];

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.questions)) {
          for (const dq of defaultQuestions) {
            if (!parsed.questions.some((q: any) => q.id === dq.id)) {
              parsed.questions.push(dq);
            }
          }
          const aiGame = parsed.games?.find((g: any) => g.id === 'game-ai-challenge');
          if (aiGame && aiGame.questionIds.length < 10) {
            aiGame.questionIds = defaultGames[0].questionIds;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read existing data file, initializing fresh store:', e);
    }

    const initial: DatabaseSchema = {
      events: defaultEvents,
      games: defaultGames,
      questions: defaultQuestions,
      documents: defaultDocuments,
      participants: defaultParticipants,
      answers: [],
      auditLogs: [
        {
          id: 'log-seed-1',
          action: 'EVENT_INITIALIZED',
          details: 'Initialized Skill Africa 5.0 event with AI, Social Media, and Digital Skills challenges.',
          timestamp: new Date().toISOString(),
          actor: 'System Seed'
        }
      ]
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    try {
      const payload = dataToSave || this.data;
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database file:', e);
    }
  }

  // --- EVENTS ---
  getEvents(): QuizEvent[] {
    return this.data.events;
  }

  getEventById(id: string): QuizEvent | undefined {
    return this.data.events.find(e => e.id === id);
  }

  saveEvent(event: QuizEvent): QuizEvent {
    const idx = this.data.events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      this.data.events[idx] = event;
    } else {
      this.data.events.unshift(event);
    }
    this.addAuditLog('EVENT_SAVED', `Saved event ${event.name} (${event.id})`, 'Organizer');
    this.saveData();
    return event;
  }

  deleteEvent(id: string): boolean {
    const idx = this.data.events.findIndex(e => e.id === id);
    if (idx >= 0) {
      const removed = this.data.events.splice(idx, 1)[0];
      this.addAuditLog('EVENT_DELETED', `Deleted event ${removed.name} (${id})`, 'Organizer');
      this.saveData();
      return true;
    }
    return false;
  }

  // --- GAMES ---
  getGames(eventId?: string): QuizGame[] {
    if (eventId) {
      return this.data.games.filter(g => g.eventId === eventId);
    }
    return this.data.games;
  }

  getGameById(id: string): QuizGame | undefined {
    return this.data.games.find(g => g.id === id);
  }

  getGameByJoinCode(joinCode: string): QuizGame | undefined {
    const code = joinCode.trim().toUpperCase();
    return this.data.games.find(g => g.joinCode.toUpperCase() === code);
  }

  saveGame(game: QuizGame): QuizGame {
    const idx = this.data.games.findIndex(g => g.id === game.id);
    if (idx >= 0) {
      this.data.games[idx] = game;
    } else {
      this.data.games.unshift(game);
      // Link to event if exists
      const event = this.getEventById(game.eventId);
      if (event && !event.gameIds.includes(game.id)) {
        event.gameIds.push(game.id);
      }
    }
    this.addAuditLog('GAME_SAVED', `Saved game ${game.name} [${game.joinCode}]`, 'Organizer');
    this.saveData();
    return game;
  }

  updateGameStatus(gameId: string, status: QuizGame['status']): QuizGame | undefined {
    const game = this.getGameById(gameId);
    if (game) {
      game.status = status;
      if (status === 'LIVE' && !game.startedAt) {
        game.startedAt = new Date().toISOString();
      }
      if (status === 'COMPLETED' && !game.endedAt) {
        game.endedAt = new Date().toISOString();
      }
      this.addAuditLog('GAME_STATUS_CHANGED', `Game ${game.name} transition to ${status}`, 'Host');
      this.saveData();
    }
    return game;
  }

  deleteGame(id: string): boolean {
    const idx = this.data.games.findIndex(g => g.id === id);
    if (idx >= 0) {
      const removed = this.data.games.splice(idx, 1)[0];
      this.addAuditLog('GAME_DELETED', `Deleted game ${removed.name} (${id})`, 'Organizer');
      this.saveData();
      return true;
    }
    return false;
  }

  // --- QUESTIONS ---
  getQuestions(filter?: { category?: string; difficulty?: string; status?: string; search?: string }): Question[] {
    let list = this.data.questions;
    if (!filter) return list;

    if (filter.category) {
      list = list.filter(q => q.category === filter.category);
    }
    if (filter.difficulty) {
      list = list.filter(q => q.difficulty === filter.difficulty);
    }
    if (filter.status) {
      list = list.filter(q => q.status === filter.status);
    }
    if (filter.search) {
      const s = filter.search.toLowerCase();
      list = list.filter(q => q.text.toLowerCase().includes(s) || q.category.toLowerCase().includes(s));
    }
    return list;
  }

  getQuestionById(id: string): Question | undefined {
    return this.data.questions.find(q => q.id === id);
  }

  saveQuestion(question: Question): Question {
    const idx = this.data.questions.findIndex(q => q.id === question.id);
    if (idx >= 0) {
      this.data.questions[idx] = question;
    } else {
      this.data.questions.unshift(question);
    }
    this.saveData();
    return question;
  }

  bulkAddQuestions(questions: Question[]): Question[] {
    for (const q of questions) {
      this.saveQuestion(q);
    }
    this.addAuditLog('QUESTIONS_BULK_ADDED', `Added ${questions.length} questions`, 'AI / Organizer');
    this.saveData();
    return questions;
  }

  approveAllQuestions(): number {
    let count = 0;
    for (const q of this.data.questions) {
      if (q.status !== 'APPROVED') {
        q.status = 'APPROVED';
        count++;
      }
    }
    if (count > 0) {
      this.addAuditLog('QUESTIONS_BULK_APPROVED', `Approved ${count} questions`, 'Organizer');
      this.saveData();
    }
    return count;
  }

  updateQuestionStatus(id: string, status: Question['status']): Question | undefined {
    const q = this.getQuestionById(id);
    if (q) {
      q.status = status;
      this.saveData();
    }
    return q;
  }

  deleteQuestion(id: string): boolean {
    const idx = this.data.questions.findIndex(q => q.id === id);
    if (idx >= 0) {
      this.data.questions.splice(idx, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // --- DOCUMENTS ---
  getDocuments(): DocumentItem[] {
    return this.data.documents;
  }

  getDocumentById(id: string): DocumentItem | undefined {
    return this.data.documents.find(d => d.id === id);
  }

  saveDocument(doc: DocumentItem): DocumentItem {
    const idx = this.data.documents.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
      this.data.documents[idx] = doc;
    } else {
      this.data.documents.unshift(doc);
    }
    this.addAuditLog('DOCUMENT_UPLOADED', `Uploaded document ${doc.filename}`, 'Organizer');
    this.saveData();
    return doc;
  }

  deleteDocument(id: string): boolean {
    const idx = this.data.documents.findIndex(d => d.id === id);
    if (idx >= 0) {
      const removed = this.data.documents.splice(idx, 1)[0];
      this.addAuditLog('DOCUMENT_DELETED', `Deleted document ${removed.filename}`, 'Organizer');
      this.saveData();
      return true;
    }
    return false;
  }

  // --- PARTICIPANTS ---
  getParticipants(gameId: string): Participant[] {
    return this.data.participants.filter(p => p.gameId === gameId);
  }

  getParticipantById(id: string): Participant | undefined {
    return this.data.participants.find(p => p.id === id);
  }

  getParticipantByUsername(gameId: string, username: string): Participant | undefined {
    const u = username.trim().toLowerCase();
    return this.data.participants.find(p => p.gameId === gameId && p.username.toLowerCase() === u);
  }

  saveParticipant(participant: Participant): Participant {
    const idx = this.data.participants.findIndex(p => p.id === participant.id);
    if (idx >= 0) {
      this.data.participants[idx] = participant;
    } else {
      this.data.participants.push(participant);
    }
    this.saveData();
    return participant;
  }

  setParticipantConnection(id: string, isConnected: boolean): void {
    const p = this.getParticipantById(id);
    if (p) {
      p.isConnected = isConnected;
      p.lastActiveAt = new Date().toISOString();
      this.saveData();
    }
  }

  // --- ANSWERS ---
  getAnswers(gameId: string, questionId?: string): ParticipantAnswer[] {
    return this.data.answers.filter(a => a.gameId === gameId && (!questionId || a.questionId === questionId));
  }

  recordAnswer(answer: ParticipantAnswer): void {
    // Check if participant already answered this question
    const existing = this.data.answers.find(
      a => a.participantId === answer.participantId && a.questionId === answer.questionId
    );
    if (existing) {
      return; // locked
    }
    this.data.answers.push(answer);

    // Update participant scoring
    const participant = this.getParticipantById(answer.participantId);
    if (participant) {
      if (answer.isCorrect) {
        participant.score += answer.pointsAwarded;
        participant.correctAnswers += 1;
      } else {
        participant.wrongAnswers += 1;
      }
      participant.totalResponseTimeMs += answer.responseTimeMs;
      participant.lastActiveAt = new Date().toISOString();
    }
    this.saveData();
  }

  recordUnanswered(participantId: string, gameId: string, questionId: string): void {
    const existing = this.data.answers.find(
      a => a.participantId === participantId && a.questionId === questionId
    );
    if (!existing) {
      const participant = this.getParticipantById(participantId);
      if (participant) {
        participant.unanswered += 1;
        this.saveData();
      }
    }
  }

  // --- LEADERBOARD ---
  calculateLeaderboard(gameId: string): LeaderboardEntry[] {
    const participants = this.getParticipants(gameId);

    // Sort by Score descending, then by average response time ascending
    const sorted = [...participants].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aAvg = a.correctAnswers > 0 ? a.totalResponseTimeMs / a.correctAnswers : 999999;
      const bAvg = b.correctAnswers > 0 ? b.totalResponseTimeMs / b.correctAnswers : 999999;
      return aAvg - bAvg;
    });

    return sorted.map((p, index) => {
      const totalAttempted = p.correctAnswers + p.wrongAnswers + p.unanswered;
      const accuracy = totalAttempted > 0 ? Math.round((p.correctAnswers / totalAttempted) * 100) : 0;
      const avgResponseTimeMs = p.correctAnswers + p.wrongAnswers > 0
        ? Math.round(p.totalResponseTimeMs / (p.correctAnswers + p.wrongAnswers))
        : 0;

      return {
        rank: index + 1,
        participantId: p.id,
        firstName: p.firstName,
        username: p.username,
        score: p.score,
        correctAnswers: p.correctAnswers,
        wrongAnswers: p.wrongAnswers,
        unanswered: p.unanswered,
        accuracy,
        avgResponseTimeMs
      };
    });
  }

  // --- AUDIT LOGS ---
  addAuditLog(action: string, details: string, actor: string = 'System'): void {
    this.data.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
      actor
    });
    // keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }
}

export const db = new DatabaseStore();
