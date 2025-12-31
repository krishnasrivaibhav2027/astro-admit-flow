---
description: Institution-Based Access Control System - Complete Architecture & Workflow
---

# 🔐 Institution-Based Access Control System

## Overview

This document outlines the complete architecture for restricting platform access to verified institutions and their approved students. The system implements a three-tier access model with document verification.

---

## 🏗️ Three-Tier Architecture

```
                    ┌─────────────────────────────┐
                    │      SUPER ADMIN (You)      │
                    │  Platform Owner Dashboard   │
                    ├─────────────────────────────┤
                    │ • Approve/Reject Orgs       │
                    │ • View all institutions     │
                    │ • System-wide analytics     │
                    │ • Manage mock institutions  │
                    └──────────────┬──────────────┘
                                   │ approves
                    ┌──────────────▼──────────────┐
                    │      INSTITUTIONS           │
                    │    (Approved Orgs List)     │
                    ├─────────────────────────────┤
                    │ St. Xavier's   [active]     │
                    │ Delhi Public   [active]     │
                    │ Ryan Int'l     [pending]    │
                    └──────────────┬──────────────┘
                                   │ has
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ INSTITUTION ADMIN │   │ INSTITUTION ADMIN │   │ INSTITUTION ADMIN │
│  (St. Xavier's)   │   │  (Delhi Public)   │   │   (Ryan Int'l)    │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ • Review students │   │ • Review students │   │    [PENDING]      │
│ • Send approvals  │   │ • Send approvals  │   │                   │
│ • View their data │   │ • View their data │   │                   │
└────────┬──────────┘   └────────┬──────────┘   └───────────────────┘
         │ approves              │ approves
         ▼                       ▼
  ┌──────────────┐        ┌──────────────┐
  │   STUDENTS   │        │   STUDENTS   │
  │ (St. Xavier) │        │(Delhi Public)│
  └──────────────┘        └──────────────┘
```

---

## 📱 Signup Page UI Concept

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SIGNUP PAGE                                  │
├───────────────────────────────┬──────────────────────────────────────┤
│        STUDENT TAB            │           ADMIN TAB                  │
│   ┌─────────────────────┐     │     ┌─────────────────────┐          │
│   │ ░░░░░░░░░░░░░░░░░░░ │     │     │ ░░░░░░░░░░░░░░░░░░░ │          │
│   │ ░░░ 🔒 LOCKED ░░░░░ │     │     │ ░░░ 🔒 LOCKED ░░░░░ │          │
│   │ ░░░░░░░░░░░░░░░░░░░ │     │     │ ░░░░░░░░░░░░░░░░░░░ │          │
│   │                     │     │     │                     │          │
│   │  Upload Scorecard   │     │     │  [Represent Org]    │          │
│   │  to Request Access  │     │     │     ↓               │          │
│   └─────────────────────┘     │     │  Org Registration   │          │
│                               │     └─────────────────────┘          │
└───────────────────────────────┴──────────────────────────────────────┘
```

---

## 🔄 FLOW 1: Institution Onboarding (Admin Path)

### Step 1: Discovery
- Admin visits signup page
- Admin tab is **BLURRED + LOCKED**
- Shows button: **"Representing an Organization?"**

### Step 2: Organization Application Form

When clicked, navigates to Organization Application page with fields:

| Field | Type | Required |
|-------|------|----------|
| Organization Name | Text | ✅ |
| Type | Dropdown (School/College/Coaching) | ✅ |
| Official Website | URL | ✅ |
| Country/State | Dropdown | ✅ |
| Affiliation Number | Text (CBSE/ICSE/State Board) | ✅ |
| Admin Full Name | Text | ✅ |
| Admin Designation | Text | ✅ |
| Admin Official Email | Email | ✅ |
| Admin Phone | Phone | ✅ |
| Registration Certificate | File Upload | ✅ |
| Authorization Letter | File Upload | Optional |

### Step 3: Super Admin Review

Platform owner (you) reviews the application:
- ✓ Verify website exists
- ✓ Verify affiliation/registration number
- ✓ Cross-check uploaded documents
- **APPROVE** or **REJECT** with reason

### Step 4: Institution Admin Activation

If approved:
1. System generates unique magic link
2. Email sent to Institution Admin
3. Admin clicks link → Sets password
4. Admin enters Institution Dashboard

---

## 🔄 FLOW 2: Student Onboarding (With Scorecard Verification)

### Step 1: Student Visits Signup

Student tab is **BLURRED + LOCKED** with message:

```
🔒 SIGNUP RESTRICTED

