# 📚 LifeVault Prompt Library

Welcome to the **LifeVault Prompt Library**! This repository-specific prompt catalog is designed to help developers and security auditors collaborate effectively with Large Language Models (LLMs) like Gemini, ChatGPT, or Claude. 

Since LifeVault uses a strict **Zero-Knowledge Cryptographic Model**, general-purpose prompts often fail to respect local encryption boundaries. The prompts below are pre-configured with LifeVault's architecture, dependencies, and file systems.

---

## 🧭 How to Use This Library

1. **Select a Prompt Category** matching your target task (e.g., Feature Generation, Security Audit, Testing, UI Polish).
2. **Copy the Prompt Template** and replace any placeholders formatted as `[placeholder_text]`.
3. **Run in Your LLM Client** to receive context-aware, highly-accurate recommendations and code updates.

---

## 🔑 1. Context Bootstrapping

Use this prompt to prime a new LLM conversation with the structural and security context of LifeVault.

```markdown
You are an expert software developer and security engineer working on the LifeVault project.
LifeVault is a secure, zero-knowledge web application for storing passwords, credit cards, secure documents, emergency access, and subscriptions.

Key Architecture:
- Frontend: React 19, Vite, TypeScript, TailwindCSS, and Lucide React.
- Cryptography: Web Crypto API. Zero-Knowledge client-side key derivation via PBKDF2 (100,000 iterations, SHA-256) deriving a 512-bit payload. The first 256 bits represent the encryption key (AES-GCM-256), and the second 256 bits are converted to hex as the server-side authentication hash.
- Backend: Node.js, Express, MongoDB/Mongoose, Bcrypt, and JSON Web Tokens.
- Monorepo: Orchestrated via NPM Workspaces.

Key Files:
1. Crypto Services: client/src/services/crypto.ts
2. State & API Sync: client/src/context/VaultContext.tsx
3. Main Router/Orchestrator: client/src/App.tsx
4. Server REST Endpoints: server/server.js
5. DB Schema: server/user.js

I will ask you to perform coding, auditing, testing, or UI design tasks. Always keep the zero-knowledge client-side encryption architecture in mind: the server must NEVER receive plaintext vault data or the raw master password.
```

---

## 🛠️ 2. Feature Expansion Prompts

### 🆕 Prompt A: Add a New Vault Category
Use this prompt to add a new encrypted vault category (e.g., "Secure Notes" or "SSH/API Keys") that integrates into the existing Zero-Knowledge sync flow.

```markdown
I want to add a new category to the LifeVault manager: "[Category Name]" (e.g., "Secure Notes", containing fields: title, content, folder, and tags).

Please guide me through the implementation by providing code for:
1. A new React components sub-view located at client/src/components/[CategoryName]Vault.tsx. It must follow the zero-knowledge decryption/encryption structure similar to PasswordVault.tsx or CardVault.tsx.
2. Modifying VaultContext.tsx to support caching, updating, and syncing this new category.
3. Updating App.tsx to integrate the new navigation option and view states.
4. Ensuring that all new data is encrypted using encryptText from crypto.ts before synchronization with the database.
```

### ⏱️ Prompt B: Auto-Lock and Session Expiry
Use this prompt to add auto-locking after inactivity to prevent physical access compromises.

```markdown
I want to implement an automatic vault lock / session timeout feature in LifeVault.
If the user is inactive (no mouse movements, clicks, or keystrokes) for [Inactivity Duration, e.g., 15 minutes], the application should automatically clear the decrypted keys, logout the user, and redirect them to AuthScreen.tsx.

Please:
1. Show how to monitor user activity inside App.tsx.
2. Explain how to securely clear the derived encryption keys from memory/context in VaultContext.tsx.
3. Ensure no decrypted vault items persist in state or localStorage.
```

### 🎲 Prompt C: Password Generator Extension
Use this prompt to expand the password generator capabilities with options for memorability (diceware) or complexity.

```markdown
I want to enhance the password generator in PasswordVault.tsx.
It should support:
1. **Characters Mode**: Custom length, toggles for Uppercase, Lowercase, Numbers, and Symbols.
2. **Passphrase Mode (Diceware)**: Generates readable, secure passphrases using a list of words separated by hyphens (e.g., 'correct-horse-battery-staple').

Provide the TSX layout, helper functions using window.crypto.getRandomValues for cryptographically secure random number generation, and integration with the password generator modal.
```

---

## 🔒 3. Cryptographic & Security Audits

