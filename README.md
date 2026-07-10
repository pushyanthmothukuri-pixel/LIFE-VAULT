# 🛡️ LifeVault

LifeVault is a secure, zero-knowledge web application designed to store passwords, credit cards, secure documents, emergency access information, and track subscriptions. All sensitive user data is encrypted client-side using robust cryptography before being synchronized to the cloud backend.

---

## 🏗️ Project Directory Structure

Below is the complete file and folder structure of the LifeVault workspace:

```text
LIFE VAULT/
├── client/                     # Frontend Application (React + Vite + TypeScript)
│   ├── public/                 # Static assets (icons, images)
│   ├── src/
│   │   ├── assets/             # Raw application assets
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AuthScreen.tsx          # Login & Zero-Knowledge Registration UI
│   │   │   ├── CardVault.tsx           # Credit & Debit Card vault manager
│   │   │   ├── Dashboard.tsx           # Overview dashboard & navigation
│   │   │   ├── DocumentVault.tsx       # Encrypted document upload & storage
│   │   │   ├── EmergencyAccess.tsx     # Setup emergency contact access inheritance
│   │   │   ├── PasswordHealth.tsx      # Password strength & reuse auditing tool
│   │   │   ├── PasswordVault.tsx       # Login credentials vault manager
│   │   │   ├── SubscriptionTracker.tsx # Recurring payments & alerts log
│   │   │   └── TwoFactorAuth.tsx       # Authenticator App / 2FA screen
│   │   ├── context/
│   │   │   └── VaultContext.tsx        # Global state and API synchronization context
│   │   ├── services/
│   │   │   └── crypto.ts               # Core client-side encryption/decryption routines
│   │   ├── App.css                     # Custom styles for the app
│   │   ├── index.css                   # Global styles & Tailwind configuration
│   │   ├── App.tsx                     # Main layout & routing orchestration
│   │   └── main.tsx                    # React application entry point
│   ├── tsconfig.json           # TypeScript configuration
│   └── vite.config.ts          # Vite configuration
│
├── server/                     # Backend API Server (Node.js + Express)
│   ├── database.js             # Mongoose/MongoDB connection & helper operations
│   ├── user.js                 # Mongoose schema definitions for User data
│   ├── server.js               # Express application routes and server config
│   ├── package.json            # Server package configurations & dependencies
│   └── db.json                 # Mock/development backup database
│
├── package.json                # Root package configuration (npm workspaces)
└── README.md                   # Project documentation (this file)
```

---

## 🔑 Security & Cryptographic Model (Zero-Knowledge)

LifeVault employs a **Zero-Knowledge Architecture**. The server never receives or knows the user's master password, nor does it store any plaintext vault items.

* **Key Derivation (PBKDF2):** On registration/login, the frontend requests the user's salt from the server. If it doesn't exist, a deterministic fake salt is generated to prevent user enumeration. The master password and salt are processed using PBKDF2 to derive the Authentication Key ($K_{auth}$) and Encryption Key ($K_{enc}$).
* **Encryption (AES-GCM):** Data is encrypted in the browser using the derived Encryption Key ($K_{enc}$) via standard Advanced Encryption Standard in Galois/Counter Mode (AES-GCM) before transmission.
* **Server Role:** The backend only stores the user's unique username, a bcrypt hash of the Authentication Key ($K_{auth}$) for authentication verification, and the ciphertext blobs representing the encrypted vault items.

---

## 🛠️ Tools & Technologies Used

### Frontend (Client)
* **React 19** & **TypeScript** — Component architecture and strict typing.
* **Vite** — High-performance, fast-building asset bundling.
* **Lucide React** — Premium, clean iconography.
* **Web Crypto API** — Secure, hardware-accelerated client-side cryptography.

### Backend (Server)
* **Node.js** & **Express** — Robust RESTful API layer.
* **Mongoose** — MongoDB Object Document Mapper (ODM).
* **Bcrypt.js** — Secure password-hash salting and verification.
* **JSON Web Tokens (JWT)** — Stateless user session authorization.

### Root Orchestration
* **NPM Workspaces** — Mono-repo structure linking `client/` and `server/` packages.
* **Concurrently** — Runs both the client and server development instances simultaneously.

---

## 🚀 Deployment & Servers

LifeVault is deployed as a separate architecture using the following platform services:

### 1. Database Layer: MongoDB Atlas
* Hosted on a free tier cluster on **MongoDB Atlas**.
* Network security is configured to allow secure connections from any host (`0.0.0.0/0`) since Render uses dynamic outbound IPs.

### 2. Backend Layer: Render (Web Service)
* **Type:** Web Service (Node.js Environment)
* **Root Directory:** `server`
* **Deployment URL:** `https://lifevault-backend12.onrender.com`
* **Key Configurations:**
  * `MONGODB_URI`: Pointed to the MongoDB Atlas cluster.
  * `JWT_SECRET`: Random hash used to sign auth tokens.
  * `CLIENT_URL`: Pointed to the deployed frontend static site URL.

### 3. Frontend Layer: Render (Static Site)
* **Type:** Static Site (React/Vite Build)
* **Root Directory:** `client`
* **Build Command:** `npm run build`
* **Publish Directory:** `dist`
* **Deployment URL:** `https://lifevault-frontend-xov5.onrender.com` (Example)
* **Key Configurations:**
  * `VITE_API_URL`: Pointed to the backend Web Service URL.
