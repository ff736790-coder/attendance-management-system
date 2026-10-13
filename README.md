# 🎓 AI-Powered Attendance Management System (AuraAMS)

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/Database-Aiven%20Cloud%20MySQL-blue.svg)](https://aiven.io/)
[![TailwindCSS](https://img.shields.io/badge/Frontend-TailwindCSS-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%26%20Compose-2496ed.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, full-stack **AI-Powered Attendance Management System** designed for colleges, universities, and enterprise academic departments. Features strict Role-Based Access Control (Admin, Faculty, Student), Aiven Cloud MySQL connectivity with TLS encryption, automated low-attendance alerts (<75%), RFC-4180 CSV export, audit logging, and an intelligent AI analytics engine with zero-downtime deterministic fallback.

---

## 🌟 Key Features

### 🛡️ 1. Multi-Role Access Control (RBAC)
- **Administrator**: Comprehensive institutional overview, user management (students, faculty, admins), course & subject cataloging, faculty-subject assignment, audit log exploration, and dynamic threshold tuning.
- **Faculty**: Lecture session creation, interactive attendance sheet with 1-click bulk marking ("All Present", "All Absent"), individual Present / Late / Absent toggles, class analytics, and CSV report export.
- **Student**: Personal attendance rate dashboard with color-coded circular gauges, subject-by-subject percentage breakdowns, low-attendance alert notices, and chronological session logs.

### 📊 2. High-Precision Attendance Logic
- **Attendance Percentage Formula**:
  $$\text{Percentage} = \left(\frac{\text{Attended Classes}}{\text{Eligible Classes}}\right) \times 100$$
  - $\text{Attended Classes} = \text{Present} + (\text{Late} \times \text{Late Weight})$
  - Default Late Weight is configurable (e.g., $0.5\times$ or $1.0\times$ credit).
  - Cancelled sessions are strictly excluded from eligible counts.
- **Duplicate Attendance Prevention**: Enforced at both database schema (`UNIQUE KEY uq_session_student`) and application middleware levels.
- **Automated Defaulter Warning (<75%)**: Automatically triggers notification alerts whenever a student drops below the institutional threshold.

### 🤖 3. AI Intelligence with Deterministic Fallback
- **Class Attendance Summarizer**: Analyzes session trends, class health, and provides pedagogical engagement recommendations.
- **Personalized Student Recovery Calculator**: Mathematically determines the exact consecutive classes a student must attend without absence to recover their standing to $\ge 75\%$.
- **Aggregated Q&A Assistant**: Allows administrators and faculty to query institutional metrics via natural language while enforcing privacy controls that block credential leaks and unauthorized private record access.
- **Zero-Downtime Rule-Based Fallback**: If an OpenAI API key is not configured or the network is unavailable, AuraAMS seamlessly switches to an internal deterministic statistical engine without crashing.

---

## 🏗️ Architecture Overview

```
                                +---------------------------+
                                |      Browser Client       |
                                | HTML + Tailwind + Chart.js|
                                +-------------+-------------+
                                              | HTTPS / JWT
                                              v
                                +---------------------------+
                                |    Node.js / Express API  |
                                |  Helmet • CORS • Limiter  |
                                +------+--------------+-----+
                                       |              |
                      TLS / SSL        |              |  REST / Fallback
            +--------------------------+              +-------------------------+
            v                                                                   v
+-------------------------------+                             +-----------------------------------+
|       Aiven Cloud MySQL       |                             |     OpenAI-Compatible AI API      |
|  12 Normalized Tables (3NF)   |                             |    (or Internal Fallback Engine)  |
|  Audit Logs & Unique Keys     |                             +-----------------------------------+
+-------------------------------+
```

---

## 💾 Database Schema

The system uses 12 normalized tables adhering to Third Normal Form (3NF):

1. `users`: Authentication identities, bcrypt hashed credentials, and roles (`admin`, `faculty`, `student`).
2. `courses`: Degree programs, departments, semesters, and academic years.
3. `subjects`: Individual academic modules with credit hours.
4. `faculty`: Faculty profiles, employee IDs, and departments.
5. `students`: Student rosters, roll numbers, semesters, and sections.
6. `faculty_subject_assignments`: Mapping faculty members to subjects per academic term.
7. `class_enrollments`: Mapping enrolled students to courses and terms.
8. `attendance_sessions`: Lecture sessions with date, time, topic, and status (`active`, `completed`, `cancelled`).
9. `attendance_records`: Individual student attendance records with `uq_session_student (session_id, student_id)` to guarantee duplicate prevention.
10. `audit_logs`: Immutable security audit trail tracking operators, timestamps, IP addresses, and JSON payloads.
11. `notifications`: Alert records for low-attendance warnings and institutional notices.
12. `system_settings`: Key-value configuration for thresholds, weights, and institution details.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node v20/v24)
- [Git](https://git-scm.com/)
- (Optional) [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/attendance-management-system.git
cd attendance-management-system
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings:
```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secure_jwt_secret_key_attendance_system_2026_ams_college
JWT_EXPIRES_IN=7d

# Database Configuration (Aiven Cloud MySQL or Local MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=attendance_db

# Aiven SSL Configuration
DB_SSL=false
# Set DB_SSL=true when pointing to Aiven Cloud MySQL
# DB_SSL_CA_PATH=./ca.pem

# AI Provider Configuration (Optional - fallback active if omitted)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

### 3. Initialize Database Migrations & Seeds
```bash
# Run schema migration
npm run migrate

# Seed realistic test accounts and academic records
npm run seed
```

### 4. Run Application
```bash
# Production start
npm start

# Development mode with hot-reloading
npm run dev
```
Open **`http://localhost:5000`** in your browser.

---

## 🔑 Pre-Configured Test Accounts

All accounts share the default seed password: **`Password@123`**

| Role | Email | Name / Details | Highlight |
|---|---|---|---|
| **Admin** | `admin@college.edu` | System Administrator | Full access to users, settings, courses, audit logs |
| **Faculty** | `prof.sharma@college.edu` | Prof. Rajesh Sharma | Instructs CS401 (DBMS) & CS404 (AI/ML) |
| **Faculty** | `dr.aditi@college.edu` | Dr. Aditi Deshmukh | Instructs CS402 (Algorithms) |
| **Student** | `rahul.verma@college.edu` | Rahul Verma (2024CS001) | High attendance (~90%), good standing |
| **Student** | `amit.patel@college.edu` | Amit Patel (2024CS003) | **Low attendance (~55%)**, triggers alerts & AI plan |

*(Tip: Use the 1-click demo switcher on the login page to sign in instantly!)*

---

## 🐳 Docker Deployment

### Run Application & Local MySQL with Docker Compose
```bash
# Build and run containers
docker-compose up --build -d

# Inspect running containers
docker-compose ps

# View application logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

### Build and Run Standalone Docker Container
```bash
# Build image
docker build -t attendance-management-system:1.0.0 .

# Run container with environment file
docker run -d -p 5000:5000 --env-file .env --name attendance-app attendance-management-system:1.0.0

# Inspect health check
docker inspect --format='{{json .State.Health.Status}}' attendance-app
```

---

## 🧪 Automated Testing

AuraAMS includes a comprehensive test suite covering percentage edge cases, AI fallback behavior, input validation, and RBAC security:

```bash
npm test
```

### Test Coverage Highlights:
- ✅ Attendance calculation formula with custom late weights ($0.0\times, 0.5\times, 1.0\times$).
- ✅ Division by zero protection when $0$ sessions exist.
- ✅ AI missing API key detection and graceful fallback activation.
- ✅ Mathematical recovery target calculation for defaulters.
- ✅ Prompt injection filtering in the AI Assistant (credential queries blocked).
- ✅ Input validation for passwords, session dates (`YYYY-MM-DD`), and record formats.
- ✅ JWT verification and HTTP 401 Unauthorized handling.
- ✅ Role-Based Access Control (RBAC): student blocked from Admin routes (HTTP 403 Forbidden).
- ✅ MySQL duplicate key conflict (`ER_DUP_ENTRY`) translated to HTTP 409 Conflict.

---

## 🌐 Cloud Deployment (Render / Railway / Aiven)

### Aiven Cloud MySQL Setup
1. Create a MySQL service in the [Aiven Console](https://console.aiven.io/).
2. Copy the **Service URI**, **Host**, **Port**, **User**, and **Password**.
3. Download the `ca.pem` certificate from the Aiven overview page and save it in the project root.
4. Set in your `.env`:
   ```ini
   DB_HOST=mysql-your-project.aivencloud.com
   DB_PORT=your_port
   DB_USER=avnadmin
   DB_PASSWORD=your_aiven_password
   DB_NAME=defaultdb
   DB_SSL=true
   DB_SSL_CA_PATH=./ca.pem
   DB_SSL_REJECT_UNAUTHORIZED=true
   ```
5. Run `npm run migrate` and `npm run seed` to initialize your cloud database.

### Deploy to Render or Railway
1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/attendance-management-system.git
   git branch -M main
   git push -u origin main
   ```
2. In [Render](https://render.com/) or [Railway](https://railway.app/), create a **New Web Service** connected to your repository.
3. Set Environment to **Node** or **Docker**.
4. Configure environment variables (`PORT=5000`, `NODE_ENV=production`, `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, etc.).
5. Verify live status via the `/api/system/health` endpoint.

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
