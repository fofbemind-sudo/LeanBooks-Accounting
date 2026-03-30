# LeanBooks Accounting (Founder-Operated MVP)

A secure, internal-ready accounting and payroll MVP designed for lean startups and founder-operated businesses. This is a beta-ready tool for internal use, not a full QuickBooks replacement.

## Features

- **Multi-Business Management**: Manage multiple businesses under one account.
- **Double-Entry Accounting**: Basic ledger system with automated entries for common workflows.
- **Bank Reconciliation**: Import bank transactions and auto-match them with ledger entries.
- **Financial Reporting**:
  - **Profit & Loss**: Real-time revenue and expense tracking.
  - **Balance Sheet**: Asset, liability, and equity reporting (including Retained Earnings).
  - **Cash Balance**: Simple dashboard metric for actual cash-on-hand.
- **Production Hardening**:
  - **Comprehensive Unit Tests**: 90%+ coverage for all core backend services using Vitest.
  - **Audit Trail**: Automated logging of all CREATE, UPDATE, and DELETE operations to a secure `audit_log` collection.
  - **Rate Limiting**: Granular, route-specific rate limits for authentication, transactions, and reports.
  - **Atomic Transactions**: All multi-document writes (payroll, ledger) are wrapped in Firestore batch operations to ensure data integrity.
  - **Database Indexing**: Optimized composite indexes for high-performance querying.
- **Payroll Management**:
  - Employee management (Salary vs. Hourly).
  - Payroll calculation with basic tax estimation.
  - Automated ledger entries for payroll runs.

## Known Limitations

- **Manual Reconciliation**: Not fully implemented. Only auto-matching is currently supported.
- **Payroll**: Provides calculations and journal entries only. It does **not** handle tax filing, direct deposit, or compliance reporting.
- **Integrations**: Stripe and Bank integrations are at a mock/demo level. They must be replaced with live providers (e.g., Plaid, Stripe API) for production use.
- **Scope**: Designed for lean MVP/internal use. It lacks advanced features like inventory management, multi-currency revaluation, or audit trails.
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

## Folder Structure

```text
/
├── server/               # Backend (Express + Node.js)
│   ├── controllers/      # Route handlers
│   ├── lib/              # Shared libraries (Firestore, Firebase Admin)
│   ├── middleware/       # Auth and Business Ownership checks
│   ├── routes/           # API route definitions
│   ├── services/         # Core business logic (Ledger, Payroll, Reports)
│   └── types/            # Backend TypeScript interfaces
├── src/                  # Frontend (React + Vite)
│   ├── api/              # API client (fetch wrappers)
│   ├── app/              # Context providers
│   ├── components/       # Reusable UI components
│   ├── pages/            # Main application views
│   └── types/            # Frontend TypeScript interfaces
└── firestore.rules       # Security rules for direct database access
```

## API Endpoint Summary

### Businesses
- `POST /api/businesses`: Create a new business (ownerId derived from auth).
- `GET /api/businesses`: List businesses owned by the authenticated user.

### Accounts
- `GET /api/accounts?businessId=...`: List accounts for a business.

### Transactions
- `POST /api/transactions`: Create a balanced journal entry.
- `GET /api/transactions?businessId=...`: List ledger transactions.

### Employees & Payroll
- `POST /api/employees`: Add a new employee.
- `GET /api/employees?businessId=...`: List employees.
- `POST /api/payroll/preview`: Get calculated payroll amounts before processing.
- `POST /api/payroll/run`: Process payroll and post journal entries.
- `GET /api/payroll/runs?businessId=...`: List payroll history.

### Reports
- `GET /api/reports/pnl`: Profit & Loss report.
- `GET /api/reports/balance-sheet`: Balance Sheet report.
- `GET /api/reports/cash-balance`: Current cash-on-hand metric.

### Integrations
- `POST /api/integrations/stripe/mock-sync`: Simulate Stripe payout sync.
- `POST /api/integrations/bank/mock-sync`: Simulate bank transaction import.
- `POST /api/integrations/reconciliation/auto-match`: Automatically link bank items to ledger.

## Firestore Document Models

### `businesses`
```json
{
  "id": "string",
  "ownerId": "string (uid)",
  "name": "string",
  "currency": "string",
  "createdAt": "timestamp"
}
```

### `accounts`
```json
{
  "id": "string",
  "businessId": "string",
  "name": "string",
  "type": "Asset|Liability|Equity|Revenue|Expense",
  "code": "string (e.g. 1000)"
}
```

### `transactions`
```json
{
  "id": "string",
  "businessId": "string",
  "date": "timestamp",
  "description": "string",
  "amount": "number",
  "type": "Income|Expense|Transfer|Adjustment",
  "source": "manual|payroll|stripe|bank",
  "status": "posted|matched"
}
```

## Sample Test Workflow

1. **Sign In**: Use the Google Login button to authenticate.
2. **Create Business**: Add your first business (e.g., "My Startup").
3. **Initialize Accounts**: Go to Settings (or wait for auto-init) to seed the Chart of Accounts.
4. **Add Employee**: In the Payroll tab, add an employee with a salary or hourly rate.
5. **Run Payroll**: Process a payroll run for the current month. Verify the "Payroll History" and the resulting ledger entries.
6. **Sync Mock Stripe**: Use the "Sync Stripe" button in Settings to simulate revenue and fee entries.
7. **Sync Mock Bank**: Use "Import Bank Transactions" in the Transactions tab.
8. **Auto-Match**: Click "Auto-Match" to link bank transactions to ledger entries.
9. **Review Reports**: Check the Dashboard and Reports page to see the updated P&L and Balance Sheet.

## License

MIT
