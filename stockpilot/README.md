# StockPilot — Inventory Management System
> Professional Application Prototype with Role-Based Access Control (RBAC) & Algorithmic Array Processing

StockPilot is an enterprise-grade, modern, and responsive Inventory Management System built with Node.js, Express.js, SQLite, and vanilla ES6+ frontend technologies. Designed as an academic prototype that mimics commercial software architecture, StockPilot combines strict permission-based access control (RBAC), immutable security audit logging, persistent transactional storage, and manual implementations of core searching algorithms (Linear Search and Binary Search) operating on synchronized in-memory JavaScript arrays.

---

## Key Features

### 1. Robust Role-Based Access Control (RBAC) & Granular Permissions
- **Predefined System Roles**:
  - **Super Administrator**: Full system access, catalog CRUD, user management, fine-grained permission assignments, threshold settings, and audit logs.
  - **Inventory Manager**: Add, edit, view, search, and adjust stock quantities. Excludes destructive deletion, user creation, or permission management.
  - **Viewer**: Read-only catalog browsing, product details inspection, and search algorithm demonstrations.
  - **Custom User**: Granular, individual permission overrides assigned by an administrator.
- **13 Fine-Grained Permissions**:
  - `inventory.view`, `inventory.search`, `inventory.create`, `inventory.update`, `inventory.delete`, `inventory.adjust_stock`
  - `users.view`, `users.create`, `users.update`, `users.deactivate`
  - `permissions.manage`
  - `audit.view`
  - `settings.manage`
- **Strict Server-Side Enforcement**: All API requests (`POST`, `PUT`, `PATCH`, `DELETE`) are strictly validated against active session permissions on the backend. Hiding UI elements is merely a usability aid; direct API attempts by unauthorized users return HTTP `403 Forbidden` and trigger automated audit log entries.
- **Privilege Safeguards**:
  - Users cannot self-escalate their roles or modify their own permissions.
  - Deactivation or demotion of the last remaining active Super Administrator is strictly prevented.

### 2. Academic Searching Algorithms Laboratory
- **Array Data Structure Synchronization**:
  - Dynamic inventory data from SQLite is continuously synchronized into an in-memory JavaScript array (`inMemoryInventory`).
  - Separates persistent disk I/O from array algorithm executions.
- **Linear Search Algorithm**:
  - Manual sequential traversal over the in-memory array.
  - Accurate comparison counting for each index evaluated.
  - Time complexity: Best Case \(O(1)\), Average Case \(O(n)\), Worst Case \(O(n)\).
- **Binary Search Algorithm**:
  - Strictly requires an ordered dataset. A copy of the inventory array is created and sorted by `productId` ascending prior to search execution.
  - Manual iterative divide-and-conquer implementation with `low`, `mid`, and `high` pointers.
  - Time complexity: Best Case \(O(1)\), Average Case \(O(\log n)\), Worst Case \(O(\log n)\).
- **Dual Comparison Engine**:
  - Executes Linear and Binary search simultaneously on the identical target SKU.
  - Displays real side-by-side comparison counts, runtime in milliseconds, and step-by-step search intervals.

### 3. Inventory Catalog & Stock Telemetry
- Complete product lifecycle: SKU ID, Product Name, Category, Stock Quantity, Unit Price, Total Valuation (\(\sum \text{Qty} \times \text{Price}\)), Created At, and Updated At timestamps.
- Stock statuses: **In Stock**, **Low Stock**, and **Out of Stock**.
- Configurable **Low Stock Alert Threshold** (persisted in SQLite settings).
- Stock Adjustment modal with audit trail recording (shipment restock, shrinkage deductions, or recount reconciliations).
- Negative stock protection (prevents inventory from dropping below zero).

### 4. Immutable Security Audit Trail
- Automated logging for:
  - User login successes, failures, and logouts.
  - Product creation, modifications, deletions, and stock quantity adjustments.
  - Account creations, role changes, and account activations/deactivations.
  - Fine-grained permission assignments and revocations.
  - Unauthorized API modification attempts (`DENIED`).
- Read-only protection: Audit logs cannot be modified or deleted by any user.

---

## Technology Stack

- **Backend Runtime**: Node.js (v18+ / v20+ / v24+) with Express.js.
- **Database**: SQLite (via native `node:sqlite` DatabaseSync or `better-sqlite3`) with WAL mode and foreign key constraints.
- **Password Security**: `bcryptjs` salted hashing (10 salt rounds).
- **Session Architecture**: `express-session` with `httpOnly`, `sameSite: 'lax'`, and session regeneration upon login.
- **Frontend Architecture**: Semantic HTML5, CSS3 Custom Properties (Design System), Vanilla JavaScript (Modular ES6+).
- **Test Framework**: Node.js Native Test Runner (`node:test`, `node:assert/strict`).

---

## Project Structure

