# SchoolMS Frontend Design System (Strict)

You are building a production-grade school management system UI.
The design must be professional, calm, and institutional — NOT generic SaaS.

---

## 🎨 COLOR SYSTEM (MANDATORY)

### Primary (Corporate Indigo)
- #3A5BA0 (base)
- #2F4C8A (hover)
- #E6ECF8 (light)

### Secondary (Academic Green)
- #2E7D6B
- #DFF3EE

### Accent (Gold)
- #C89B3C
- #F6EBD2

### Light Mode
- Background: #F7F9FC
- Card: #FFFFFF
- Border: #E2E8F0
- Text Primary: #1A202C
- Text Secondary: #4A5568

### Dark Mode
- Background: #0F172A
- Card: #1E293B
- Border: #334155
- Text Primary: #E2E8F0
- Text Secondary: #CBD5F5

---

## 🎯 DESIGN PRINCIPLES

- Avoid default Tailwind colors (blue-500, etc.)
- Use soft contrast and professional tones
- UI must feel like an institutional dashboard (school/education system)
- No flashy gradients or neon colors
- Maintain visual consistency across all pages

---

## 🧱 LAYOUT RULES

- Use card-based layouts for all forms and tables
- Cards must have:
  - rounded-2xl
  - soft shadow (shadow-sm)
  - padding: p-6 or p-8
- Use spacing:
  - space-y-4 or space-y-6
- Avoid cramped UI

---

## 🧾 FORM DESIGN RULES

### Inputs
- Rounded: rounded-xl
- Border: subtle (border-gray-200 or custom)
- Focus:
  - ring-2
  - ring-primary
- Smooth transitions

### Labels
- text-sm
- font-medium
- slightly muted color

### Buttons

#### Primary Button
- background: primary
- hover: darker primary
- text: white
- rounded-xl
- shadow-sm

#### Disabled Button
- opacity-50
- cursor-not-allowed

---

## ⚠️ VALIDATION UX (MANDATORY)

- Show inline error messages under inputs
- Disable submit buttons until valid
- Use red (#EF4444) only for errors
- Do NOT rely only on backend validation

---

## 🌙 DARK MODE RULES

- Do NOT invert colors blindly
- Keep primary color consistent
- Cards must be lighter than background
- Maintain readability at all times

---

## 📊 TABLE DESIGN

- Use clean tables with:
  - subtle borders
  - row hover effects
- Support:
  - sorting
  - filtering
  - pagination

---

## 🧠 UX EXPECTATIONS

- Every action must have feedback (loading, success, error)
- Use toast notifications for success/failure
- Keep flows intuitive and minimal

---

## 🧩 COMPONENT STRUCTURE

- Build reusable components:
  - FormField
  - Input
  - Select
  - Table
  - Card
- Keep logic modular and clean

---

## 🚫 STRICTLY AVOID

- Default Tailwind blue color palette
- Overuse of shadows or gradients
- Large dense forms without grouping
- Inconsistent spacing
- Inline styles

---

## 🎯 OUTPUT REQUIREMENT

When generating UI:
- Use Tailwind CSS + shadcn/ui
- Follow the color system exactly
- Produce production-ready code
- Ensure accessibility and responsiveness

---

## 🧠 DEVELOPMENT MODE

- Work step-by-step
- Do NOT generate entire app at once
- Build one page or component at a time
- Ensure each component is testable

---

## 🔥 PRIORITY

Quality > speed
Clarity > cleverness
Consistency > creativity