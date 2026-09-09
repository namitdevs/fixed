Create a professional README.md for my project titled:

AI-Powered Criminal Network Analysis System

The README should present this as a serious academic/SIH-style investigation intelligence platform, not as a generic AI project.

Include the following sections:

1. Project Title
2. Overview
3. Problem Statement
4. Proposed Solution
5. Key Features
6. System Architecture
7. Investigation Workflow
8. Technology Stack
9. Project Structure
10. Data Sources Supported
11. Entity Extraction
12. Criminal Relationship Graph
13. Entity Resolution
14. Network Analysis
15. Community Detection
16. Suspicious Pattern Detection
17. Timeline Analysis
18. AI Investigation Assistant
19. Investigation Reports
20. Demo Case
21. Responsible AI / Ethical Considerations
22. Security Considerations
23. Installation and Local Setup
24. Environment Variables
25. Development Phases
26. Future Improvements
27. Disclaimer
28. License

Project details:

The system is designed to help investigators analyze fragmented crime and intelligence data from sources such as FIRs, police reports, CDRs, financial transactions, surveillance reports, social intelligence, and criminal history databases.

The system converts fragmented information into structured entities and relationships.

Entities include:

- Persons
- Phone numbers
- Vehicles
- Locations
- Organizations
- Financial accounts
- Cases
- Incidents
- Dates

Relationships include:

- CALLED
- TRANSFERRED_MONEY
- MET
- WORKS_FOR
- OWNS
- USED
- VISITED
- ASSOCIATED_WITH
- TRAVELLED_TO
- MENTIONED_IN

The system builds an interactive criminal relationship graph where investigators can:

- Search entities
- Explore connections
- Zoom and navigate the graph
- Filter relationships
- Inspect entity information
- Trace relationships back to their original evidence

The system also performs entity resolution. For example:

Ravi Sharma
R. Sharma
Ravi S.

can be identified as a potential match with a confidence level instead of blindly merging the records.

The AI/ML layer performs:

- Degree centrality
- Betweenness centrality
- Network analysis
- Community detection
- Suspicious pattern detection
- Communication spike detection
- Transaction chain analysis
- Shared phone/vehicle/account detection
- Temporal correlation analysis
- Investigation relevance scoring
- Evidence-grounded AI explanations

Important: The system must NOT be described as predicting criminals or determining guilt. Scores represent network relevance or investigative priority based on available data and should not be presented as proof of criminal activity.

The AI assistant should be described as an evidence-grounded investigation assistant that helps investigators understand why an entity, relationship, or pattern may be important based on information already available in the case database and investigation graph.

The main workflow is:

Investigation Case
→ Data Sources
→ Upload Documents / Records
→ Parse & Normalize
→ Extract Entities
→ Extract Relationships
→ Entity Resolution
→ Build Investigation Graph
→ Network Analysis
→ Community Detection
→ Pattern Detection
→ Timeline Analysis
→ Investigation Relevance
→ AI Explanation
→ Investigator Review
→ Investigation Report

Technology stack:

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- Cytoscape.js

Backend:
- Node.js
- TypeScript
- Express.js
- REST APIs
- Zod

Database:
- Prisma ORM
- SQLite for local development
- PostgreSQL-ready architecture

Graph / Analytics:
- Graphology
- Graph-based network metrics
- Community detection
- Relationship analysis

AI:
- Google Gemini API

Documents / Reports:
- PDF parsing
- PDF report generation
- CSV export
- JSON export

The project is organized approximately as:

proto/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md

The project has four development phases:

Phase 1 — Foundation, Data Pipeline & Case Management
- Authentication
- Case management
- Data ingestion
- Document processing
- Data normalization
- Database architecture
- Backend APIs

Phase 2 — Entity Extraction & Criminal Relationship Graph
- Entity extraction
- Relationship extraction
- Entity resolution
- Evidence provenance
- Interactive investigation graph

Phase 3 — AI/ML Network Intelligence
- Graph metrics
- Community detection
- Suspicious pattern detection
- Timeline analysis
- Investigation relevance scoring
- Evidence-grounded AI assistant

Phase 4 — Investigator Dashboard, Reports & Final Integration
- Investigation dashboard
- Entity profiles
- Evidence viewer
- Alerts
- AI assistant
- Reports
- Export functionality
- Demo workflow
- Final integration

The project includes a synthetic demonstration case:

Operation Nightfall
CASE-2026-001

Make it clear that the demo uses synthetic/authorized data and does not represent real criminal records.

For the architecture section, include a clean ASCII diagram showing:

React Frontend
↓
Node.js + Express REST API
↓
Data Pipeline / Investigation Graph / AI & ML
↓
Prisma Database

For the investigation workflow, include a clean ASCII flow diagram.

For the Responsible AI section, explain that:

- The system supports investigators rather than replacing them.
- Network relevance does not equal guilt.
- Suspicious patterns require human investigation and verification.
- Uncertain entity matches should be reviewed.
- Evidence provenance should be preserved.
- AI-generated explanations should be grounded in available case data.
- The system should not be used as the sole basis for legal or law-enforcement decisions.

For the Security section mention:

- Authentication
- Authorization
- JWT-based sessions
- Input validation
- Protected API routes
- CORS
- Error handling
- Evidence provenance
- Audit-oriented architecture

For local setup, provide commands for:

Backend:

cd backend
npm install
npm run dev

Frontend:

cd frontend
npm install
npm run dev

Mention that the backend runs on port 5000 and the frontend on port 3000 during local development.

Include an environment variable example but clearly warn users NOT to commit real API keys, secrets, passwords, or .env files to GitHub.

The README should be polished, concise enough to read easily, but detailed enough for someone visiting the GitHub repository to understand the project's purpose, architecture, features, technologies, and investigation workflow.

Use professional technical language.

Do not use excessive emojis.

Do not make exaggerated claims such as "revolutionary", "100% accurate", or "predicts criminals".

Do not describe the project as a generic chatbot.

Make the README look like it belongs to a serious Computer Science engineering/SIH project.
