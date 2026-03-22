<div align="center">
  <img src="https://account.xfeatures.net/logo.png" alt="Xfeatures Account Logo" width="120" />

  <h1>🛡️ Xfeatures Account</h1>

  <p>
    <strong>A fortress-like, enterprise-grade Identity and Access Management (IAM) ecosystem built for the modern web.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
    <img src="https://img.shields.io/badge/SQLite_D1-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="Cloudflare D1" />
    <img src="https://img.shields.io/badge/Security-Strict-FF0000?style=flat-square&logo=springsecurity&logoColor=white" alt="Strict Security" />
  </p>
</div>

---

> [!CAUTION]
> ## 🛑 ⚠️ STRICTLY PROPRIETARY LICENSE - DO NOT USE ⚠️ 🛑
>
> **THIS REPOSITORY IS FOR SHOWCASE AND PORTFOLIO PURPOSES ONLY.**
>
> The source code, assets, and architecture contained within this repository are the exclusive intellectual property of **XfeaturesGroup**.
>
> * **NO** permission is granted to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software.
> * **NO** open-source license (such as MIT, GPL, or Apache) applies to this project.
> * Any unauthorized use, reproduction, or commercial exploitation of this code is strictly prohibited and will be subject to legal action.
>
> By viewing this repository, you agree to these terms.

---

## 📖 About The Project

**Xfeatures Account** is a high-performance, centralized authentication hub designed with a **Zero-Compromise** approach to user security. Operating entirely on global edge networks, it provides seamless yet impenetrable identity management for the entire Xfeatures ecosystem.

Every module in this platform was engineered with **Defense-in-Depth** principles, ensuring that user data, sessions, and identities remain completely secure against both infrastructure breaches and client-side attacks.

## 🛡️ Fortified Security Architecture

Security isn't an afterthought in Xfeatures Account—it's the foundation.

* **🪨 Military-Grade Cryptography:** Passwords are never stored or transmitted in plaintext. We utilize native WebCrypto APIs to hash passwords using **PBKDF2 (SHA-512)** with 100,000 iterations and unique 32-byte cryptographic salts per user.
* **👻 Zero-Knowledge Session Management:** Session tokens (generated with 64-byte entropy) are **strictly hashed (SHA-256)** before being committed to the database. Even in the catastrophic event of a total database leak, attackers cannot hijack active user sessions.
* **🔐 Bulletproof 2FA (TOTP):** Robust Two-Factor Authentication implementation. We utilize a unique `pending_secret` architecture to eliminate race-condition lockouts during setup. All backup recovery codes are cryptographically hashed prior to storage.
* **🛡️ OAuth 2.0 CSRF Armor:** Third-party integrations (GitHub, Discord) are fortified with strict `state` validation protocols, completely neutralizing Cross-Site Request Forgery (CSRF) and OAuth account hijacking vectors.
* **🔍 Deep-Packet Media Validation:** Avatar uploads do not rely on easily spoofed file extensions. Edge workers perform deep **Magic Byte (Hex Signature) validation** to guarantee that only authentic image containers (JPG, PNG, WEBP) reach the Cloudflare R2 buckets.
* **🕵️ Comprehensive Audit Logging:** Every sensitive action (successful/failed logins, profile mutations, 2FA modifications, session revocations) is permanently recorded with IP address and geolocation data for user anomaly detection.

## 🛠️ Technology Stack

| Module | Technologies |
| :--- | :--- |
| **Backend (Edge API)** | ⚡ Cloudflare Workers, `itty-router`, D1 (Serverless SQLite), R2 Object Storage |
| **Cryptography** | 🔑 Native WebCrypto API (PBKDF2, SHA-512, SHA-256, RNG), Custom TOTP |
| **Frontend (Web)** | ⚛️ React.js, Vite, Tailwind CSS, Zustand, React Router |
| **Infrastructure Protection**| 🛡️ Cloudflare WAF, Edge Rate Limiting, DDoS Mitigation |

---

## 🏗️ Deployment Highlights

* **Stateless Edge Computing:** The backend operates entirely on Cloudflare Workers without cold starts. Compute runs geographically closest to the user, preventing centralized server bottlenecks.
* **Data Locality & Speed:** Utilizing Cloudflare D1 (Serverless SQLite at the edge), database queries execute with ultra-low latency.
* **Automated CI/CD Pipelines:** Integrated directly with Cloudflare Pages for seamless, secure, and continuous deployments directly from version control.

---

<div align="center">
  <sub>Copyright © 2026 XfeaturesGroup. All Rights Reserved.</sub>
</div>