This platform is for verified students only.
To request access:

1. Select your institution
2. Upload your high school scorecard
3. Wait for admin approval

        [ Request Access ]
```

### Step 2: Student Access Request Form

> [!IMPORTANT]
> The **Organization Dropdown** is critical - it determines which institution's admin will review the scorecard.

```
┌────────────────────────────────────────────────────┐
│  📚 STUDENT ACCESS REQUEST                         │
│                                                    │
│  Which organization are you applying to?           │
│  ┌──────────────────────────────────────────────┐  │
│  │  🏛️ Select Institution              ▼       │  │
│  ├──────────────────────────────────────────────┤  │
│  │  St. Xavier's College                        │  │
│  │  Delhi Public School                         │  │
│  │  Ryan International                          │  │
│  │  Presidency College                          │  │
│  │  DAV Public School                           │  │
│  │  FIITJEE Coaching                            │  │
│  │  Allen Career Institute                      │  │
│  │  Loyola College                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Your Name:          [                          ]  │
│  Email:              [                          ]  │
│  Phone:              [                          ]  │
│  Stream Applied For: [ Science ▼               ]  │
│                                                    │
│  📎 Upload High School Scorecard (PDF/Image)       │
│                                                    │
│  □ I confirm this is my authentic scorecard        │
│                                                    │
│          [ Submit Request ]                        │
└────────────────────────────────────────────────────┘
```

| Field | Type | Required |
|-------|------|----------|
| Select Institution | Dropdown (approved orgs only) | ✅ |
| Full Name | Text | ✅ |
| Email | Email (any, not institutional) | ✅ |
| Phone | Phone | ✅ |
| Stream Applied For | Dropdown (Science/Commerce/Arts) | ✅ |
| High School Scorecard | File Upload (PDF/Image) | ✅ |
| Confirmation Checkbox | Checkbox | ✅ |

**Key Behavior:**
- Dropdown shows ONLY approved institutions (status = 'approved')
- Each institution in dropdown shows name and type (e.g., "St. Xavier's College - College")
- Student can only submit ONE pending request per institution at a time

### Step 3: Institution Admin Reviews

In Institution Admin dashboard:

```
┌────────────────────────────────────────────────────────────────────┐
│  PENDING STUDENT REQUESTS (3)                                      │
│  ────────────────────────────────────────────────────────────────  │
│  │ Name         │ Email          │ Scorecard │ Date      │ Action │
│  ├──────────────┼────────────────┼───────────┼───────────┼────────│
│  │ Rahul Sharma │ rahul@gmail    │ 📎 View   │ 27 Dec    │ ✓  ✗   │
│  │ Priya Patel  │ priya@yahoo    │ 📎 View   │ 26 Dec    │ ✓  ✗   │
│  └──────────────────────────────────────────────────────────────────│
└────────────────────────────────────────────────────────────────────┘
```

Admin can:
- **View** uploaded scorecard
- **Approve** → Sends magic signup link to student
- **Reject** → Sends rejection email with reason

### Step 4: Student Completes Signup

Student clicks magic link:
1. Signup form is now **UNLOCKED**
2. Pre-filled with their submitted info
3. Student sets password OR connects Google Auth
4. Accepts terms
5. Account created, linked to institution

---

## 🔄 FLOW 3: Re-Application After Rejection

### Scenario: Student was rejected by Organization A

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Student Receives Rejection Email                               │
│  ─────────────────────────────────────                                  │
│                                                                         │
│  📧 Email from: St. Xavier's College                                    │
│  ─────────────────────────────────────────────────                      │
│  Subject: Update on your access request                                 │
│                                                                         │
│  Dear Rahul,                                                            │
│                                                                         │
│  Unfortunately, your access request to St. Xavier's College             │
│  has been declined.                                                     │
│                                                                         │
│  Reason: Scorecard image was unclear/unreadable                         │
│                                                                         │
│  You may:                                                               │
│  • Re-apply to the same institution with a clearer document             │
│  • Apply to a different institution                                     │
│                                                                         │
│  [Apply Again]                                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               ↓
├─────────────────────────────────────────────────────────────────────────┤
│  STEP 2: Student Has Two Options                                        │
│  ────────────────────────────────                                       │
│                                                                         │
│  OPTION A: Re-apply to SAME institution                                 │
│  ┌────────────────────────────────────────┐                             │
│  │  Re-apply to St. Xavier's College      │                             │
│  │                                        │                             │
│  │  📎 Upload NEW Scorecard               │                             │
│  │     (clearer image this time)          │                             │
│  │                                        │                             │
│  │  [ Submit New Request ]                │                             │
│  └────────────────────────────────────────┘                             │
│                                                                         │
│  OPTION B: Apply to DIFFERENT institution                               │
│  ┌────────────────────────────────────────┐                             │
│  │  Select Institution: [Delhi Public ▼]  │                             │
│  │                                        │                             │
│  │  📎 Upload Scorecard                   │                             │
│  │                                        │                             │
│  │  [ Submit Request ]                    │                             │
│  └────────────────────────────────────────┘                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Re-Application Rules

| Rule | Description |
|------|-------------|
| **Same institution** | Can re-apply after rejection (new request created) |
| **Different institution** | Can apply to any approved institution at any time |
| **Multiple pending** | Can have pending requests at MULTIPLE institutions simultaneously |
| **Approved once** | Once approved by ANY institution, account is created |
| **After signup** | Cannot apply to other institutions (already has account) |

### Student Request Status Flow

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌───────────────┐         ┌───────────────┐
    │   APPROVED    │         │   REJECTED    │
    └───────┬───────┘         └───────┬───────┘
            │                         │
            ▼                         ▼
    ┌───────────────┐         ┌───────────────┐
    │ Magic Link    │         │ Can Re-apply  │
    │ Sent → Signup │         │ Same or Other │
    └───────────────┘         └───────────────┘
```

