# StockPilot — Inventory Management System
> Professional Application with Role-Based Access Control (RBAC), Algorithmic Array Processing & Production-Ready Cloud Deployment

StockPilot is an enterprise-grade, modern, and responsive Inventory Management System built with Node.js, Express.js, SQLite, and vanilla ES6+ frontend technologies. StockPilot combines strict permission-based access control (RBAC), immutable security audit logging, persistent transactional storage, and manual implementations of core searching algorithms (Linear Search and Binary Search) operating on synchronized in-memory JavaScript arrays.

---

## Production Deployment on Render

StockPilot is fully configured for zero-downtime, persistent deployment on [Render](https://render.com).

### Architecture on Render
* **Runtime**: Node.js (v22+ recommended; uses Node's native `node:sqlite` engine with zero external C++ build tool dependencies).
* **Networking**: Listens on `0.0.0.0` and `process.env.PORT || 3000`. Express is configured with `app.set('trust proxy', 1)` to handle secure sessions behind Render's HTTPS reverse proxy.
* **Persistent Storage**: Uses a Render Persistent Disk mounted at `/var/data` with `DATABASE_PATH=/var/data/stockpilot.sqlite`. This ensures inventory records, registered users, permissions, and audit logs persist permanently across redeploys and restarts.
* **Idempotency**: Database schema initialization executes `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE`. Existing tables, data, and user records are **never deleted, reset, or overwritten** on startup.

---

### Step-by-Step Render Deployment

#### Method 1: Blueprint Deployment (Recommended)
1. Push your repository to GitHub or GitLab.
2. In the Render Dashboard, navigate to **Blueprints** &rarr; **New Blueprint Instance**.
3. Select your repository. Render will automatically detect [`render.yaml`](./render.yaml).
4. Review the detected configuration:
   - **Disk**: 1 GB persistent disk mounted at `/var/data`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under environment variables, supply your secret administrator credentials:
   - `ADMIN_USERNAME`: Your desired admin username (e.g. `saksham`)
   - `ADMIN_PASSWORD`: A strong secret password
   - `ADMIN_EMAIL`: Your administrative email address
6. Click **Apply**. Render will build and deploy the web service with persistent storage.

---

#### Method 2: Manual Web Service Setup
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `stockpilot-inventory`
   - **Region**: Select your preferred region (e.g., Frankfurt, Oregon, Singapore).
   - **Branch**: `master` or `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (or any tier supporting Persistent Disks)
4. Attach a **Persistent Disk**:
   - Scroll to **Disks** &rarr; **Add Disk**.
   - **Name**: `stockpilot-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (or as required)
5. Add the **Environment Variables** (see table below).
6. Click **Create Web Service**.

---

### Production Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations, HTTPS cookie security, and proxy trusting. |
| `PORT` | Auto | `3000` | Port assigned by Render's runtime router. |
| `HOST` | No | `0.0.0.0` | Binding host address for containerized network traffic. |
| `DATABASE_PATH` | **Yes** | `/var/data/stockpilot.sqlite` | Absolute file path on the persistent disk for SQLite storage. |
| `SESSION_SECRET` | **Yes** | *(Auto-generated)* | 64+ character random string for signing HTTP session cookies. |
| `SESSION_MAX_AGE_MS` | No | `86400000` (24h) | Session cookie lifetime in milliseconds. |
| `ADMIN_USERNAME` | First Boot | `admin` | Bootstrap username created only if zero Super Administrators exist. |
| `ADMIN_PASSWORD` | First Boot | *None (Required)* | Password for bootstrap admin. Never hardcoded or stored in Git. |
| `ADMIN_EMAIL` | No | `admin@stockpilot.local`| Email address for bootstrap administrator. |
| `ADMIN_FULL_NAME` | No | `System Administrator` | Full name for bootstrap administrator. |
| `DEFAULT_LOW_STOCK_THRESHOLD` | No | `10` | Default inventory quantity threshold for low-stock warnings. |

> [!IMPORTANT]
> Never commit real passwords, secrets, or `.env` files into version control. Use Render's Environment Variables dashboard or secret manager for production credentials.

---

### Initial Administrator Provisioning

StockPilot strictly prohibits unauthenticated or public administrator registration routes. The Super Administrator account can be created in two ways:

1. **Automatic First-Boot Bootstrap (Environment Variables)**:
   If the database has zero existing Super Administrators, StockPilot inspects `ADMIN_USERNAME` and `ADMIN_PASSWORD`. If provided, it securely bcrypt-hashes the password and provisions the initial account with full permissions.
2. **Render Web Shell CLI (Post-Deploy)**:
   Open the **Shell** tab in your Render Web Service dashboard and execute:
   ```bash
   node scripts/create-admin.js <username> <email> <password> "<Full Name>"
   ```
   *Example:*
   ```bash
   node scripts/create-admin.js saksham saksham@stockpilot.local "@MySuperSecret123" "Saksham"
   ```

#### Teammate User Registration & RBAC Assignment
* Teammates register their own accounts via the clean sign-up portal at `/register.html` (Name, Username, Email, Password).
* For security, all self-registered users default strictly to the restricted `viewer` role.
* The Super Administrator logs in and promotes teammates to `inventory_manager` or assigns individual custom permissions from the **User Management** screen (`/users.html`).

---

### Database Persistence & Backup Procedures

#### How Persistence Works
Render persistent disks are non-volatile network-attached storage. Data stored in `/var/data` persists through:
* Application restarts and uncaught exception recoveries.
* Git code pushes, automated builds, and service redeployments.
* Service plan upgrades or server maintenance reboots.

#### Backup Procedures

##### 1. Full Database Hot Backup (Render Shell)
SQLite supports non-blocking hot backups without shutting down the service. Run this command in Render Shell:
```bash
sqlite3 /var/data/stockpilot.sqlite ".backup '/var/data/stockpilot_backup_$(date +%Y%m%d_%H%M%S).sqlite'"
```

##### 2. JSON State Export (Cross-Version Portability)
To create a portable, human-readable snapshot of all roles, permissions, user records, products, and system settings:
```bash
node scripts/export-database.js
```
This generates `scripts/database-snapshot.json` containing table data without exposing raw passwords (only bcrypt hashes).

##### 3. Downloading Backup Archives to Local Machine
StockPilot includes an authenticated download endpoint accessible to Super Administrators:
* Endpoint: `GET /download`
* Returns the complete codebase and current state as a ZIP package.

##### 4. Restoring From a Backup
If you need to restore your database on Render:
1. In the Render Shell, verify your backup file exists:
   ```bash
   ls -la /var/data/
   ```
2. Restore the database:
   ```bash
   cp /var/data/stockpilot_backup_YYYYMMDD.sqlite /var/data/stockpilot.sqlite
   ```
3. Restart the web service from the Render dashboard.

---

## Local Development & Setup

### Prerequisites
* Node.js v22.0.0 or higher
* npm v10 or higher

### Installation
```powershell
# Clone the repository
git clone <repo-url>
cd stockpilot

# Install runtime dependencies
npm.cmd install

# Copy environment template
copy .env.example .env
```

### Running the Application Locally
```powershell
# Start production server
npm.cmd start

# Or start in watch development mode
npm.cmd run dev
```

Server output:
```text
=======================================================
 StockPilot - Inventory Management System Running
 Listening on: http://0.0.0.0:3000
 Environment: development
=======================================================
```

Access the application in your browser:
* **Login**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
* **Register**: [http://localhost:3000/register.html](http://localhost:3000/register.html)
* **Dashboard**: [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)

---

## Automated Test Suite

StockPilot includes a complete test harness containing 29 automated tests verifying searching algorithms, backend RBAC enforcement, HTTP API contracts, inventory state machines, and restart persistence.

```powershell
npm.cmd test
```

### Test Suite Structure
1. **`tests/algorithms.test.js`** (8 tests):
   - Linear Search: $O(1)$ best case, middle element comparison counting, missing ID full-scan, empty array edge cases.
   - Binary Search: ordered array requirement, $O(\log n)$ logarithmic comparison intervals, non-existent key, empty collection.
2. **`tests/inventory.test.js`** (7 tests):
   - Unique product ID verification and duplicate rejection.
   - Negative quantity and negative price validation.
   - Real-time synchronization between persistent SQLite storage and in-memory JavaScript array.
   - Prevent stock quantity from dropping below zero.
   - Product deletion and array synchronization.
3. **`tests/rbac.test.js`** (8 tests):
   - Bcrypt salt and hash verification (no plaintext passwords).
   - Super Administrator all-permission resolution (13 permissions).
   - Inventory Manager role restriction (CRUD without delete).
   - Viewer role read-only restriction (view and search only).
   - Prevention of self-escalation and self-permission modification.
   - Immediate cache invalidation on permission grant/revoke.
   - Account deactivation immediate permission revocation.
   - Security audit logging of unauthorized attempts (`DENIED`).
4. **`tests/api.test.js`** (5 tests):
   - HTTP 401 Unauthorized for missing session cookies.
   - HTTP 401 Unauthorized for direct unauthorized POST requests.
   - HTTP 403 Forbidden for Viewer role attempting product creation or deletion.
   - HTTP 403 Forbidden for Inventory Manager attempting product deletion.
   - HTTP 200 OK for Super Administrator performing deletion and audit inspection.
5. **`tests/persistence.test.js`** (1 test):
   - Multi-phase persistence test proving product data survives simulated application restarts, database reconnections, and subsequent stock adjustments on persistent storage.

---

## Security Architecture & Design Highlights

1. **Backend Authorization Enforcement**:
   UI button hiding is strictly an ergonomic feature. Every backend route is wrapped in `authenticate` and `authorize(permission)` middleware. Unauthorized API calls return HTTP `403 Forbidden` and trigger automated audit log entries.
2. **Secure HTTPS Session Handling**:
   Configured with `app.set('trust proxy', 1)` and `proxy: true` in `express-session`. In production (`NODE_ENV=production`), session cookies enforce `httpOnly: true`, `secure: true`, and `sameSite: 'lax'`.
3. **Brute-Force Rate Limiting**:
   The `/api/auth/login` endpoint tracks consecutive failures. After 5 failed attempts, the IP/username pair is locked out for 15 minutes with HTTP `429 Too Many Requests`.
4. **Session Fixation Prevention**:
   `req.session.regenerate()` is called upon every successful authentication, preventing session hijacking attacks.
5. **Parameterized Prepared Statements**:
   Every SQL interaction uses compiled prepared statements (`db.prepare(...)`), preventing SQL injection attacks.
6. **Immutable Audit Logging**:
   All user authentications, stock modifications, product deletions, and permission modifications write immutable records to `audit_logs` with acting user ID, client IP, timestamp, and outcome.

---

## License

StockPilot is developed for professional demonstration and educational purposes. All rights reserved.
