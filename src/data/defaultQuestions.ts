import { Question } from '../shared/types';

export const DEFAULT_OFFICIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: "Data Structures",
    text: "Which data structure follows the LIFO principle?",
    options: [
      "Linked List",
      "Tree",
      "Stack",
      "Queue"
    ],
    correctIndex: 2
  },
  {
    id: 2,
    topic: "Databases",
    text: "Which normal form is primarily associated with removing transitive dependencies in a relational database?",
    options: [
      "First Normal Form (1NF)",
      "Third Normal Form (3NF)",
      "Second Normal Form (2NF)",
      "Fourth Normal Form (4NF)"
    ],
    correctIndex: 1
  },
  {
    id: 3,
    topic: "Object-Oriented Programming",
    text: "In object-oriented programming, which concept allows a subclass to provide a specific implementation of a method already defined in its superclass?",
    options: [
      "Inheritance",
      "Abstraction",
      "Encapsulation",
      "Method overriding"
    ],
    correctIndex: 3
  },
  {
    id: 4,
    topic: "Web & Networking",
    text: "Which protocol is commonly used to securely transfer web data between a browser and a web server?",
    options: [
      "HTTPS",
      "HTTP",
      "SMTP",
      "FTP"
    ],
    correctIndex: 0
  },
  {
    id: 5,
    topic: "Operating Systems",
    text: "Which operating-system technique allows multiple processes to share CPU time so that they appear to run concurrently?",
    options: [
      "Paging",
      "Time sharing",
      "Booting",
      "Spooling"
    ],
    correctIndex: 1
  }
];
