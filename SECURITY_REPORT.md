# Security and Data-Safety Review Report

**Repository**: `kyc-onboarding-api`  
**Review Branch**: `security-review` (branched from `final-main`)  
**Date**: October 14, 2026  
**Auditor**: Antigravity Assistant  
**Status**: Phase 1 Audit Complete (Awaiting User Review & Approval for Phase 2)

---

## 1. Audit Checklist & Status Overview

| Item / Area | Category | Status | Notes |
| :--- | :--- | :--- | :--- |
| **A1. Route Guards & Role Protection** | Access Control | **Checked** | All controller endpoints guarded; Swagger public at `/api` |
| **A2. Notification Ownership Leak** | Access Control | **Checked (Finding)** | `req.user.id` is `undefined`, returns ALL notifications |
| **A3. Application & Document Ownership** | Access Control | **Checked** | Properly enforced via `userId` matches in service |
| **A4. Server-Side State Transitions** | Access Control | **Checked** | Status transitions enforced; delete has no status constraint |
| **B1. Password Hashing (bcrypt)** | Authentication | **Checked** | Strong salt rounds (10), safe comparison |
| **B2. JWT Secrets & Expiry** | Authentication | **Checked** | Strong env reading; 1h expiry; lacks refresh/revocation |
| **B3. Registration OTP Brute-Force** | Authentication | **Checked (Finding)** | No attempt limit on registration `verifyOtp` |
| **B4. User Enumeration** | Authentication | **Checked (Finding)** | Register endpoint reveals existing email & phone |
| **B5. Token Storage in LocalStorage** | Sessions | **Needs Decision** | XSS token theft risk vs. HttpOnly cookies |
| **C1. File Path Exposure in Responses** | Data Exposure | **Checked (Finding)** | Full disk path returned in document upload & replace |
| **C2. Sensitive Field Leaks** | Data Exposure | **Checked** | Password hashes & tokens properly excluded in Prisma selects |
| **C3. Console & Application Logging** | Data Exposure | **Checked** | OTPs logged per decision; no passwords/tokens logged |
| **D1. Upload Signature & Size Check** | File Uploads | **Checked** | 5MB limit, PNG MIME and magic bytes validated |
| **D2. Path Traversal & Disk Storage** | File Uploads | **Checked** | Safe server-generated filenames; files unlinked on delete |
| **E1. ValidationPipe Configuration** | Input Validation | **Checked (Finding)** | Missing `forbidNonWhitelisted: true` |
| **E2. DTO Input Length Constraints** | Input Validation | **Checked (Finding)** | Missing max lengths on address, name, passwords |
| **E3. SQL Injection & XSS** | Injection | **Checked** | Prisma parameterization safe; React JSX auto-escapes |
| **F1. CORS & Security Headers** | Network / Config | **Checked (Finding)** | Hardcoded CORS origin; Helmet middleware missing |
| **F2. Swagger Protection** | Network / Config | **Checked (Finding)** | Swagger docs exposed publicly without authentication |
| **F3. Git History & .gitignore** | Configuration | **Checked** | No secrets in git; `.gitignore` covers uploads & env |
| **F4. Dependency Vulnerabilities** | Network / Config | **Checked (Finding)** | 8 backend advisories, 5 frontend dev advisories |
| **G1. Foreign Keys & Cascades** | Database Integrity | **Checked** | Manual transactional deletes; no cascade in schema |
| **G2. Unawaited Async Promise in Reject** | Code Quality | **Checked (Finding)** | Notification send not awaited in `AdminService.reject` |
| **G3. Concurrency / Double Actions** | Database Integrity | **Checked (Finding)** | Double approve/submit possible under concurrent requests |
| **H1. Frontend Cosmetic Roles & Logs** | Frontend Safety | **Checked (Finding)** | Role checks client-side; leftover debug `console.log` |
| **I1. Missing Production Safeguards** | Roadmap | **Listed** | Rate limiting, lockouts, audit UI, health checks, etc. |

---

## 2. Phase 1 Findings & Vulnerability Analysis