---

## 📊 Database Schema

### Table: `institutions`

```sql
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('school', 'college', 'coaching')),
    website TEXT,
    affiliation_number TEXT,
    country TEXT,
    state TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    documents_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID
);
```

### Table: `institution_admins`

```sql
CREATE TABLE institution_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    designation TEXT,
    password_hash TEXT,
    magic_link_token TEXT,
    magic_link_expires TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);
```

### Table: `student_access_requests`

```sql
CREATE TABLE student_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    stream_applied TEXT,
    scorecard_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES institution_admins(id),
    rejection_reason TEXT,
    magic_link_token TEXT,
    magic_link_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);
```

### Modify Existing: `students` table

```sql
ALTER TABLE students 
ADD COLUMN institution_id UUID REFERENCES institutions(id),
ADD COLUMN access_request_id UUID REFERENCES student_access_requests(id),
ADD COLUMN onboarded_via TEXT DEFAULT 'magic_link';
```

---

## 🎭 Mock Data (10 Institutions)

```sql
INSERT INTO institutions (name, type, website, affiliation_number, country, state, status) VALUES
('St. Xavier''s College', 'college', 'https://stxaviers.edu', 'CBSE-2024-001', 'India', 'Maharashtra', 'approved'),
('Delhi Public School', 'school', 'https://dpsdelhi.edu.in', 'CBSE-2024-002', 'India', 'Delhi', 'approved'),
('Ryan International', 'school', 'https://ryaninternational.org', 'CBSE-2024-003', 'India', 'Karnataka', 'approved'),
('Presidency College', 'college', 'https://presidency.edu', 'ICSE-2024-001', 'India', 'West Bengal', 'approved'),
('DAV Public School', 'school', 'https://davschools.org', 'CBSE-2024-004', 'India', 'Punjab', 'approved'),
('FIITJEE Coaching', 'coaching', 'https://fiitjee.com', 'COACH-2024-001', 'India', 'Delhi', 'approved'),
('Allen Career Institute', 'coaching', 'https://allen.ac.in', 'COACH-2024-002', 'India', 'Rajasthan', 'approved'),
('Loyola College', 'college', 'https://loyolacollege.edu', 'AICTE-2024-001', 'India', 'Tamil Nadu', 'approved'),
('Vidya Niketan', 'school', 'https://vidyaniketan.edu', 'STATE-2024-001', 'India', 'Gujarat', 'pending'),
('Modern High School', 'school', 'https://modernhigh.edu', 'ICSE-2024-002', 'India', 'Maharashtra', 'pending');
```

