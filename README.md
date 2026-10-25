# SecureGuard AI — Stego-Crypt

> **Modern Web-Based Document Intelligence, Automated PII Redaction, Password-Derived AES Encryption, and Reversible LSB Steganography Restoration.**
> Built with zero-install, high-performance Web Cryptography and Steganography.

---

## 🛡️ Overview

**SecureGuard AI** provides controlled, reversible document redaction. Rather than permanently discarding sensitive data via destructive redaction, SecureGuard AI masks target information from public view while cryptographically embedding an encrypted copy of the unredacted image regions inside the document's own pixels using Least Significant Bit (LSB) steganography.

Authorized recipients possessing the correct password can authenticate and restore the document back to its original high-resolution state with lossless precision.

---

## ⚡ Key Features

- **Automated OCR & PII Detection**:
  - **Indian Aadhaar Number**: 12-digit spaced/hyphenated identity formats with length validation.
  - **PAN Card**: Alphanumeric format (`ABCDE1234F`) for Indian Income Tax cards.
  - **Payment Cards**: 16-digit Visa/Mastercard credit and debit cards with **Luhn algorithm** checksum validation.
  - **Phone Numbers**: Indian 10-digit mobile numbers with optional `+91` prefix and `6-9` starting digit verification.
  - **Email Addresses**: RFC-compliant corporate and personal email matchers.
  - **Passports & Pincodes**: Indian Passport serials and 6-digit postal PIN codes.
  - **US Social Security Numbers (SSN)** and international date formats.
  - Categorized by **High**, **Medium**, and **Low** security severity with one-click bulk toggles.

- **Dual Redaction Modes**:
  - **Solid Blackout**: Traditional high-contrast black redaction blocks.
  - **Mosaic Pixel Blur**: Non-uniform privacy blur across defined bounding regions.

- **Enterprise Cryptography**:
  - **PBKDF2-HMAC-SHA256**: 100,000 iterations with cryptographically random 16-byte salt per encryption.
  - **AES-256-GCM**: Authenticated encryption providing confidentiality and tamper detection.

- **Multi-Slot Chained Redaction**:
  - Multiple users or departments can redact different sections of the same document using distinct keys.
  - Inserting a new password decrypts and restores only the regions authorized for that key without interfering with other masked sections.

- **True LSB Steganography Engine**:
  - Embeds data into the least significant bits of RGB channels (leaving Alpha at 255 for lossless PNG compatibility).
  - 4-byte big-endian framing header storing payload length.
  - Zlib/Deflate compression (level 9) maximizing stego capacity.

- **Interactive Manual Redact Canvas**:
  - Click-and-drag mouse controls to draw custom redaction boxes over signatures, photographs, stamps, or confidential clauses.

- **Reversible Restoration**:
  - Recovers encrypted pixel patches from LSB stego layers and pastes them back at original coordinates with green verification outlines.

- **Stego Analyzer & Bit-Plane Visualizer**:
  - Contrast map of the 0th bit plane to inspect payload distribution, capacity metrics, and entropy noise.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 22+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/JamunaSenthil/stego-crypto.git
cd stego-crypto

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Cryptography**: Web Crypto API (`SubtleCrypto` PBKDF2 + AES-256-GCM)
- **Compression**: Pako (Zlib Deflate/Inflate)
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti, Motion

---

## 📜 License

Apache-2.0 License. Maintained by Jamuna Senthil.
