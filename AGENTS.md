# AGENT INSTRUCTIONS (READ FIRST)

You are working on a production-grade system called **SchoolMS — Exam-Focused School Management System**.

This is a real-world system with strict business rules. Follow instructions precisely.

---

## 🚫 STRICT RULES

* DO NOT modify database schema unless explicitly instructed
* DO NOT introduce new libraries unless necessary
* DO NOT refactor unrelated code
* FOLLOW the defined folder structure exactly
* ALWAYS use TypeScript with strict typing
* DO NOT guess business logic — refer to SPEC.md
* ASK if any requirement is unclear

---

## 🧠 DEVELOPMENT PRINCIPLES

* Prefer minimal, surgical changes
* Keep logic modular (use `/lib` for business logic)
* Separate concerns: API → services → DB
* Validate all inputs (especially bulk uploads)
* Ensure code is production-ready (no hacks)

---

## ⚙️ IMPLEMENTATION RULES

### API

* Must follow routes defined in SPEC.md
* Use REST conventions
* Validate all request inputs
* Return consistent JSON responses

### Database

* Use Prisma only
* Respect all constraints and relations
* Never bypass schema logic

### Auth

* Use NextAuth.js (Credentials provider)
* Enforce role-based access (ADMIN / TEACHER)

### UI

* Use shadcn/ui components
* Keep UI clean and minimal
* No business logic inside components

---

## 📊 DOMAIN-SPECIFIC RULES

### Marks

* Teachers can ONLY modify their assigned stream+subject
* Teachers can overwrite marks BEFORE admin review
* AFTER review → ONLY admin can modify

### Reports

* Reports are LOCKED after publishing
* Admin can reopen reports
* Remarks are auto-generated but editable

### Merit Lists

* Use competition ranking: 1, 1, 3
* Rankings must be deterministic and reproducible

### Student Lifecycle

* ACTIVE → PROMOTED → GRADUATED / TRANSFERRED
* Maintain full history via StudentStreamHistory

---

## 🧱 BUILD ORDER (MANDATORY)

Follow this EXACT sequence:

1. Docker + Database setup
2. Auth system
3. School setup (classes, streams, subjects, terms)
4. Teacher management
5. Student management
6. Exam management
7. Marks system
8. Merit list
9. Report publishing

DO NOT skip ahead unless explicitly instructed.

---

## 📁 PROJECT STRUCTURE (ENFORCE)

* `/app/api` → API routes
* `/lib` → business logic
* `/components` → UI only
* `/prisma` → schema + migrations

---

## 🧾 OUTPUT FORMAT

When responding:

* Show ONLY relevant code
* Briefly explain changes
* Avoid unnecessary verbosity
* Prefer diffs or isolated files

---

## 📌 CONTEXT

All system rules, database schema, workflows, and API contracts are defined in:

→ **SPEC.md**

You MUST follow it as the source of truth.
