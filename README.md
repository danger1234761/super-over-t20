# SUPER OVER T20 - Live Cricket Sports Gaming Platform

A production-grade responsive web application built with **React**, **TypeScript**, **Tailwind CSS**, **Node.js/Express**, **WebSockets**, and a **provably fair cryptographic result engine**.

---

## 🏏 Key Features & System Architecture

### 1. Dark Sports-Game Aesthetic
- **Visuals**: Deep charcoal/black background (`#0b0e14`, `#121721`), vibrant emerald/cyan tabs, gold borders & accents (`#f59e0b`), red circular ball outcomes (`0, 1, 2, 3, 4, 6, W`), authoritative countdown timer, digital stadium scoreboard, and exchange-style Match Odds panel.
- **Mobile-First Responsive Layout**: Bottom touch-friendly navigation bar, compact cards, responsive scoreboard, and drawer bet slips.

### 2. Role-Based Access Control (RBAC)
- **Roles**: `ADMIN` and `USER`.
- **Restricted Registration**: Public self-registration is strictly disabled. Only `ADMIN` can provision and activate player accounts.
- **Player Login**: User ID (`USER1001`, `USER1002`, `USER1003`) + Password.
- **Admin Login**: Admin ID (`ADMIN01`) + Password (`Admin@123`) + 2FA Authenticator Code (`123456`).
- **Security**: Argon2/Bcrypt password hashing with salt, rate-limiting on failed attempts, session management, and server-side authorization.

### 3. Financial Isolation & Immutable Ledger
- **Admin-Only Deposits**: Players cannot credit money to their wallets. Only admins can execute deposits (`DEP-XXXXXX`).
- **Admin-Only Withdrawals**: Only admins can process withdrawals with strict balance checks (`WDR-XXXXXX`).
- **Admin Adjustments**: Mandatory audit justification for any manual balance corrections (`ADJ-XXXXXX`).
- **Double-Entry Ledger Types**: `DEPOSIT`, `WITHDRAWAL`, `GAME_ENTRY`, `WIN`, `REFUND`, `ADJUSTMENT`.
- **Negative Balance & Double-Spend Protection**: Atomic row-level transaction locks prevent overdrafts or race conditions.
- **Demo Mode**: Explicitly marked Virtual Demo Credits with zero monetary liability.

### 4. Super Over Game Engine & Cricket Rules
- **Deliveries**: 2 Innings, 1 Over (6 balls) per team.
- **Wickets**: Maximum 2 wickets per team in a Super Over.
- **Chasing Target**: Team B target is `Team A Score + 1`.
- **Tie-Breaker**: Boundary Count (4s and 6s) or shared draw rule.
- **State Machine**: `DRAFT` → `SCHEDULED` → `OPEN` → `LOCKED` → `INNINGS_1` → `INNINGS_2` → `COMPLETED` (or `CANCELLED`).
- **Real-Time WebSockets**: Authoritative server timer loop (1000ms), instant ball-by-ball broadcast, and auto-sync on reconnect.

### 5. Provably Fair ResultEngine & Auditability
- **Pre-Commitment**: Prior to game opening, the server generates a 256-bit server seed and publishes its `SHA-256` commitment hash.
- **Deterministic Balls**: Deliveries are derived from `HMAC-SHA256(serverSeed, gameId:innings:ballNumber)`.
- **Unbiased RNG**: Results never depend on user identity, wager amounts, team selections, or player balances.
- **Verification Page (`/verify/:gameId`)**: Players can verify that `SHA256(revealedSeed) == publishedHash` and recalculate every single delivery deterministically.
- **QA Test Mode**: Admins can predefine a test sequence before match start, which is explicitly flagged in UI and written to the audit log.

### 6. Automated Testing Harness
- Run the 20+ automated test suite from the Admin Console (`/admin/tests`) or via `GET /api/testing/run-suite`.

---

## 🚀 Demo Accounts

| Role | User ID | Password | 2FA Code | Demo Balance |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `ADMIN01` | `Admin@123` | `123456` | Unlimited |
| **Player 1** | `USER1001` | `User@123` | N/A | ₹5,000 DEMO |
| **Player 2** | `USER1002` | `User@123` | N/A | ₹10,000 DEMO |
| **Player 3** | `USER1003` | `User@123` | N/A | ₹3,500 DEMO |
| **Player 4** | `USER1004` | `User@123` | N/A | Suspended Demo |

*(Use the 1-Click Fast Login buttons on the login page for instant switching)*

---

## 🛠️ Tech Stack & Scripts

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Backend**: Node.js, Express, WebSocket (`ws`), BcryptJS
- **Storage**: SQL Relational Schema (`server/db/schema.sql`) + File-backed JSON store
- **Build**: `npm run build` (Vite)
- **Start**: `tsx server.ts` (Listens on port 3000)
