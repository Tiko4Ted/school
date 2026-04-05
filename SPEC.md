# SchoolMS — Exam-Focused School Management System

## System Specification v1.0

---

## 1. Tech Stack

* Next.js 14 (App Router, TypeScript)
* PostgreSQL (Docker)
* Prisma ORM
* NextAuth.js (Credentials)
* Tailwind + shadcn/ui
* Puppeteer (PDF)
* papaparse + xlsx (uploads)

---

## 2. Roles

### Admin

* Full system control
* Create exams, publish reports, manage users

### Teacher

* Upload marks for assigned stream+subject only

---

## 3. Core Rules

* Single-school system (v1)
* Emails are globally unique
* Teachers cannot edit marks after admin review
* Reports can be reopened by admin
* Schema must support future multi-school expansion

---

## 4. Database (Summary)

### Key Models

* School
* AcademicYear → Term
* Class → Stream
* Subject
* Student + StudentStreamHistory
* Teacher + Assignments
* Exam + ExamConfiguration
* Mark
* MeritList
* PublishedReport

### Key Constraints

* Unique: admissionNumber, email
* Marks: unique per (examId, studentId, subjectId)
* Teacher assignments scoped per stream+subject

---

## 5. Grading (CBC Kenya)

* 75–100 → EE
* 50–74 → ME
* 25–49 → AE
* 0–24 → BE

---

## 6. Student Lifecycle

* ACTIVE → PROMOTED → GRADUATED / TRANSFERRED

All transitions must:

* Update status
* Maintain StudentStreamHistory

---

## 7. Exam Workflow

1. Admin creates exam
2. Configures class + subjects
3. Teachers upload marks
4. Admin reviews marks
5. Merit list generated
6. Reports published

---

## 8. Marks Rules

* Teacher scope: stream + subject only
* Bulk upload allowed (CSV)
* Validation required:

  * Student exists in stream
  * Subject configured for exam
* Overwrites allowed before review

---

## 9. Merit List Rules

* Ranking type: competition ranking (1,1,3)
* Based on total score
* Includes:

  * Class ranking
  * Stream ranking
  * Top boys/girls
  * Subject champions
  * Most improved

---

## 10. Reports

* Based on up to 3 exams
* Auto-generated remarks
* Editable by admin
* Locked after publish
* Can be reopened

---

## 11. API Design (Core)

### Auth

* `/api/auth/[...nextauth]`

### Students

* CRUD + bulk upload + lifecycle actions

### Teachers

* CRUD + assignments

### Exams

* Create + configure + view marks

### Marks

* Single + bulk upload + review

### Merit List

* Generate + fetch + export

### Reports

* Publish + reopen + export

---

## 12. Validation Requirements

* All inputs must be validated
* Bulk uploads must return row-level errors
* No partial invalid commits

---

## 13. Performance Considerations

* Use indexed queries for rankings
* Avoid N+1 queries
* Cache computed rankings if needed

---

## 14. PDF Generation

* Puppeteer-based
* Supports:

  * Single student
  * Full class
  * Stream

---

## 15. Build Priority

Follow AGENTS.md build order strictly.
