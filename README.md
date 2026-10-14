# KYC Onboarding System

A full-stack KYC (Know Your Customer) onboarding application built to demonstrate user authentication, identity verification workflows, document management, and administrative review.

## Overview

The KYC Onboarding System allows users to complete a simulated KYC process and track their application status. Administrators can review applications, approve or reject them, and provide rejection reasons.

This project was built to practice full-stack development, REST API design, database management, authentication, authorization, and application security.

**Project status:** Development and security testing in progress.

## Features

### User Features
- User registration and login using password and OTP flows.
- PAN validation using seeded test records.
- KYC application creation and status tracking.
- Personal details management.
- Aadhaar document upload and viewing.
- Application resubmission after rejection.
- Notifications for application status changes.

### Admin Features
- View and review KYC applications.
- Approve or reject applications.
- Provide reasons for rejection.
- Manage application documents and permitted application details.
- Maintain audit records of administrative actions.

### Security Features
- JWT-based authentication.
- Role-based authorization for users and administrators.
- DTO validation for incoming API requests.
- Ownership checks for user applications.
- Password hashing.
- Security headers using Helmet.
- Notification ownership checks and OTP attempt limits, subject to final verification.

## Tech Stack

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend**
- NestJS
- Node.js
- TypeScript
- REST APIs
- JWT authentication

**Database and ORM**
- PostgreSQL
- Prisma ORM

**Additional Tools**
- Swagger / OpenAPI
- Git and GitHub

## Application Architecture

The application follows a client-server architecture.

1. The Next.js frontend provides the user and admin interfaces.
2. The frontend communicates with the NestJS backend through REST APIs.
3. NestJS controllers handle incoming requests, while services implement business logic.
4. Prisma communicates with PostgreSQL to store and retrieve application data.
5. JWT authentication and authorization guards protect restricted endpoints.

## Project Structure

```text
kyc-onboarding-api/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── applications/
│   │   ├── admin/
│   │   ├── notifications/
│   │   ├── pan/
│   │   └── prisma/
│   ├── prisma/
│   └── package.json
├── kyc-frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── README.md
```

*Adjust this structure to match the actual folders in your repository.*

## Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd kyc-onboarding-api
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using the environment variable names required by the backend. Configure your PostgreSQL connection and JWT secret.

### 3. Set up the database

Run the Prisma migrations using the project's documented migration workflow.

```bash
npx prisma migrate deploy
npx prisma generate
```

Seed the database only if your seed script is configured and intended for the target environment.

### 4. Start the backend

Use the development command defined in `backend/package.json`. The local backend is configured to use port `3004`.

### 5. Configure the frontend

In `kyc-frontend`, install dependencies and create `.env.local` with the required frontend environment variables.

For local development, the API URL is:

```env
NEXT_PUBLIC_API_URL=http://localhost:3004
```

Start the frontend using the development script in `kyc-frontend/package.json`. The local frontend is configured to use port `3005`.

### 6. API documentation

During local development, Swagger is available at:

`http://localhost:3004/api`

Swagger documentation is disabled when the backend runs with `NODE_ENV=production`.

## Testing

The project is being tested across user and admin workflows, including:

- Registration and login.
- PAN validation.
- Application submission and status changes.
- Document upload and viewing.
- Admin approval and rejection.
- Notification delivery and ownership.
- Duplicate-application prevention.
- Authorization and invalid input handling.

Run automated tests using the scripts defined in the backend and frontend `package.json` files.

## Important Limitations

- PAN verification uses seeded test records; this is not a live government PAN verification integration.
- OTP delivery is currently simulated for development.
- The project is not intended for real identity documents or production KYC processing.
- Security testing and production hardening are ongoing.

## Future Improvements

- Integrate a legitimate identity verification provider.
- Integrate an OTP delivery service.
- Expand automated security and integration tests.
- Improve production authentication and token storage.
- Add rate limiting and production monitoring.
- Complete deployment and security validation.
