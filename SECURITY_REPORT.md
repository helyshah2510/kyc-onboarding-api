# Security and Data-Safety Review Report

**Repository**: `kyc-onboarding-api`  
**Review Branch**: `security-review` (branched from `final-main`)  
**Date**: October 14, 2026  
**Auditor**: Antigravity Assistant  
**Status**: **Phase 2, Batch 1 Fixes Completed** (Awaiting User Review for Next Steps)

---

## 1. Audit Checklist & Status Overview

| Item / Area | Category | Status | Notes |
| :--- | :--- | :--- | :--- |
| **A1. Route Guards & Role Protection** | Access Control | **Checked** | All controller endpoints guarded; Swagger public at `/api` |
| **A2. Notification Ownership Leak** | Access Control | **FIXED** | Fixed to use `req.user.sub` with regression tests |
| **A3. Application & Document Ownership** | Access Control | **Checked** | Properly enforced via `userId` matches in service |
| **A4. Server-Side State Transitions** | Access Control | **Checked** | Status transitions enforced; delete has no status constraint |
| **B1. Password Hashing (bcrypt)** | Authentication | **Checked** | Strong salt rounds (10), safe comparison |
| **B2. JWT Secrets & Expiry** | Authentication | **Checked** | Strong env reading; 1h expiry; lacks refresh/revocation |
| **B3. Registration OTP Brute-Force** | Authentication | **FIXED** | Added max 5 attempts, lockout, and expiration handling |
| **B4. User Enumeration** | Authentication | **Needs Decision** | Register endpoint reveals existing email & phone |
| **B5. Token Storage in LocalStorage** | Sessions | **Needs Decision** | XSS token theft risk vs. HttpOnly cookies |
| **C1. File Path Exposure in Responses** | Data Exposure | **FIXED** | Omitted `filePath` from upload & replace API responses |
| **C2. Sensitive Field Leaks** | Data Exposure | **Checked** | Password hashes & tokens properly excluded in Prisma selects |
| **C3. Console & Application Logging** | Data Exposure | **Checked** | OTPs logged per decision; no passwords/tokens logged |
| **D1. Upload Signature & Size Check** | File Uploads | **Checked** | 5MB limit, PNG MIME and magic bytes validated |
| **D2. Path Traversal & Disk Storage** | File Uploads | **Checked** | Safe server-generated filenames; files unlinked on delete |
| **E1. ValidationPipe Configuration** | Input Validation | **FIXED** | Added `forbidNonWhitelisted: true` to global pipe |
| **E2. DTO Input Length Constraints** | Input Validation | **FIXED** | Added `@MaxLength` to address, name, passwords, and trim |
| **E3. SQL Injection & XSS** | Injection | **Checked** | Prisma parameterization safe; React JSX auto-escapes |
| **F1. CORS & Security Headers** | Network / Config | **Needs Decision** | Hardcoded CORS origin; Helmet middleware missing |
| **F2. Swagger Protection** | Network / Config | **Needs Decision** | Swagger docs exposed publicly without authentication |
| **F3. Git History & .gitignore** | Configuration | **Checked** | No secrets in git; `.gitignore` covers uploads & env |
| **F4. Dependency Vulnerabilities** | Network / Config | **Checked** | 8 backend advisories, 5 frontend dev advisories |
| **G1. Foreign Keys & Cascades** | Database Integrity | **Checked** | Manual transactional deletes; no cascade in schema |
| **G2. Unawaited Async Promise in Reject** | Code Quality | **FIXED** | Added `await` to notification send in `AdminService.reject` |
| **G3. Concurrency / Double Actions** | Database Integrity | **Needs Decision** | Double approve/submit possible under concurrent requests |
| **H1. Frontend Cosmetic Roles & Logs** | Frontend Safety | **FIXED** | Removed leftover debug `console.log` from `ResultPopup` |
| **I1. Missing Production Safeguards** | Roadmap | **Listed / Partial** | Added `.env.example` templates; other items cataloged |

---

## 2. Phase 2, Batch 1: Implemented Fixes & Testing Guide

Every fix in Batch 1 was applied without breaking current user or admin workflows, UI designs, or API contracts.

### Fix 1: Notification Cross-User Access & Ownership Enforcement
* **Commit**: `0a0628b`
* **File Modified**: [backend/src/admin/notifications/notifications.controller.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/notifications/notifications.controller.ts)
* **Tests Added**: [backend/src/admin/notifications/notifications.spec.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/notifications/notifications.spec.ts)
* **What was wrong**:
  The controller read `req.user.id`, but the JWT guard placed the user's ID inside `req.user.sub`. Because `req.user.id` was `undefined`, Prisma queried `{ where: { userId: undefined } }`, ignoring the filter and returning every notification in the database to anyone who requested notifications. It also allowed any user to mark any other user's notifications as read.
* **Why it matters (Real-world analogy)**:
  An apartment mailbox where the mailman gives you every resident's private letters instead of checking your mailbox number.