### Finding 1: Critical Cross-User Data Leak in Notifications (Ownership Failure)
* **File & Line**: [backend/src/admin/notifications/notifications.controller.ts:6, 16, 24](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/notifications/notifications.controller.ts#L6-L26)
* **Severity**: **CRITICAL**
* **What is wrong**:
  The `NotificationsController` defines a custom type `type AuthRequest = { user: { id: number } }` and accesses `req.user.id`. However, the authentication guard (`JwtAuthGuard`) stores the user's ID under `sub` (`{ sub: user.id, role: user.role }`). Because of this property name mismatch, `req.user.id` is always `undefined`.
  When Prisma executes `this.prisma.notification.findMany({ where: { userId: undefined } })`, Prisma treats `undefined` as "do not filter by this field". As a result, **every notification belonging to all users is returned to whoever requests their notifications**, and anyone can mark another user's notifications as read.
* **Why it matters (Real-world analogy)**:
  Imagine an apartment building with mailboxes. Instead of the mailman looking at your apartment number, he hands you the mail of every resident in the entire building. One customer can see private KYC rejection reasons, approval messages, and personal statuses meant for other applicants.
* **Proposed Fix**:
  Use `AuthenticatedRequest` from `jwt-auth.guard.js` and pass `req.user!.sub` instead of `req.user.id`.

---

### Finding 2: Uncapped Registration OTP Verification Attempts (Brute-Force Risk)
* **File & Line**: [backend/src/auth/auth.service.ts:62-85](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/auth.service.ts#L62-L85)
* **Severity**: **CRITICAL**
* **What is wrong**:
  When a user registers, an OTP is generated and stored in `PendingRegistration`. When `verifyOtp` is called, it checks if the entered OTP matches `pending.otpHash`. If incorrect, it simply throws a `BadRequestException` without incrementing an attempt counter, locking out attempts, or deleting the registration record.
  Because an OTP is only 6 digits (100,000 possible combinations) and lasts for 5 minutes, an automated attacker can submit thousands of attempts and brute-force the OTP code.
* **Why it matters (Real-world analogy)**:
  Imagine a 4-dial bicycle lock where someone is allowed to try combinations as fast as they can without the lock jamming or an alarm sounding. With enough fast guesses within 5 minutes, they will easily guess the right code.
* **Proposed Fix**:
  Add an in-memory attempt tracker (similar to the application phone OTP) or add an attempt counter to limit wrong guesses to 5 before invalidating the pending registration.

---

### Finding 3: Internal Server File Path Exposure in API Responses
* **File & Line**:
  - [backend/src/documents/documents.service.ts:36](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/documents/documents.service.ts#L36)
  - [backend/src/admin/admin.service.ts:148](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/admin.service.ts#L148)
* **Severity**: **MEDIUM**
* **What is wrong**:
  When a document is uploaded or replaced, the backend returns the raw database `document` object to the client. This object includes the `filePath` column, which contains the full absolute path on the host server (e.g., `C:\Users\helys\VS_code_codes\kyc-onboarding-api\backend\uploads\aadhaar-172888888.png`).
* **Why it matters (Real-world analogy)**:
  It's like ordering food for takeout and receiving a receipt that includes the restaurant manager's home address, room layout, and key cabinet location. An attacker learns the server operating system (Windows), local username (`helys`), folder hierarchy, and where files live on disk.
* **Proposed Fix**:
  Sanitize the response or use a Prisma `select` / DTO mapping that returns only safe fields (`id`, `fileName`, `documentType`, `uploadedAt`), omitting `filePath`.

---

### Finding 4: Missing `forbidNonWhitelisted` in Global ValidationPipe
* **File & Line**: [backend/src/main.ts:11](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/main.ts#L11)
* **Severity**: **MEDIUM**
* **What is wrong**:
  `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` has `whitelist: true` (which strips unknown fields), but lacks `forbidNonWhitelisted: true`.
* **Why it matters (Real-world analogy)**:
  Imagine a security guard who is told to let in people with invitations. If a guest brings a backpack with unknown extra packages, the guard quietly takes the packages away without telling the guest, rather than rejecting the suspicious request. Setting `forbidNonWhitelisted: true` immediately raises an error if unexpected parameters are sent.
* **Proposed Fix**:
  Add `forbidNonWhitelisted: true` to the `ValidationPipe` configuration in `main.ts`.

---

### Finding 5: Missing Security Headers (Helmet Middleware)
* **File & Line**: [backend/src/main.ts:6-24](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/main.ts#L6-L24)
* **Severity**: **MEDIUM**
* **What is wrong**:
  The backend API does not use the `helmet` middleware. Standard protective HTTP response headers (like `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and CSP) are not sent.
* **Why it matters (Real-world analogy)**:
  Leaving an API without standard headers is like delivering a package in a plain paper envelope with no seal or tamper tape. Browsers might try to guess MIME types (MIME-sniffing) or allow pages to be embedded inside malicious iframes (clickjacking).
* **Proposed Fix**:
  Install `helmet` (or configure NestJS security headers) and invoke `app.use(helmet())` in `main.ts`.

---

### Finding 6: Unprotected Swagger API Documentation
* **File & Line**: [backend/src/main.ts:13-20](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/main.ts#L13-L20)
* **Severity**: **MEDIUM**
* **What is wrong**:
  The Swagger API documentation at `/api` is served publicly without authentication or environment restriction.
* **Why it matters (Real-world analogy)**:
  It is like leaving a blueprint of the building's wiring, security gates, and vault layout on a table in the lobby for any visitor to browse.
* **Proposed Fix**:
  Protect the `/api` route with basic authentication or restrict Swagger generation to non-production environments.

---

### Finding 7: Unbounded Input Lengths in DTOs (DoS / Memory Risk)
* **File & Line**:
  - [backend/src/applications/dto/update-personal-details.dto.ts:8](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/applications/dto/update-personal-details.dto.ts#L8) (`address` has no `@MaxLength`)
  - [backend/src/auth/dto/register.dto.ts:8, 19](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/dto/register.dto.ts#L8-L19) (`name` and `password` have no `@MaxLength`)
  - [backend/src/auth/dto/login.dto.ts:13](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/dto/login.dto.ts#L13) (`password` has no `@MaxLength`)
* **Severity**: **SMALL**
* **What is wrong**:
  Inputs like addresses and passwords do not specify maximum string lengths. Passwords sent to bcrypt that are excessively long (e.g. hundreds of kilobytes) consume massive CPU cycles to compute hashes, creating a Denial-of-Service vector.
* **Why it matters (Real-world analogy)**:
  It is like a letterbox with an opening large enough to dump an entire truckload of rocks into, clogging the whole sorting facility.
* **Proposed Fix**:
  Add `@MaxLength(...)` and `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` to these DTO fields.

---

### Finding 8: Unawaited Notification Promise in `AdminService.reject`
* **File & Line**: [backend/src/admin/admin.service.ts:118](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/admin/admin.service.ts#L118)
* **Severity**: **SMALL**
* **What is wrong**:
  In `AdminService.reject`, the call `this.notificationsService.send(...)` is missing the `await` keyword, unlike `approve` which has `await this.notificationsService.send(...)`.
* **Why it matters (Real-world analogy)**:
  Firing off an asynchronous operation without awaiting it is like dropping an envelope in the mail chute and walking away before verifying it didn't get jammed. If an error occurs, it causes an unhandled promise rejection.
* **Proposed Fix**:
  Add `await` to `this.notificationsService.send(...)`.

---

### Finding 9: User Enumeration in Registration
* **File & Line**: [backend/src/auth/auth.service.ts:25, 31](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/backend/src/auth/auth.service.ts#L25-L31)
* **Severity**: **SMALL**
* **What is wrong**:
  When a user starts registration, `assertEmailAndPhoneAvailable` returns exact error messages: `"This Email already existed"` or `"This phonenumber already existed"`.
* **Why it matters (Real-world analogy)**:
  An attacker can type a list of phone numbers or email addresses to find out which people are registered on the platform.
* **Proposed Fix**:
  Depending on user decision, return generic error messages or require email/phone verification before disclosing registration state.

---

### Finding 10: Leftover Debug Console Log in Frontend
* **File & Line**: [kyc-frontend/src/app/components/ResultPopup.tsx:14](file:///c:/Users/helys/VS_code_codes/kyc-onboarding-api/kyc-frontend/src/app/components/ResultPopup.tsx#L14)
* **Severity**: **SMALL**
* **What is wrong**:
  `console.log('ResultPopup is running');` runs on every polling interval and renders during build time.
* **Why it matters**:
  Pollutes client browser consoles and build logs.
* **Proposed Fix**:
  Remove the debug console log.

---

### Finding 11: Dependency Vulnerabilities (`npm audit`)
* **Backend**:
  - `deepmerge-ts` (<8.0.0, High severity): Stack exhaustion DoS via recursive objects (transitive via `@prisma/config` / `prisma`).
  - `tmp` (<=0.2.5, High severity): Path traversal and symlink writing (transitive via `@nestjs/mau`).
  - `undici` (<=6.28.0, 5 High severity): CRLF injection, cookie injection, DoS (transitive via `@nestjs/mau`).
* **Frontend**:
  - `braces` (*, High severity): Stack-exhaustion DoS (transitive via `eslint-config-next`).
* **Recommendation**:
  Do not run destructive `npm audit fix --force` as it causes breaking major version bumps. Assess dev dependencies vs runtime dependencies.

---

## 3. Things That Should Exist But Do Not ("Missing, Not Built")

This list covers essential security features of real-world production KYC platforms that do not currently exist in the demo project. *(Per strict project rules, these are documented here for planning and will not be built without approval).*

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
| **10. Comprehensive Unit & Integration Tests** | Existing 8 test spec files are failing due to missing mock providers; automated tests ensure security fixes don't regress. | Medium | No |
| **11. Health Check Endpoint (`/health`)** | Monitoring endpoint (`Terminus`) to check database connectivity, disk space, and API status for container orchestrators. | Small | No |
| **12. Environment Variable Templates (`.env.example`)** | Guides junior developers on required environment variables without accidentally committing live secrets. | Small | No |
| **13. Global Exception Filter** | Catches unexpected exceptions to prevent internal database errors or stack traces from reaching clients. | Small | No |

---

## 4. Decisions Needed from You Before Phase 2 Fixes

Please review the following decisions before we proceed:

### Decision 1: Token Storage in Browser (`localStorage` vs. `HttpOnly Cookies`)
* **Current State**: JWT is stored in `localStorage` in the browser.
* **Risk**: If any XSS vulnerability exists on the frontend (or in a third-party dependency), malicious JavaScript can read `localStorage.getItem('token')` and steal the user's session.
* **Options**:
  - **Option A (Recommended for Production)**: Move to HttpOnly, SameSite, Secure cookies. The browser handles cookies automatically and JavaScript cannot read them. (Requires updating auth response, cors credentials, and Next.js fetch headers).
  - **Option B (Recommended for Demo / Current Scope)**: Keep `localStorage` for now to avoid altering the current frontend flow, but document the risk thoroughly.
* **Recommendation**: Keep `localStorage` for this review (Option B) to maintain the exact current flow per instructions, or confirm if you want Option A.

### Decision 2: User Enumeration on Registration
* **Current State**: The API tells the user if an email or phone number is already registered (`ConflictException`).
* **Options**:
  - **Option A**: Keep current behavior (helpful for user onboarding in a demo).
  - **Option B**: Return a generic response like *"Unable to proceed with registration. Please verify your details or log in."*
* **Recommendation**: Keep current behavior (Option A) as this is standard for many onboarding apps, but protect the route with rate limiting.

### Decision 3: Admin Deletion of Approved KYC Records
* **Current State**: Admins can permanently delete an application regardless of its status (`DRAFT`, `SUBMITTED`, `VERIFIED`, `APPROVED`).
* **Options**:
  - **Option A**: Restrict deletion so `APPROVED` applications cannot be deleted (to simulate regulatory data retention).
  - **Option B**: Allow admin deletion of all applications (keep current demo functionality).
* **Recommendation**: Keep Option B so we do not alter admin functionality, or confirm Option A.

---

## 5. Proposed Phase 2 Plan (Batches)

Once you approve, we will execute the fixes in small, safe batches:

### **Batch 1: Safe Fixes (Zero Flow or Behavior Disruption)**
1. **Fix Notifications Ownership**: Correct `req.user.id` to `req.user.sub` in `NotificationsController`.
2. **Prevent File Path Leak**: Sanitize `document` in `DocumentsService` and `AdminService` so `filePath` is never returned in API responses.
3. **Add Registration OTP Brute-Force Limit**: Add an in-memory attempt counter (max 5 attempts) to `verifyOtp` in `auth.service.ts`.
4. **Fix Missing `await`**: Await the notification call in `AdminService.reject`.
5. **Add `forbidNonWhitelisted: true`**: Add to `ValidationPipe` in `main.ts`.
6. **Add DTO Length & Trimming Constraints**: Add `@MaxLength` to `UpdatePersonalDetailsDto`, `RegisterDto`, and `LoginDto`.
7. **Clean Leftover Debug Code**: Remove `console.log` from `ResultPopup.tsx`.
8. **Add `.env.example` Templates**: Add documented examples without secrets.
9. **Build Verification**: Run backend and frontend builds to ensure 0 build errors.

### **Batch 2: Fixes Requiring Your Explicit Decisions**
- Implementation of decisions made in Section 4 (e.g. Helmet configuration, Swagger protection, CORS configuration adjustments).
