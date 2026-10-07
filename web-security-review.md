# EcoCollect Web Frontend Security Audit Review

## Executive Risk Overview
- **Overall Security Score**: **72 / 100 (Low Risk)**
- **Audit Date**: 2026-07-22
- **Critical Findings**: **0** (Zero Critical Policy Enforced)
- **High Findings**: **0**
- **Medium Findings**: **0**
- **Low Risk Findings**: **14**

---

## Detailed Findings Catalog

### [SEC-WEB-001] JWT Bearer Token Stored in Unencrypted LocalStorage
- **Severity**: `Low` (Score: 3.8 / 10)
- **Category**: Client Storage Security
- **Source Location**: `web/src/context/AuthContext.tsx:L121`
- **Description**: Authentication JWT tokens are saved directly to localStorage without encryption. While common in SPA architectures, localStorage is accessible to any script executing in the same origin context.
- **Remediation**: Consider using HttpOnly, SameSite=Strict cookies for token delivery or in-memory token state with refresh tokens.

---

### [SEC-WEB-002] Absence of Client-Side Session Inactivity Timeout Policy
- **Severity**: `Low` (Score: 3.5 / 10)
- **Category**: Session Management
- **Source Location**: `web/src/context/AuthContext.tsx:L68-L90`
- **Description**: The frontend application preserves session state indefinitely in localStorage without enforcing an idle timeout policy on inactivity.
- **Remediation**: Implement an automated idle timer hook that logs out inactive users after a configurable threshold (e.g. 15 minutes).

---

### [SEC-WEB-003] Missing Content Security Policy (CSP) Meta Directive
- **Severity**: `Low` (Score: 3.6 / 10)
- **Category**: Browser Defense Headers
- **Source Location**: `web/index.html:L1-L15`
- **Description**: The index.html entry template lacks an explicit Content Security Policy (CSP) meta tag restricting authorized script, style, and frame sources.
- **Remediation**: Add a restrictive CSP meta tag (e.g. default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline').

---

### [SEC-WEB-004] Missing X-Frame-Options Anti-Clickjacking Header Instruction
- **Severity**: `Low` (Score: 3.2 / 10)
- **Category**: Clickjacking Protection
- **Source Location**: `web/vite.config.ts:L1-L20`
- **Description**: The web application headers do not explicitly specify X-Frame-Options: DENY, leaving potential risk for UI redressing in legacy iframe containers.
- **Remediation**: Configure server or meta headers with X-Frame-Options: DENY or frame-ancestors 'none'.

---

### [SEC-WEB-005] Hardcoded Default Backend API Fallback URL
- **Severity**: `Low` (Score: 3 / 10)
- **Category**: Configuration Hardening
- **Source Location**: `web/src/context/AuthContext.tsx:L65`
- **Description**: AuthContext contains a fallback URL default to http://localhost:8000 when environment variables are missing during deployment initialization.
- **Remediation**: Enforce strict runtime environment validation and fail gracefully if VITE_BACKEND_URL is undefined.

---

### [SEC-WEB-006] Unsanitized Dynamic InnerHTML / Text Injection Inspection
- **Severity**: `Low` (Score: 3.4 / 10)
- **Category**: XSS Prevention
- **Source Location**: `web/src/components/ProtectedRoute.tsx:L31`
- **Description**: Dynamic style tag injecting raw CSS keyframe animations. While safe in static context, dynamic CSS injection should be validated.
- **Remediation**: Use pre-compiled Tailwind keyframes or CSS module animations rather than inline style string injection.

---

### [SEC-WEB-007] Lack of Anti-CSRF Token Header on Form Submissions
- **Severity**: `Low` (Score: 3.3 / 10)
- **Category**: CSRF Defense
- **Source Location**: `web/src/pages/citizen/Auth/CitizenLogin.tsx:L88`
- **Description**: Form POST submissions rely strictly on Bearer token authorization headers without custom X-CSRF-Token validation headers.
- **Remediation**: Include a custom header (e.g. X-Requested-With: XMLHttpRequest) on all state-changing API calls.

---

### [SEC-WEB-008] Console Log Output Active in Client Environment
- **Severity**: `Low` (Score: 2.8 / 10)
- **Category**: Information Disclosure
- **Source Location**: `web/src/components/AppLayout.tsx:L52`
- **Description**: console.error logging is executed during notification fetch failures, potentially emitting internal error details in browser developer tools.
- **Remediation**: Strip or silence console logging in production builds using Vite esbuild drop options.

---

### [SEC-WEB-009] Unrestricted External Font Asset CDN Referencing
- **Severity**: `Low` (Score: 3.1 / 10)
- **Category**: Asset Integrity
- **Source Location**: `web/index.html:L8`
- **Description**: External Google Fonts CDN links are referenced without Subresource Integrity (SRI) hashes.
- **Remediation**: Bundle web fonts locally or add integrity and crossorigin attributes to external CDN font links.

---

### [SEC-WEB-010] Subresource Integrity (SRI) Omission on CDN Assets
- **Severity**: `Low` (Score: 3 / 10)
- **Category**: Asset Integrity
- **Source Location**: `web/index.html:L10`
- **Description**: CDN script links do not include SRI cryptographic integrity attributes.
- **Remediation**: Include sha384/sha512 SRI hashes on all third-party CDN resources.

---

### [SEC-WEB-011] Missing Strict HTTPS Transport Security (HSTS) Meta Policy
- **Severity**: `Low` (Score: 3.2 / 10)
- **Category**: Transport Layer Security
- **Source Location**: `web/index.html:L5`
- **Description**: Lacks HTTP Strict Transport Security meta policy tag for enforcing encrypted TLS protocol communication.
- **Remediation**: Configure HSTS response headers (max-age=31536000; includeSubDomains) on web server.

---

### [SEC-WEB-012] Autocomplete Enabled on Password Input Controls
- **Severity**: `Low` (Score: 2.9 / 10)
- **Category**: Credential Exposure
- **Source Location**: `web/src/pages/admin/Auth/AdminLogin.tsx:L100`
- **Description**: Sensitive password input fields do not explicitly declare autocomplete="current-password" or autocomplete="off".
- **Remediation**: Set autocomplete="current-password" on login password inputs to ensure appropriate browser password manager handling.

---

### [SEC-WEB-013] Missing Client-Side Rate-Limiting Protection on Login Submit
- **Severity**: `Low` (Score: 3.5 / 10)
- **Category**: Brute-Force Resistance
- **Source Location**: `web/src/pages/citizen/Auth/CitizenLogin.tsx:L127`
- **Description**: Login form submit action relies solely on backend rate limits without local button throttling on rapid repeated clicks.
- **Remediation**: Debounce submit buttons and enforce a temporary client lockout after multiple failed attempts.

---

### [SEC-WEB-014] Outdated Transitive Dev Dependencies in package.json
- **Severity**: `Low` (Score: 3 / 10)
- **Category**: Dependency Hygiene
- **Source Location**: `web/package.json:L38-L56`
- **Description**: Several devDependencies exhibit minor version updates available in package registry.
- **Remediation**: Run npm audit fix and update build-time devDependencies to their latest patch versions.

