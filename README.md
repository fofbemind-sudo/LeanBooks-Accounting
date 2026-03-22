# LeanBooks Accounting

A production-ready, secure, and reliable accounting and payroll application for small businesses.

## Features

- **Multi-Business Management**: Manage multiple businesses under one account.
- **Double-Entry Accounting**: Robust ledger system with automated entries for common workflows.
- **Bank Reconciliation**: Import bank transactions and match them with ledger entries (Auto-match and Manual).
- **Financial Reporting**:
  - **Profit & Loss**: Real-time revenue and expense tracking.
  - **Balance Sheet**: Accurate asset, liability, and equity (including Retained Earnings) reporting.
  - **Cash Balance**: Dedicated dashboard metric for actual cash-on-hand.
- **Payroll Management**:
  - Employee management (Salary vs. Hourly).
  - Payroll processing with tax estimation.
  - Automated ledger entries for payroll runs.
- **Security & Authorization**:
  - Firebase Authentication integration.
  - Backend middleware for business ownership verification.
  - Explicit Firestore security rules for data protection.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, Firebase Admin SDK.
- **Database**: Firestore.
- **Authentication**: Firebase Auth.

## Getting Started

### Prerequisites

- Node.js installed.
- Firebase project set up with Firestore and Authentication (Google Provider).

### Environment Variables

Create a `.env` file with the following:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=your_database_id

# Backend (Firebase Admin)
# The system automatically handles GOOGLE_APPLICATION_CREDENTIALS in AI Studio
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Security Architecture

LeanBooks uses a multi-layered security approach:

1. **Client-Side Auth**: Firebase Auth handles user sign-in.
2. **API Authentication**: Every request includes a Firebase ID Token in the `Authorization` header.
3. **Backend Middleware**:
   - `authMiddleware`: Verifies the JWT and extracts the `userId`.
   - `businessOwnershipMiddleware`: Ensures the `userId` owns the `businessId` being accessed.
4. **Firestore Rules**: Granular rules prevent unauthorized direct access to the database.

## Accounting Logic

- **Cash Balance**: Calculated by summing balances of all accounts marked as "Cash" or "Bank".
- **Retained Earnings**: Automatically calculated on the Balance Sheet as the sum of all historical Net Income (Revenue - Expenses).
- **Idempotency**: Business initialization is idempotent, ensuring default accounts are only created once.

## License

MIT
