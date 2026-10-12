# NetShare

> **Network File Server, Protocol Explorer & Networking Lab**  
> Computer Networks Mini Project

NetShare combines a modern, multi-user web-based file management application with real-time HTTP telemetry, an educational protocol explorer, and a standalone Python TCP socket laboratory.

---

## 🌟 Core Features

- **Multi-User File Management:** Personal storage namespaces, folder hierarchies, search, sorting, and file organization.
- **Direct-to-Storage Transfers:** Files stream directly to private Supabase Object Storage, bypassing serverless function payload constraints.
- **Independent SHA-256 Verification:** Independent client-side digest calculation validates received files byte-for-byte with green/red integrity indicators.
- **Monotonic Transfer Telemetry:** High-resolution duration tracking with `performance.now()`, effective application throughput calculation ($\text{MiB/s}$), and real-time activity graphs with Recharts.
- **Interactive Request Inspector:** Detailed drawer explaining HTTP methods, endpoints, status codes, observable headers, and browser observability boundaries.
- **Secure Expiring Share Links:** Cryptographically random tokens stored as SHA-256 hashes (`token_hash`) with configurable expiration (1h, 24h, 7d), revocation, and guest download support.
- **Educational Protocol Explorer:** Interactive visualization covering Layer 7 (HTTP/1.1 vs HTTP/2 vs HTTP/3), Layer 6 (TLS 1.3), Layer 4 (TCP vs UDP/QUIC), and Layer 3 (IP & MTU).
- **Standalone Python TCP Socket Lab (`tcp-lab/`):** Custom 10-byte binary framing protocol (`NSHR`), handling stream fragmentation via `recv_exact`, oversized payload protection, and Wireshark packet capture analysis.

---

## 📂 Repository Structure

```
netshare/
├── src/
│   ├── app/
│   │   ├── (auth)/                # Login & Registration views
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/           # Authenticated user dashboard
│   │   │   ├── files/             # File Manager (P0)
│   │   │   ├── network/           # Network Activity & Telemetry (P0/P1)
│   │   │   ├── protocols/         # Interactive Protocol Explorer (P1)
│   │   │   └── lab/               # Controlled Benchmarks & Experiments (P1)
│   │   ├── api/                   # Route Handlers
│   │   │   ├── auth/              # Auth callback & signout
│   │   │   ├── files/             # Metadata & download endpoints
│   │   │   ├── folders/           # Folder hierarchy endpoints
│   │   │   ├── shares/            # Expiring share link endpoints
│   │   │   ├── telemetry/         # Telemetry ingestion & aggregates
│   │   │   └── experiments/       # Saved benchmark history
│   │   └── share/[token]/         # Public guest share redemption page
│   ├── components/                # Reusable UI & module components
│   │   ├── file-manager/
│   │   ├── request-inspector/
│   │   └── dashboard/
│   ├── lib/                       # Supabase client/server, crypto, utils
│   └── types/                     # TypeScript database & domain types
├── supabase/
│   └── migrations/                # PostgreSQL schema & RLS migrations
├── tcp-lab/                       # Standalone Python TCP socket lab
│   ├── protocol.py                # NSHR 10-byte binary framing logic
│   ├── server.py                  # Stateful TCP socket listener
│   ├── client.py                  # Benchmarking TCP client
│   ├── test_edge_cases.py         # Automated edge-case unit test suite
│   ├── README.md                  # Lab documentation
│   └── WIRESHARK_GUIDE.md         # Step-by-step packet capture guide
└── docs/
    ├── ARCHITECTURE.md            # System architecture & data flow
    └── NETWORKING_CONCEPTS.md     # Viva prep guide & syllabus reference
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js:** v20.9.0 or later (v22 recommended)
- **npm:** v10+
- **Python:** 3.9 or later
- **Supabase Account:** Free project for Auth, PostgreSQL, and Storage

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Provide your Supabase Project URL and Public Anon Key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database & Storage Setup
1. Open your Supabase project dashboard -> **SQL Editor**.
2. Run `supabase/migrations/0001_initial_schema.sql` to create all tables and Row Level Security policies.
3. In **Storage**, create a new bucket named `netshare-files` and toggle it to **Private**.
4. Run `supabase/migrations/0002_storage_policies.sql` to configure isolated user path policies.

### 4. Run the Web Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running the Python TCP Socket Lab

The TCP laboratory runs independently over raw TCP sockets on port `9099`:

### Start TCP Server:
```bash
python3 tcp-lab/server.py --host 127.0.0.1 --port 9099
```

### Transmit a File via TCP Client:
```bash
python3 tcp-lab/client.py --size-mb 2.0
```

### Run Automated Edge-Case Tests:
```bash
python3 tcp-lab/test_edge_cases.py
```
*Executes all 5 automated acceptance tests covering normal transfer, fragmented headers, oversized frames, sudden disconnect cleanup, and payload corruption detection.*

### Wireshark Packet Capture:
See [`tcp-lab/WIREX_GUIDE.md`](./tcp-lab/WIRESHARK_GUIDE.md) for step-by-step instructions on capturing the TCP 3-way handshake (`SYN`, `SYN-ACK`, `ACK`), binary `NSHR` frames, and graceful `FIN` teardown on loopback (`lo0`).

---

## 📋 Acceptance Criteria Test Mapping (PRD Section 14)

| Test ID | Description | Result / Verification Path |
| :--- | :--- | :---: |
| **T-01** | Register and sign in | Verified via Supabase Auth & protected proxy middleware |
| **T-02** | Upload allowed file | Verified via direct-to-storage upload & PostgreSQL metadata |
| **T-03** | Cross-user read isolation | Verified via DB Row Level Security & private storage policies |
| **T-04** | Cross-user delete/update | Verified via API ownership validation & DB policies |
| **T-05** | Download integrity | Verified via client Web Crypto SHA-256 match |
| **T-06** | Invalid metadata rejection | Verified via `/api/files` schema validation (`400 Bad Request`) |
| **T-07** | Telemetry recording | Verified via `transfer_logs` & live Network Dashboard |
| **T-08** | Partial storage/DB failure | Verified via dropzone partial-failure detection |
| **T-09** | TCP normal transfer | Verified via `test_edge_cases.py` (exact bytes & SHA-256 match) |
| **T-10** | TCP fragmented header | Verified via `test_edge_cases.py` (1-byte chunks via `recv_exact`) |
| **T-11** | TCP oversized frame | Verified via `test_edge_cases.py` (safe rejection > 64 KiB) |
| **T-12** | TCP premature disconnect | Verified via `test_edge_cases.py` (temporary file cleanup) |
| **T-13** | Packet capture | Verified via Wireshark capture guide & loopback filter |
| **T-14** | Production smoke test | Verified via Next.js 16 production build (`npm run build`) |

---

## 📚 Technical Documentation

- [System Architecture Document](docs/ARCHITECTURE.md)
- [Networking Concepts & Viva Prep Guide](docs/NETWORKING_CONCEPTS.md)
- [Wireshark Packet Capture Guide](tcp-lab/WIRESHARK_GUIDE.md)
- [Detailed Implementation Phases](DEVELOPMENT_PHASES.md)