```text
stockpilot/
│
├── public/                       # Frontend User Interface
│   ├── index.html                # Entry point redirect
│   ├── login.html                # Login screen with 1-click demo role chips
│   ├── dashboard.html            # Executive metrics & activity telemetry
│   ├── inventory.html            # Catalog table, filters, and CRUD modals
│   ├── search.html               # Searching algorithms laboratory & trace
│   ├── users.html                # User accounts & status toggling
│   ├── permissions.html          # Fine-grained access permissions matrix
│   ├── audit.html                # Security audit trail & filtering
│   ├── css/
│   │   └── style.css             # Enterprise navy/gray design system
│   └── js/
│       ├── common.js             # Session auth, RBAC UI adapter, toasts, modals
│       ├── auth.js               # Login form & demo credentials helper
│       ├── dashboard.js          # Dashboard KPIs & telemetry charts
│       ├── inventory.js          # Catalog CRUD & stock adjustment controller
│       ├── search.js             # Algorithmic search visualizer & trace
│       ├── users.js              # User management & permission matrix modal
│       └── audit.js              # Audit trail querying & filter controller
│
├── src/                          # Server-Side Application
│   ├── server.js                 # Express server & session initialization
│   ├── database/
│   │   ├── db.js                 # SQLite connection & seed adapter
│   │   └── schema.sql            # Relational database schema DDL
│   ├── middleware/
│   │   ├── authenticate.js       # Session check & active user validation
│   │   └── authorize.js          # RBAC & fine-grained permission middleware
│   ├── routes/
│   │   ├── auth.routes.js        # Authentication & logout endpoints
│   │   ├── inventory.routes.js   # Inventory CRUD & searching endpoints
│   │   ├── users.routes.js       # User & permission management endpoints
│   │   └── audit.routes.js       # Read-only audit trail endpoints
│   ├── services/
│   │   ├── inventory.service.js  # In-memory array sync & business logic
│   │   ├── permissions.service.js# RBAC resolution & permission grants
│   │   └── audit.service.js      # Audit logging service
│   └── algorithms/
│       ├── linearSearch.js       # Manual Linear Search implementation
│       └── binarySearch.js       # Manual Binary Search implementation
│
├── tests/                        # Automated Test Suites
│   ├── algorithms.test.js        # Search comparison & complexity tests
│   ├── inventory.test.js         # Functional CRUD & persistence tests
│   ├── rbac.test.js              # Security & authorization unit tests
│   └── api.test.js               # End-to-end HTTP endpoint tests
│
├── scripts/
│   ├── create-admin.js           # Secure CLI administrator provisioner
│   └── seed.js                   # Demo database seeder
│
├── .env.example                  # Environment configuration template
├── .gitignore                    # Version control exclusions
├── package.json                  # Dependencies & npm scripts
└── README.md                     # Documentation
```

---

## Installation & Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) version 18, 20, 22, or 24 installed.
- Modern web browser (Chrome, Edge, Firefox, or Safari).

### 1. Clone or Open Project in VS Code
Open a Windows PowerShell terminal or VS Code integrated terminal and navigate to the project directory:

```powershell
cd c:\Users\saksh\OneDrive\Desktop\project\stockpilot
```

### 2. Install Dependencies
Run the npm install command using `npm.cmd` (or `npm` on Unix/macOS):

```powershell
npm.cmd install
```

### 3. Environment Configuration
Copy the `.env.example` file to create your local `.env`:

```powershell
Copy-Item .env.example .env
```

Configuration variables available in `.env`:
```ini
PORT=3000
NODE_ENV=development
SESSION_SECRET=stockpilot_local_secure_session_secret_key_8923472
SESSION_MAX_AGE_MS=86400000
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@stockpilot.local
ADMIN_PASSWORD=Admin@12345
ADMIN_FULL_NAME="System Administrator"
DEFAULT_LOW_STOCK_THRESHOLD=10
```

### 4. Initialize Database & Seed Demo Data
Run the automated seed script to populate SQLite with roles, permissions, demo users, sample inventory SKUs, and audit history:

```powershell
npm.cmd run seed
```

Output:
```text
--- Seeding StockPilot Database ---
Seeding completed successfully!
Demo Accounts Created:
  1. Super Admin:       admin    / Admin@12345   (Full access)
  2. Inventory Manager: manager  / Manager@12345 (Create, Edit, Adjust Stock)
  3. Viewer:            viewer   / Viewer@12345  (Read-only view & search)
  4. Custom User:       auditor  / Auditor@12345 (Audit view & inventory view)
Products in Inventory Array: 15
```

Alternatively, you can manually create an initial administrator account using the secure CLI script:
```powershell
node scripts/create-admin.js admin admin@stockpilot.local Admin@12345 "System Administrator"
```

---

## Running the Application

### Start the Server
Start the StockPilot application server:

```powershell
npm.cmd start
```

For development mode with automatic reload on file changes:
```powershell
npm.cmd run dev
```

The server will output:
```text
=======================================================
 StockPilot - Inventory Management System Running
 URL: http://localhost:3000
 Mode: development
=======================================================
```

Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## Default User Accounts for Testing