---

## 🔐 Security Features

### Magic Link Security
- **Single-use tokens**: Each link works only once
- **Expiration**: Links expire after 24 hours
- **Secure random**: 64-character cryptographically secure tokens

### Document Verification
- Scorecards stored in secure Supabase Storage
- Only institution admin can view their students' documents
- Audit trail for all approvals/rejections

### Multi-tenancy Isolation
- Students can only see their own data
- Institution admins only see their institution's students
- Super admin has platform-wide access

---

## 📧 Email Templates Required

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| Org Application Submitted | Super Admin | New Institution Application: {org_name} |
| Org Approved | Institution Admin | Your organization is approved! |
| Org Rejected | Institution Admin | Application update for {org_name} |
| Student Request Submitted | Institution Admin | New student access request: {student_name} |
| Student Approved | Student | You're approved! Complete your signup |
| Student Rejected | Student | Update on your access request |

---

## 🛣️ API Endpoints Required

### Institution Application
- `POST /api/institutions/apply` - Submit new org application
- `GET /api/institutions` - List approved institutions (for student dropdown)

### Super Admin
- `GET /api/super-admin/institutions` - List all institutions
- `PUT /api/super-admin/institutions/{id}/approve` - Approve institution
- `PUT /api/super-admin/institutions/{id}/reject` - Reject institution

### Institution Admin
- `POST /api/institution-admin/activate` - Activate account with magic link
- `GET /api/institution-admin/student-requests` - List pending student requests
- `PUT /api/institution-admin/student-requests/{id}/approve` - Approve student
- `PUT /api/institution-admin/student-requests/{id}/reject` - Reject student

### Student Access
- `POST /api/student-access/request` - Submit access request with scorecard
- `POST /api/student-access/complete-signup` - Complete signup with magic link

---

## ✅ Implementation Checklist

### Backend
- [ ] Create `institutions` table with migration
- [ ] Create `institution_admins` table with migration
- [ ] Create `student_access_requests` table with migration
- [ ] Modify `students` table to add institution link
- [ ] Insert mock institutions data
- [ ] Implement institution application endpoint
- [ ] Implement super admin approval endpoints
- [ ] Implement magic link generation
- [ ] Implement student access request endpoint
- [ ] Implement institution admin student review endpoints
- [ ] Set up Supabase Storage for document uploads
- [ ] Implement email sending for notifications

### Frontend
- [ ] Create locked/blurred signup UI
- [ ] Create "Representing an Organization" button
- [ ] Create organization application form page
- [ ] Create student access request form/modal
- [ ] Create super admin institution review dashboard
- [ ] Create institution admin student review dashboard
- [ ] Create magic link activation pages
- [ ] Implement file upload for documents

### Security
- [ ] Add magic link token validation
- [ ] Add expiration checks
- [ ] Add role-based route protection
- [ ] Add institution-based data isolation

---

## ❓ Decisions to Make

1. **Login page**: Should existing login remain accessible to already-registered users?
2. **Re-application**: Can rejected students re-apply with a different document?
3. **Transfer**: Can students belong to multiple institutions?
4. **Mock mode**: Should demo institutions auto-approve students for testing?
5. **Email provider**: Which email service to use (SendGrid, Resend, SMTP)?
