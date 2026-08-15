# NIVARAN: Centralized Public Grievance Redress & AI Auto-Clustering Platform

NIVARAN is an artificial intelligence-driven civic governance portal built for the Department of Administrative Reforms and Public Grievances (DARPG), Government of India. The platform streamlines citizen complaint lodging, vectorizes textual and voice complaints in real time, auto-categorizes departmental dispatches, identifies municipal ward duplicates to prevent redundant field work, and enforces mandatory 24-hour Service Level Agreement (SLA) resolution windows.

---

## Technical Stack

### Frontend Architecture
- Framework: React 18 with TypeScript (Vite bundler)
- Styling: Tailwind CSS v4 with custom dark/light theme tokens
- Mapping & GIS: Leaflet.js with custom GeoJSON ward boundaries
- Data Visualization: Recharts (2D Vector Scatter Plot, Composite Priority Gauges)
- Motion & Animation: Framer Motion
- Iconography: Custom NIVARAN (NV) Branding Badges & Lucide Icons

### Backend & Machine Learning Infrastructure
- Microservice Framework: FastAPI (Python 3.10+)
- Database: SQLite with SQLAlchemy ORM (Session pooling and thread safety)
- Embedding Model: SentenceTransformers (`all-MiniLM-L6-v2`)
- Topic Clustering: BERTopic with HDBSCAN centroids
- Data Ingestion: Pandas, OpenPyXL, CSV/XLSX Parser

---

## Core System Architecture & Workflow

The platform operates across three interconnected modules:

```
[ Citizen Portal ] 
      │
      ├── 1. Multilingual Voice / Text Input (22 Indian Languages + Devanagari Hindi + Hinglish)
      ├── 2. SentenceTransformer Vectorization (Dept Tagging & Confidence Scoring)
      ├── 3. Semantic Proximity Duplicate Check (Ward-level Duplicate Detection)
      └── 4. 24-Hour SLA Timer Generation & Grievance Tracking Stepper
      │
[ FastAPI Backend Engine ] ─── (SQLite Database & BERTopic Vector Space)
      │
[ Nodal Officer Dashboard ] (RBAC Protected)
      │
      ├── 1. Key Performance Indicator Cards (Total, Pending, Resolution Rate, Breached SLA Alert)
      ├── 2. 2D BERTopic AI Embeddings Vector Scatter Map (HDBSCAN Centroids)
      ├── 3. Leaflet.js Ward Density Spatial Heatmap
      ├── 4. Master Grievance Registry Table with CSV Export
      └── 5. Nodal Action Drawer & Multi-Tier Escalation Trail
```

---

## Detailed System Modules & User Workflows

### 1. Citizen Grievance Portal

1. Complaint Lodging:
   - Citizens select their Municipal Ward Zone.
   - Complaints can be typed or spoken using the integrated Samadhan Didi voice utility tool supporting 22 Indian languages, Devanagari Hindi, and Hinglish.

2. Real-Time AI Triage Engine:
   - As the citizen types, input text is debounced and vectorized using SentenceTransformers.
   - The engine computes similarity against six core municipal departments:
     - Public Health & Healthcare (Hospitals, Doctors, Clinics, Ambulance, ICUs)
     - Water Supply (Pipeline Leakages, Contamination, Pressure Disruption)
     - Roads & Infrastructure (Potholes, Road Cave-ins, Bridge Hazards)
     - Sanitation & Waste (Garbage Dumps, Sewage Overflow, Stench)
     - Electricity & Power (Transformer Failures, Wire Sparks, Blackouts)
     - Public Distribution (Pension Disbursal, Ration Card Server Glitches)
   - Dynamic Severity (1-5), Urgency (1-5), and Affected Scope (1-5) are calculated to generate a Composite Priority Score (0-100).

3. Duplicate Cluster Detection & Upvoting:
   - The system checks semantic proximity against existing active tickets in the selected ward.
   - If a matching duplicate issue is found (e.g. an existing water pipeline burst), NIVARAN alerts the citizen immediately and enables one-click ticket upvoting. Upvoting increases ticket priority without creating redundant work orders.

