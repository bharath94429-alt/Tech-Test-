import { Question } from '../shared/types';

export const DEFAULT_OFFICIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: "Web Development",
    text: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Machine Language",
      "Hyperlink Text Management Language",
      "Home Tool Markup Language"
    ],
    correctIndex: 0
  },
  {
    id: 2,
    topic: "Web Development",
    text: "Which CSS property is used to create space around elements outside of any defined borders?",
    options: [
      "padding",
      "margin",
      "border-spacing",
      "outline-offset"
    ],
    correctIndex: 1
  },
  {
    id: 3,
    topic: "Algorithms & Data Structures",
    text: "What is the average and worst-case time complexity of searching in a balanced Binary Search Tree (BST) containing n nodes?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n log n)"
    ],
    correctIndex: 2
  },
  {
    id: 4,
    topic: "Databases",
    text: "Which SQL clause is specifically used to filter groups created by a GROUP BY clause using aggregate conditions?",
    options: [
      "WHERE",
      "HAVING",
      "ORDER BY",
      "FILTER BY"
    ],
    correctIndex: 1
  },
  {
    id: 5,
    topic: "Networking",
    text: "What is the default standard network port assigned for secure web traffic over HTTPS?",
    options: [
      "80",
      "8080",
      "443",
      "22"
    ],
    correctIndex: 2
  },
  {
    id: 6,
    topic: "Operating Systems",
    text: "Which OS memory management technique allows programs to execute even when their memory requirements exceed physical RAM?",
    options: [
      "Virtual Memory (Paging)",
      "Context Switching",
      "Thrashing Allocation",
      "Direct Memory Access (DMA)"
    ],
    correctIndex: 0
  },
  {
    id: 7,
    topic: "Cybersecurity",
    text: "Which security vulnerability occurs when untrusted user input is directly concatenated into a dynamic database query?",
    options: [
      "Cross-Site Scripting (XSS)",
      "SQL Injection (SQLi)",
      "Denial of Service (DoS)",
      "Buffer Overflow"
    ],
    correctIndex: 1
  },
  {
    id: 8,
    topic: "Artificial Intelligence",
    text: "Which machine learning paradigm involves training models on datasets where every input sample is paired with a verified target label?",
    options: [
      "Unsupervised Learning",
      "Reinforcement Learning",
      "Supervised Learning",
      "Self-Supervised Clustering"
    ],
    correctIndex: 2
  },
  {
    id: 9,
    topic: "Computer Hardware",
    text: "Which level of processor cache is physically closest to the execution units and provides the lowest latency data access?",
    options: [
      "L1 Cache",
      "L2 Cache",
      "L3 Cache",
      "System Main Memory"
    ],
    correctIndex: 0
  },
  {
    id: 10,
    topic: "General Technology",
    text: "In the Git version control system, which command combines the history of the specified branch into the current checked-out branch?",
    options: [
      "git fork",
      "git clone",
      "git merge",
      "git push --all"
    ],
    correctIndex: 2
  }
];