* **What changed**:
  Replaced the custom `AuthRequest` type with `AuthenticatedRequest` from `jwt-auth.guard.js` and changed both `listMine` and `markRead` to pass `req.user!.sub`.
* **How to test it**:
  Run `npx vitest run src/admin/notifications/notifications.spec.ts`. All 4 tests verify that notifications query strictly by the authenticated user's ID and throw `NotFoundException` when a user tries to mark another user's notification as read.

---

### Fix 2: Omit Server File Path from Document Upload & Replacement
* **Commit**: `fa0ebb4`
* **Files Modified**:
  - [backend/src/documents/documents.service.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/documents/documents.service.ts)
  - [backend/src/admin/admin.service.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/admin.service.ts)
  - [backend/src/admin/admin.controller.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/admin.controller.ts)
* **What was wrong**:
  When a document was uploaded by a user or replaced by an admin, the backend returned the raw database record, including `filePath` with the server's absolute disk path (e.g., `C:\Users\helys\...\backend\uploads\aadhaar-xxx.png`).
* **Why it matters (Real-world analogy)**:
  A takeout receipt that accidentally prints the restaurant manager's home address and room layout.
* **What changed**:
  Explicitly mapped the returned `document` object to include only safe properties (`id`, `applicationId`, `documentType`, `fileName`, `uploadedAt`), omitting `filePath`. Also removed a trailing space in the `Content-Disposition` header in `AdminController.getDocument`.
* **How to test it**:
  Upload a new Aadhaar PNG or replace an image via admin. The response returns `{ success: true, message: '...', document: { id, fileName, uploadedAt, documentType, applicationId } }` without `filePath`. Document preview, download, and deletion continue to function identically.

---

### Fix 3: Registration OTP Attempt Limit & Lockout
* **Commit**: `b79b9ca`
* **File Modified**: [backend/src/auth/auth.service.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/auth.service.ts)
* **Tests Added**: [backend/src/auth/auth.otp.spec.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/auth.otp.spec.ts)
* **What was wrong**:
  `verifyOtp` checked the hash but did not track wrong attempts. A malicious script could submit thousands of guesses to brute-force the 6-digit code during the 5-minute window.
* **Why it matters (Real-world analogy)**:
  A digital lock that lets someone try combinations continuously without jamming or setting off an alarm.
* **What changed**:
  Added an in-memory attempt counter (`MAX_REGISTRATION_OTP_ATTEMPTS = 5`) matching the pattern used in `ApplicationsService`. On incorrect OTP, the system responds with remaining attempts (e.g., *"Entered otp is not correct. 4 attempts left"*). On the 5th failed attempt, the pending registration is automatically deleted and the user is locked out with *"Too many wrong attempts. Please request a new OTP"*.
* **How to test it**:
  Run `npx vitest run src/auth/auth.otp.spec.ts`. All 4 tests verify successful verification, expiration rejection, attempt decrementing, and 5th-attempt lockout/deletion.

---

### Fix 4: Await Asynchronous Rejection Notification
* **Commit**: `cb6dfda`
* **File Modified**: [backend/src/admin/admin.service.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/admin.service.ts)
* **What was wrong**:
  In `AdminService.reject`, `this.notificationsService.send(...)` was executed without `await`, risking unhandled promise rejections if notification creation failed.
* **Why it matters (Real-world analogy)**:
  Dropping a letter into a mailbox chute and walking away without verifying it didn't get jammed.
* **What changed**:
  Added `await this.notificationsService.send(...)`.
* **How to test it**:
  Reject an application in the admin portal. The notification is guaranteed to be written to the database before the endpoint completes and responds.

---

### Fix 5: Strict ValidationPipe & DTO Input Length Constraints
* **Commit**: `5dd4073`
* **Files Modified**:
  - [backend/src/main.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/main.ts)
  - [backend/src/applications/dto/update-personal-details.dto.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/applications/dto/update-personal-details.dto.ts)
  - [backend/src/auth/dto/register.dto.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/dto/register.dto.ts)
  - [backend/src/auth/dto/login.dto.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/dto/login.dto.ts)
  - [backend/src/admin/dto/reject-application.dto.ts](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/dto/reject-application.dto.ts)
* **What was wrong**:
  The global `ValidationPipe` lacked `forbidNonWhitelisted: true`, silently stripping unknown properties rather than warning clients of unexpected inputs. DTOs lacked `@MaxLength` constraints on addresses and passwords, creating a potential CPU Denial-of-Service vector (e.g. sending a 500KB string to bcrypt).
* **Why it matters (Real-world analogy)**:
  A mail envelope slot so wide that someone could drop an entire box of rocks into it, jamming the post office conveyor belt.
* **What changed**:
  - Configured `forbidNonWhitelisted: true` in `ValidationPipe`.
  - Added `@MaxLength(300)` and trim transform to user `address`.
  - Added `@MaxLength(100)` to user `name`, `@MaxLength(255)` to `email`, and `@MaxLength(128)` to passwords.
  - Added trim transform to admin rejection reason.