| Username | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **`admin`** | `Admin@12345` | Super Admin | **Full Access** (All 13 permissions: Products CRUD, User CRUD, Permissions, Audit, Settings) |
| **`manager`** | `Manager@12345` | Inventory Manager | `inventory.view`, `inventory.search`, `inventory.create`, `inventory.update`, `inventory.adjust_stock` |
| **`viewer`** | `Viewer@12345` | Viewer | `inventory.view`, `inventory.search` (Read-only catalog & search) |
| **`auditor`** | `Auditor@12345` | Custom User | `inventory.view`, `inventory.search`, `audit.view` (Audit inspection) |

> **Tip**: On the login page (`/login.html`), click any of the **1-Click Demo Role** buttons to instantly populate the credentials.

---

## How to Test System Features

### 1. Searching Algorithms Demonstration
1. Log in with any account (e.g., `viewer` or `admin`).
2. Navigate to **Search Algorithms** (`/search.html`).
3. Select **Dual Comparison Mode**.
4. Enter or click a sample Product ID:
   - Click **ID: 101**: First element in the array. Linear Search finishes in 1 comparison \(O(1)\).
   - Click **ID: 108**: Middle element. Notice how Binary Search cuts the interval in half.
   - Click **ID: 115**: Last element. Observe how Linear Search checks all 15 elements (\(O(n)\)) while Binary Search finds it in only ~4 comparisons (\(O(\log n)\)).
   - Click **ID: 999**: Non-existent item. Observe the "No product found with the provided Product ID" message and comparisons count.

### 2. RBAC Enforcement Demonstration
1. **As Viewer (`viewer`)**:
   - Go to **Inventory Catalog** (`/inventory.html`).
   - Notice the "Add New Product" button is hidden.
   - The "Edit", "Stock", and "Delete" buttons on table rows are disabled with tooltips.
   - If you send a direct POST request via developer tools or Postman to `/api/inventory`, the server responds with:
     ```json
     {
       "error": "Forbidden: You lack the required permission (inventory.create) to perform this action.",
       "code": "PERMISSION_DENIED",
       "requiredPermission": "inventory.create"
     }
     ```
2. **As Manager (`manager`)**:
   - Log out and log in as `manager`.
   - Go to `/inventory.html`.
   - You can click **Add New Product** and edit existing products.
   - Notice that the **Delete** button is disabled (`inventory.delete` permission required).
   - Attempting to delete a product via direct API request returns HTTP `403 Forbidden`.
3. **As Super Admin (`admin`)**:
   - Full permissions. You can create, edit, adjust stock, and delete products.
   - Access **User Management** (`/users.html`) to create users or toggle active status.
   - Access **Access Permissions** (`/permissions.html`) to grant or revoke specific permissions for users.
   - Access **Audit History** (`/audit.html`) to review the immutable event log.

---

## Running Automated Tests

StockPilot includes 28 automated test cases covering functional requirements, security constraints, searching algorithms, and HTTP API integration.

To run all test suites:

```powershell
npm.cmd test
```

### Test Coverage Overview:
- **`tests/algorithms.test.js`**:
  - Linear Search: best case \(O(1)\), middle case, missing item, empty array.
  - Binary Search: sorted copy requirement, logarithmic comparisons (\(O(\log n)\)), missing item, empty array.
- **`tests/inventory.test.js`**:
  - Product creation with unique ID validation.
  - Duplicate product ID rejection.
  - Negative quantity and negative price validation.
  - Product updates and stock adjustments.
  - Prevention of negative stock quantities.
  - Product deletion and array synchronization.
  - Persistence across server restarts.
- **`tests/rbac.test.js`**:
  - Bcrypt password hashing verification.
  - Super Admin unrestricted permission inheritance.
  - Manager role permissions isolation.
  - Viewer role read-only restriction.
  - Self-escalation prevention.
  - Immediate effect of granted/revoked permissions.
  - Deactivation permission revocation.
  - Audit logging of unauthorized access attempts.
- **`tests/api.test.js`**:
  - HTTP 401 Unauthorized for unauthenticated requests.
  - HTTP 403 Forbidden when Viewer attempts POST /api/inventory.
  - HTTP 403 Forbidden when Manager attempts DELETE /api/inventory.
  - HTTP 200 OK when Super Admin deletes product.

---

## Security Design & Architectural Integrity

1. **Defense in Depth**: Frontend UI controls (hiding/disabling buttons) are purely for user experience. True enforcement happens at the route middleware layer via `authenticate` and `authorize(permission)`.
2. **Brute-Force Attack Mitigation**: The login route tracks failed login attempts per username/IP. Exceeding 5 failed attempts locks the account temporarily for 15 minutes with HTTP `429 Too Many Requests`.
3. **Session Fixation Prevention**: `req.session.regenerate()` is executed upon successful authentication to issue a new session identifier.
4. **Credential Confidentiality**: Password hashes, session secrets, and salt parameters are strictly excluded from all API responses and audit logs.
5. **SQL Injection Prevention**: All SQLite queries are executed using parameterized prepared statements (`db.prepare('... WHERE col = ?')`).
6. **Integrity Safeguards**: The system prevents the last active Super Administrator from being deactivated or demoted to prevent administrative lockouts.

---

## License

This project is developed for educational and professional demonstration purposes. All rights reserved.