### 🔍 Prompt A: Client-Side Crypto Audit
Use this prompt to scan the Web Crypto API methods for vulnerabilities.

```markdown
Review the client-side cryptographic functions in crypto.ts.
Specifically analyze:
1. **Key Derivation**: The implementation of deriveKeys using PBKDF2. Is 100,000 iterations sufficient? Are we introducing any side-channel timing attacks when converting keys?
2. **IV Generation**: Are the IVs for encryptText generated securely using getRandomValues? Is the 96-bit length optimal for AES-GCM?
3. **Data Encoding**: Are there potential issues with arrayBufferToBase64 and base64ToArrayBuffer regarding special characters or multi-byte Unicode strings?
Provide suggestions for improving performance and defense-in-depth security.
```

### 🏷️ Prompt B: JWT and Session Security
Use this prompt to audit token generation, authentication middleware, and storage.

```markdown
Audit the authentication middleware and session handling in server.js.
Specifically analyze:
1. The implementation of authenticateToken middleware (lines 34-49). Are we properly checking and sanitizing the authorization header?
2. JWT configuration: The token expires in 12h. What are the security trade-offs of this expiry duration, and how can we implement token revocation/blacklist for forced logouts?
3. The deterministic fake salt routine getSaltForUser. Does this prevent user enumeration attacks? Is there any cryptographic leakage in using FAKE_SALT_SECRET with HMAC-SHA256?
```

### ⚡ Prompt C: PBKDF2 to Argon2id Migration
Use this prompt to design a transition strategy to memory-hard key derivation functions.

```markdown
I want to migrate LifeVault's key derivation from PBKDF2 in crypto.ts to **Argon2id** to prevent GPU-accelerated brute-force attacks on exported backups or compromised databases.

Please plan the migration:
1. How should we import/run Argon2id in a standard Vite/React browser client? (e.g., using WebAssembly wrapper).
2. Detail the changes required in deriveKeys.
3. How can we implement backward compatibility so that existing users can migrate their encryption key automatically the next time they successfully log in using their master password?
```

---

## 🧪 4. Testing & QA Automation

### 🧬 Prompt A: Cryptographic Unit Tests
Use this prompt to generate unit tests for the cryptographic functions.

```markdown
Write a complete suite of unit tests for the cryptographic functions in crypto.ts using [Test Framework, e.g., Vitest/Jest].

The test suite must cover:
1. `deriveKeys`: Verify deterministic output (same password + salt yields same encKey and authHash).
2. `encryptText` & `decryptText`: Verify that encrypting a text string and decrypting the payload returns the exact original text.
3. `calculatePasswordEntropy`: Test with weak, medium, and strong passwords and verify that score thresholds are met.
4. Edge cases: Empty strings, long unicode payloads, and corrupt/tampered ciphertext arrays.
```

### 🤖 Prompt B: Integration Testing of Auth Flow
Use this prompt to test the zero-knowledge signup and login sequence.

```markdown
Write an integration test suite for the registration and login flows in AuthScreen.tsx.
Use [Testing Library, e.g., Cypress / Playwright / React Testing Library].

Mock the backend API calls:
- POST `/api/auth/salt`
- POST `/api/auth/register`
- POST `/api/auth/login`

Ensure that you verify:
1. The client correctly derives keys before hitting the login/register endpoints.
2. If the user keys are incorrect, error messages display correctly.
3. Upon successful registration/login, user's derived key is populated into context, and the view changes to Dashboard.tsx.
```

---

## 🎨 5. Design & User Experience Polish

### 💎 Prompt A: Glassmorphic Dark-Mode Refresh
Use this prompt to redesign the UI into a premium, modern dashboard.

```markdown
I want to upgrade the styling of Dashboard.tsx and index.css to feel premium, futuristic, and highly polished.

Modify the UI design system using CSS/Tailwind:
1. Apply a dark glassmorphic scheme (translucent backdrops, subtle white borders, backdrop-blur).
2. Incorporate vibrant neon gradient borders (cyan, purple, emerald) for cards to designate different vault types.
3. Introduce smooth micro-animations on hover and transitions when switching between active tabs.
4. Refine typography using a modern font family (e.g., 'Inter' or 'Outfit').

Provide the CSS/Tailwind style utility definitions and update the TSX elements.
```

---

> [!NOTE]
> Ensure that whenever you run these prompts, you paste the relevant code from crypto.ts, VaultContext.tsx, or server.js so that the LLM has access to the most up-to-date syntax.