* **How to test it**:
  Send a payload with an unexpected field (e.g. `{ "extra": "data" }`) to any POST endpoint; the API will reject it with a 400 Bad Request error. Valid requests with normal lengths pass without disruption.

---

### Fix 6: Remove Leftover Debug Console Log
* **Commit**: `837cbb2`
* **File Modified**: [kyc-frontend/src/app/components/ResultPopup.tsx](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/kyc-frontend/src/app/components/ResultPopup.tsx)
* **What was wrong**:
  `console.log('ResultPopup is running');` was executed every 5 seconds during notification polling and printed during the frontend production build.
* **What changed**:
  Removed the debug log statement.
* **How to test it**:
  Open the browser console on the user dashboard; no spam log statements appear.

---

### Fix 7: Safe Environment Variable Templates
* **Commit**: `04d79ff`
* **Files Added**:
  - [backend/.env.example](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/.env.example)
  - [kyc-frontend/.env.example](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/kyc-frontend/.env.example)
* **What was wrong**:
  The repository had no `.env.example` templates, making it unclear to junior developers what environment variables were needed.
* **What changed**:
  Added documented templates containing safe placeholder values only (no real passwords or live secrets).

---

## 3. Real Build & Verification Results

| Target | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | `npx vitest run src/admin/notifications/notifications.spec.ts` | **PASS** | 4/4 passed (0 errors) |
| **Backend OTP Tests** | `npx vitest run src/auth/auth.otp.spec.ts` | **PASS** | 4/4 passed (0 errors) |
| **Backend Production Build** | `npm run build` (in `backend/`) | **PASS** | NestJS compiled cleanly (Exit code 0) |
| **Frontend Production Build** | `npm run build` (in `kyc-frontend/`) | **PASS** | Next.js 16 App Router compiled with 0 errors |

---

## 4. Things That Should Exist But Do Not ("Missing, Not Built")

*(Documented for reference; none will be built without explicit approval).*

| Feature | Why It Matters in a Real KYC System | Work Size | Would It Change Flow? |
| :--- | :--- | :--- | :--- |
| **1. Rate Limiting (`@nestjs/throttler`)** | Protects endpoints (login, OTP generation, PAN validation) from automated brute-force, scraping, and DoS attacks. | Small | No |
| **2. Security Headers (`helmet`)** | Prevents clickjacking, MIME sniffing, and enforces modern browser security policies. | Small | No |
| **3. Account Lockout on Consecutive Failures** | Automatically locks an account after repeated failed login attempts to prevent online password attacks. | Medium | Yes (requires unlock or timeout) |
| **4. HttpOnly Cookies & Refresh Tokens** | Protects session tokens from theft via Cross-Site Scripting (XSS) by removing tokens from browser `localStorage`. | Large | Yes (requires auth flow & cookie changes) |
| **5. Password Reset / Forgot Password Flow** | Enables legitimate users to regain access securely if they lose their credentials without administrator intervention. | Large | Yes (new screens and email/SMS triggers) |
| **6. User Email / Phone Change Flow** | Allows users to update contact details with two-factor re-verification of both old and new credentials. | Medium | Yes (new verification workflow) |
| **7. Centralized Request Logging & Audit Correlation** | Every API request should record a Request ID, client IP, user agent, and timestamp for incident response and forensic analysis. | Medium | No |
| **8. Data Retention & Archival Policies (DPDP Act / GDPR)** | Financial regulations require keeping KYC records for a mandatory statutory period (e.g., 5-8 years) and preventing premature deletion. | Architectural | Yes (restricts admin delete) |
| **9. Explicit Consent Recording** | Regulatory requirement to record user consent (timestamp, terms version, IP address) for Aadhaar and PAN verification. | Medium | Yes (new checkbox/schema record) |
| **10. Comprehensive Unit & Integration Tests** | Fix default Nest CLI boilerplate test files that fail due to missing mock providers. | Medium | No |
| **11. Health Check Endpoint (`/health`)** | Monitoring endpoint (`Terminus`) to check database connectivity, disk space, and API status for container orchestrators. | Small | No |
| **12. Global Exception Filter** | Catches unexpected exceptions to prevent internal database errors or stack traces from reaching clients. | Small | No |

---

## 5. Decisions Needed from You Before Batch 2

Please review the following decisions for future batches:

1. **Token Storage**:
   - Keep in `localStorage` (recommended to preserve current demo flow without changing login responses/cookies) or switch to `HttpOnly` cookies?
2. **User Enumeration**:
   - Keep descriptive messages on registration (`ConflictException`) for smooth user onboarding or make them generic?
3. **Admin Deletion of Approved KYC**:
   - Keep current behavior (admin can delete any application) or restrict deleting `APPROVED` applications to simulate data retention regulations?
4. **Security Headers (`helmet`)**:
   - Would you like to enable `helmet` in `main.ts` in Batch 2? (Small change, does not alter flow).
5. **Swagger Protection**:
   - Would you like to protect `/api` with basic authentication or disable it in production environments?