4. SLA Countdown & Status Stepper:
   - Upon submission, a unique ticket ID (e.g. G-1001) is issued.
   - Citizens track the four-stage resolution progress:
     - Stage 1: Grievance Submitted & Encrypted
     - Stage 2: AI Triage & BERTopic Cluster Assignment
     - Stage 3: Nodal Officer Dispatch
     - Stage 4: Site Inspection & Resolution

---

### 2. Nodal Officer Dashboard & Role-Based Access Control (RBAC)

1. Privacy Protection:
   - The Nodal Officer Dashboard and Batch Ingestion Demo tabs are hidden from unauthenticated citizens.
   - Access requires authenticating via the Single Sign-On (SSO) Portal using official government credentials (`.gov.in` or `.nic.in` domain).

2. KPI Metric Summary Cards:
   - Total Grievances Logged
   - Pending Action under SLA
   - Overall Resolution Rate Percentage
   - SLA Breached / Escalated Tickets (Triggers a crimson pulse for tickets exceeding time limits)

3. 2D BERTopic AI Embeddings Scatter Map:
   - Visualizes grievance clusters in UMAP vector space.
   - Dot sizes correspond to composite priority scores (0-100).
   - Clicking cluster pills or individual scatter points filters the master grievance registry table.

4. Geographic Ward Density Heatmap (Leaflet.js):
   - Renders spatial density across municipal wards.
   - Includes departmental layer filters and automated canvas resize invalidation for smooth tile rendering.

5. Master Grievance Registry & Nodal Action Drawer:
   - Real-time tabular tracking with color-coded SLA countdown badges (Safe, Near Breach, Breached).
   - Multi-field search, department filters, and one-click CSV report export.
   - Selecting any ticket opens the Action Drawer console to update status (Pending, In Progress, Resolved, Escalated), assign nodal officers, and record resolution notes.

---

### 3. Batch Ingestion & Emergency Surge Simulator

1. Emergency Surge Simulation:
   - Simulates sudden high-volume civic emergencies (e.g. monsoon cloudbursts).
   - Inject 200+ realistic civic complaints across five spatial hotspots with one click.

2. Dataset File Ingestion:
   - Upload spreadsheet datasets (`.CSV` or `.XLSX` format) directly into the processing pipeline.

3. HDBSCAN Hotspot Auto-Detection:
   - Executes batch clustering to group identical complaints and trigger bulk repair squad dispatches.

---

### 4. FastAPI Python Backend Service

The Python microservice runs on port 8000 and exposes RESTful endpoints:

- `GET /health`: Health check status.
- `GET /api/tickets`: Fetches stored grievances from SQLite database.
- `POST /api/tickets`: Creates a new ticket with automated machine learning triage tags.
- `PATCH /api/tickets/{ticket_id}`: Updates ticket status and nodal assignment.
- `POST /api/analyze`: Performs zero-shot text classification and priority scoring.
- `POST /api/upload-file`: Parses uploaded `.CSV` and `.XLSX` files into ticket records.

---

## Local Development & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- Python (v3.10 or higher)
- Git

### 1. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/vivi-dot-exe/NIVARAN.git
cd NIVARAN

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will run locally at `http://localhost:5173/`.

### 2. Backend Setup (Optional Python Microservice)
```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Launch FastAPI server
python main.py
```
The FastAPI microservice will run locally at `http://localhost:8000/`.

---

## Data Persistence & State Management

The application maintains state persistence across browser sessions:
- Browser `localStorage` persists created tickets, upvotes, and status changes locally.
- When the FastAPI microservice is online, tickets synchronize with the backend SQLite database (`backend/nivaran.db`).

---

## License & Attribution

Developed for Department of Administrative Reforms and Public Grievances (DARPG), Government of India.
Designed and Developed by Team AlphaClan (National Informatics Centre / Smart India Hackathon).
