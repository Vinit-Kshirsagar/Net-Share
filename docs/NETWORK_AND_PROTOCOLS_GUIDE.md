# NetShare — Network Architecture, Protocol Tracking & Telemetry Guide

> **Course / Subject:** Computer Networks Mini Project & Viva Reference  
> **System Name:** NetShare (Network File Server & Protocol Explorer)  
> **Key Focus Areas:** OSI 7-Layer Model, TCP/IP Suite, HTTP/1.1 vs HTTP/2 vs HTTP/3, Transport Framing, Client-Side Telemetry, Cryptographic Integrity (SHA-256), and Wireshark Packet Inspection.

---

## Table of Contents
1. [Executive Summary & High-Level Architecture](#1-executive-summary--high-level-architecture)
2. [What Happens Under the Hood: The Full Lifecycle of an Operation](#2-what-happens-under-the-hood-the-full-lifecycle-of-an-operation)
   - [2.1 User Authentication (Signup & Login)](#21-user-authentication-signup--login)
   - [2.2 File Upload Pipeline](#22-file-upload-pipeline)
   - [2.3 File Download & Independent Integrity Verification](#23-file-download--independent-integrity-verification)
   - [2.4 Public Sharing & 10-Minute Expiring Links](#24-public-sharing--10-minute-expiring-links)
3. [How NetShare Tracks the Network & Captures Telemetry](#3-how-netshare-tracks-the-network--captures-telemetry)
   - [3.1 High-Resolution Monotonic Duration Tracking (`performance.now()`)](#31-high-resolution-monotonic-duration-tracking-performancenow)
   - [3.2 The Effective Application Throughput Formula](#32-the-effective-application-throughput-formula)
   - [3.3 Telemetry Schema & Asynchronous Event Dispatch](#33-telemetry-schema--asynchronous-event-dispatch)
   - [3.4 The Browser Observability Boundary (L7 vs L4)](#34-the-browser-observability-boundary-l7-vs-l4)
4. [How NetShare Dissects Protocols Across the OSI 7-Layer Model](#4-how-netshare-dissects-protocols-across-the-osi-7-layer-model)
   - [Layer 7: Application Layer (HTTP/2, REST, Supabase)](#layer-7-application-layer)
   - [Layer 6: Presentation Layer (MIME Types & SHA-256 Digests)](#layer-6-presentation-layer)
   - [Layer 5: Session Layer (JWT Tokens, TLS Sessions & Keep-Alive)](#layer-5-session-layer)
   - [Layer 4: Transport Layer (TCP Segments, MSS, Handshake, Congestion)](#layer-4-transport-layer)
   - [Layer 3: Network Layer (IPv4/IPv6 Packets, MTU & Routing)](#layer-3-network-layer)
   - [Layer 2: Data Link Layer (Ethernet Frames, MAC & ARP)](#layer-2-data-link-layer)
   - [Layer 1: Physical Layer (Bitstreams & Transmission Media)](#layer-1-physical-layer)
5. [How Network Data is Visualized to the User](#5-how-network-data-is-visualized-to-the-user)
   - [5.1 The Real-Time Protocol Inspector Modal](#51-the-real-time-protocol-inspector-modal)
   - [5.2 The Network Activity Dashboard (`/network`)](#52-the-network-activity-dashboard-network)
   - [5.3 The HTTP Request Inspector Drawer](#53-the-http-request-inspector-drawer)
   - [5.4 The Controlled Networking Lab & Benchmark Runner (`/lab`)](#54-the-controlled-networking-lab--benchmark-runner-lab)
6. [Low-Level Transport Lab: The Python TCP Socket Server (`tcp-lab/`)](#6-low-level-transport-lab-the-python-tcp-socket-server-tcp-lab)
   - [6.1 Why Python Sockets are Needed Beyond the Browser](#61-why-python-sockets-are-needed-beyond-the-browser)
   - [6.2 The Custom Binary Frame Protocol (`NSHR`)](#62-the-custom-binary-frame-protocol-nshr)
   - [6.3 Solving Stream Fragmentation with `recv_exact()`](#63-solving-stream-fragmentation-with-recv_exact)
   - [6.4 Wireshark Packet Capture & Verification](#64-wireshark-packet-capture--verification)
7. [Viva & Project Defense Guide: Talking Points & Model Q&A](#7-viva--project-defense-guide-talking-points--model-qa)

---

## 1. Executive Summary & High-Level Architecture

NetShare is built to bridge the gap between **high-level modern web applications** and **fundamental Computer Networking principles**. Most web applications hide network protocols behind high-level abstraction libraries like `fetch()` or `axios`. NetShare makes the network transparent: every upload, download, authentication request, and file share is metered, analyzed, and mapped to the **OSI 7-Layer model** and **TCP/IP stack**.

### Architecture Decomposition

```mermaid
flowchart TD
    subgraph Client["Browser Client (Next.js 16 / React 19)"]
        UI["UI & File Manager"]
        Crypto["Web Crypto API (SubtleCrypto SHA-256)"]
        Perf["Performance Monotonic Timer (performance.now())"]
        Inspector["Protocol Inspector Modal & Telemetry Drawer"]
    end

    subgraph ControlPlane["Control Plane (Next.js Route Handlers)"]
        APIAuth["/api/auth (Session Refresh)"]
        APIFiles["/api/files (Metadata & Scopes)"]
        APIShares["/api/shares (10-min Expiring Tokens)"]
        APITelemetry["/api/telemetry (Time-Series Aggregations)"]
    end

    subgraph DataPlane["Data Plane (Supabase Infrastructure)"]
        Postgres[("PostgreSQL Database<br/>- files, folders, shares<br/>- transfer_logs, experiments<br/>(Row Level Security Enabled)")]
        Storage[("Object Storage (netshare-files bucket)<br/>- Direct Streaming PUT/GET<br/>- 10-Min Signed URLs")]
    end

    subgraph LocalTransportLab["Transport Layer Laboratory (Python 3)"]
        TCPServer["TCP Server (:9099)<br/>NSHR Binary Frame Handler"]
        TCPClient["TCP Client<br/>Packet Chunking & Framing"]
        Wireshark["Wireshark Packet Capture<br/>(SYN, ACK, PSH, FIN Inspection)"]
    end

    UI --> Crypto
    UI --> Perf
    UI -- "1. Control Requests (JSON)" --> ControlPlane
    ControlPlane -- "2. Verify JWT & RLS" --> Postgres
    UI -- "3. Direct Data Stream (Bypassing Serverless)" --> Storage
    UI --> Inspector
    TCPClient -- "Raw TCP Segments" --> TCPServer
    TCPServer -. "Packet Sniffing" .-> Wireshark
```

### Key Architectural Separation: Control Plane vs. Data Plane
1. **Control Plane (`Next.js Route Handlers` + `PostgreSQL`):** Handles authentication, folder navigation, metadata bookkeeping, share link creation, and telemetry recording. It operates with lightweight JSON payloads (kilobytes).
2. **Data Plane (`Supabase Object Storage`):** File binaries stream **directly between the client browser and Supabase Storage**. Large files never pass through intermediate serverless function memory, eliminating CPU/RAM exhaustion and Vercel payload size limits.

---

## 2. What Happens Under the Hood: The Full Lifecycle of an Operation

### 2.1 User Authentication (Signup & Login)
When a user registers or logs in, the network activity involves the following sequence:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant App as Next.js Proxy (Middleware)
    participant Auth as Supabase Auth Edge (/auth/v1/token)
    participant DB as PostgreSQL (auth.users)

    User->>Auth: HTTPS POST /auth/v1/token (grant_type=password)
    Note over User,Auth: TLS 1.3 Handshake + AES-256-GCM Cipher
    Auth->>DB: Query user credentials & verify bcrypt/Argon2 password hash
    DB-->>Auth: Verified
    Auth-->>User: HTTP 200 OK (Returns JWT Access Token & Refresh Token)
    User->>App: Set HttpOnly, Secure, SameSite=Lax Session Cookies
    App-->>User: Redirect to /files
```

- **Network Protocols:**
  - **DNS:** Resolves `chotuwwjokczbwcscfmo.supabase.co` to its IP address.
  - **TLS 1.3:** Ephemeral Diffie-Hellman (`ECDHE`) key exchange guarantees **Forward Secrecy**.
  - **HTTP/2:** Streams headers with HPACK compression.
  - **Session Layer:** Issues an HMAC-SHA256 signed JSON Web Token (JWT) containing `sub` (User ID), `exp` (expiration), and `role: authenticated`.

---

### 2.2 File Upload Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant WebCrypto as Browser Web Crypto API
    participant Storage as Supabase Storage (/object/netshare-files)
    participant API as Next.js API (/api/files)
    participant DB as PostgreSQL (public.files)
    participant Telemetry as Telemetry Service (/api/telemetry)

    User->>WebCrypto: 1. Drop file -> crypto.subtle.digest("SHA-256", file)
    Note over WebCrypto: Computes independent 64-char hex digest in memory
    WebCrypto-->>User: Checksum: e3b0c44298fc1c149afb...
    
    Note over User: t0 = performance.now()
    User->>Storage: 2. Direct HTTP PUT /object/netshare-files/{userId}/{fileUuid}-{name}
    Note over User,Storage: File bytes stream directly to private S3-compatible bucket
    Storage-->>User: HTTP 200 OK (Upload Successful)
    Note over User: uploadDuration = performance.now() - t0

    User->>API: 3. POST /api/files (File metadata + checksum + uploadDuration)
    API->>DB: INSERT into public.files (owner_id = auth.uid(), checksum, size_bytes)
    DB-->>API: Row Created
    API-->>User: HTTP 201 Created

    User->>Telemetry: 4. POST /api/telemetry (operation="upload", durationMs, bytesTransferred)
    Telemetry->>DB: INSERT into public.transfer_logs
    DB-->>Telemetry: Logged
```

1. **Pre-Transfer Checksum:** Before sending a single byte over the wire, the client computes the file's SHA-256 hash using the native browser `crypto.subtle` API. This creates an immutable mathematical baseline for data integrity.
2. **Direct Storage PUT:** The browser initiates an HTTP `PUT` directly to the object storage endpoint, streaming the file payload.
3. **Metadata Registration:** Upon storage confirmation, the browser registers the file record (size, MIME type, storage path, folder ID, and SHA-256 digest) via `POST /api/files`.
4. **Partial Failure Handling:** If step 2 succeeds but step 3 fails (e.g. database constraint error), the application detects the partial state and alerts the user rather than leaving an orphaned phantom record.

---

### 2.3 File Download & Independent Integrity Verification

When User B downloads a public file uploaded by User A, the system guarantees end-to-end transport verification:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser (User B)
    participant API as Next.js API (/api/files/[id]/download)
    participant DB as PostgreSQL (public.files)
    participant Storage as Supabase Storage
    participant WebCrypto as Browser Web Crypto API
    participant Telemetry as Telemetry (/api/telemetry)

    User->>API: 1. GET /api/files/:id/download
    API->>DB: Query file metadata & check (owner_id == user.id OR is_public == true)
    DB-->>API: Access Granted (File metadata + expected SHA-256)
    API->>Storage: createSignedUrl(storage_path, 600) [10-min expiry]
    Storage-->>API: Signed URL with HMAC signature token
    API-->>User: HTTP 200 OK { signedUrl, expectedChecksum }

    Note over User: t_start = performance.now()
    User->>Storage: 2. GET {signedUrl}
    Storage-->>User: Stream binary ArrayBuffer
    Note over User: t_end = performance.now() (fetchDuration measured)

    User->>WebCrypto: 3. crypto.subtle.digest("SHA-256", arrayBuffer)
    WebCrypto-->>User: computedChecksum
    Note over User: Compare computedChecksum === expectedChecksum

    alt Checksum Matches
        Note over User: Status: MATCHED (Green Shield Icon)
        User->>User: Trigger browser file save (Blob URL anchor click)
    else Checksum Mismatch
        Note over User: Status: CORRUPTED (Red Alert Icon, ERR_CHECKSUM_MISMATCH)
    end

    User->>Telemetry: 4. POST /api/telemetry (operation="download", durationMs, bytes, status)
```

**Why this is crucial for Computer Networks:**
- It proves that **data integrity** is distinct from **encryption**. Even if TLS 1.3 prevents tampering in transit, intermediate proxy corruption, storage disk sector bit-rot, or premature socket closure can silently corrupt data.
- The client-side independent recalculation proves byte-level parity without trusting the network path.

---

### 2.4 Public Sharing & 10-Minute Expiring Links

NetShare features two models for cross-user sharing:
1. **Platform Public Files (`is_public = true`):**
   - The owner toggles a file to Public.
   - Any authenticated peer user (e.g. User B) can discover the file under the **Public Network** filter tab.
   - The API uses PostgREST compound filters: `.or(`and(owner_id.eq.${user.id},folder_id.is.null),is_public.eq.true`)`.
   - Non-owners receive a `Public Peer` badge; mutating actions (Rename, Delete, Toggle Public) are blocked at both UI and RLS tiers, while Download and Protocol Inspection are permitted.
2. **Expiring Guest Share Links (`/share/[token]`):**
   - Generates a 32-byte cryptographically secure random token (64 hex characters).
   - Only the **SHA-256 hash** of this token (`token_hash`) is stored in PostgreSQL.
   - Defaults to a **10-minute expiration window** (`expires_at = now() + interval '10 minutes'`).
   - Guest redemption validates:
     $$\text{Valid} \iff \text{now}() < \text{expires\_at} \quad\land\quad \text{revoked\_at IS NULL}$$
   - Generates a short-lived (600-second) signed storage download URL on redemption.

---

## 3. How NetShare Tracks the Network & Captures Telemetry

### 3.1 High-Resolution Monotonic Duration Tracking (`performance.now()`)

In standard web applications, developers often calculate time using `Date.now()`. In NetShare, all telemetry relies exclusively on `performance.now()`.

| Feature | `Date.now()` | `performance.now()` |
| :--- | :--- | :--- |
| **Clock Source** | Wall-clock time (System clock) | Monotonic hardware timer (`performance.timeOrigin`) |
| **Precision** | Milliseconds ($\approx 1 \text{ ms}$) | Sub-millisecond (Microsecond fractions, e.g. `12.435 ms`) |
| **NTP Vulnerability** | Vulnerable to clock skew, NTP adjustments, daylight savings jumps | **Immune to clock adjustments**; strictly increases monotonically |
| **NetShare Usage** | Never used for transfer durations | Standard for all network transfer benchmarking |

#### Code Implementation (`download-verifier.ts`):
```typescript
const startTime = performance.now()

// ... network fetch ...
const response = await fetch(signedUrl)
const arrayBuffer = await response.arrayBuffer()

const totalDuration = performance.now() - startTime // Milliseconds with microsecond precision
```

---

### 3.2 The Effective Application Throughput Formula

NetShare calculates effective application throughput using the exact payload bytes transferred and the monotonic elapsed time:

$$\text{Throughput (MiB/s)} = \frac{\text{Bytes Transferred}}{(1024 \times 1024) \times \left(\frac{\text{Duration in ms}}{1000}\right)}$$

Or simplified:

$$\text{Throughput (MiB/s)} = \frac{\text{Bytes Transferred}}{1024^2 \times \text{Elapsed Seconds}}$$

#### Why Application Throughput $\neq$ Physical Link Bandwidth
When demonstrating this in a viva, note this key distinction:
- **Link Bandwidth (e.g. 100 Mbps or 1 Gbps):** The physical capacity of the transmission medium at Layer 1/Layer 2.
- **Application Throughput:** The rate of useful payload bytes delivered to the application layer (Goodput). It is always lower than link bandwidth because of:
  1. **Protocol Headers Overhead:** Ethernet (18B) + IP (20B) + TCP (20B-60B) + TLS (record headers) + HTTP/2 frame overhead.
  2. **TCP Three-Way Handshake & TLS 1.3 Negotiation:** Consumes 1–2 Round Trip Times (RTT) before the first payload byte is sent.
  3. **TCP Slow-Start:** TCP begins with a small Congestion Window (`cwnd`, typically 10 segments $\approx 14.6 \text{ KiB}$) and doubles it each RTT until packet loss or bandwidth limits occur. For small files (< 1 MB), the transfer finishes before TCP reaches the line capacity!

---

### 3.3 Telemetry Schema & Asynchronous Event Dispatch

Every network operation generates a structured telemetry payload sent to `POST /api/telemetry`:

```json
{
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "operation": "download",
  "statusCode": 200,
  "durationMs": 421.8,
  "bytesTransferred": 5242880,
  "errorCode": null
}
```

This is stored in the PostgreSQL `transfer_logs` table:
```sql
create table public.transfer_logs (
  id                uuid             primary key default gen_random_uuid(),
  user_id           uuid             not null references auth.users(id) on delete cascade,
  request_id        uuid             not null,
  operation         text             not null check (operation in ('upload', 'download', 'delete', 'rename', 'share', 'tcp_test')),
  status_code       integer          check (status_code is null or status_code between 100 and 599),
  duration_ms       double precision check (duration_ms is null or duration_ms >= 0),
  bytes_transferred bigint           not null default 0 check (bytes_transferred >= 0),
  error_code        text,
  created_at        timestamptz      not null default now()
);
```

---

### 3.4 The Browser Observability Boundary (L7 vs L4)

An essential concept featured in the **Request Inspector Drawer** is the **Browser Observability Boundary**:

```
+-------------------------------------------------------------+
| Browser JavaScript Sandbox (Accessible via Fetch / Web API) |
|   - HTTP Request Method & Path                              |
|   - Observable Headers (Content-Type, Content-Length)        |
|   - HTTP Response Status Code (200, 201, 401, 403, 500)      |
|   - High-Resolution Total Duration (performance.now)         |
|   - SHA-256 Digest Verification                             |
+-------------------------------------------------------------+
================ BROWSER OBSERVABILITY BOUNDARY ===============
+-------------------------------------------------------------+
| Operating System Kernel & Network Interface Card (NIC)      |
|   - Raw TCP Sequence & Acknowledgment Numbers (SEQ / ACK)   |
|   - TCP Congestion Window (cwnd) & Advertised Window (rwnd) |
|   - TCP Retransmission Timers (RTO) & Fast Retransmits      |
|   - IP Packet Identification, TTL & Fragmentation Flags     |
|   - Ethernet Frame Check Sequences (CRC32 / FCS)            |
+-------------------------------------------------------------+
```

**Why JavaScript cannot see raw TCP packets:**
The browser security sandbox restricts Web APIs to Layer 7. Permitting arbitrary webpage scripts to read raw Layer 4 TCP sequence numbers or raw IP headers would enable cross-origin timing attacks, session hijacking, and network sniffing. Therefore, NetShare couples the web application with the **Python TCP Socket Lab** to provide complete Layer 4 visibility.

---

## 4. How NetShare Dissects Protocols Across the OSI 7-Layer Model

The **Protocol Inspector Modal** ([`src/components/network/protocol-inspector-modal.tsx`](file:///Users/vinitk/Developer/net-share/src/components/network/protocol-inspector-modal.tsx)) provides real-time dissection across all 7 layers of the OSI model for any operation (upload, download, listing, auth, share):

```mermaid
graph TD
    L7["Layer 7: Application (HTTP/2, REST, Supabase Storage API)"]
    L6["Layer 6: Presentation (MIME serialization, Web Crypto SHA-256)"]
    L5["Layer 5: Session (JWT Auth sessions, TLS 1.3 session resumption)"]
    L4["Layer 4: Transport (TCP segmentation, MSS 1460B, 3-Way Handshake)"]
    L3["Layer 3: Network (IPv4/IPv6, MTU 1500B, Routing)"]
    L2["Layer 2: Data Link (Ethernet frames, MAC addressing, ARP)"]
    L1["Layer 1: Physical (Bitstream over Cat6 Copper / Wi-Fi 802.11 / Fiber)"]

    L7 --> L6 --> L5 --> L4 --> L3 --> L2 --> L1
```

---

### Layer 7: Application Layer
- **Protocols:** HTTP/2 (RFC 7540), HTTP/3 (RFC 9114), REST.
- **Framing & Features:** Multiplexing multiple requests over a single TCP connection; HPACK header compression; binary framing (DATA frames, HEADERS frames).
- **In NetShare:** Constructs `POST /api/files` or direct storage `PUT` requests with explicit headers:
  ```http
  POST /api/files HTTP/2
  Host: localhost:3000
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  x-client-info: netshare-client/1.0
  ```

---

### Layer 6: Presentation Layer
- **Protocols & Standards:** MIME (RFC 2045), JSON (RFC 8259), SHA-256 (FIPS 180-4).
- **Function:** Formats, serializes, and verifies payload data representation.
- **In NetShare:** Maps files to MIME types (`application/pdf`, `image/png`, `application/octet-stream`), serializes JSON metadata, and executes 256-bit cryptographic digest hashing via `crypto.subtle.digest('SHA-256')`.

---

### Layer 5: Session Layer
- **Protocols & Mechanisms:** TLS 1.3 Session Resumption (Session Tickets / PSK), HTTP Keep-Alive, Supabase Auth JWT Session Tokens.
- **Function:** Establishes, maintains, and synchronizes communication sessions between client and servers.
- **In NetShare:** Maintains persistent TCP sockets to prevent repeated handshakes; refreshes JWT access tokens every 3600 seconds; validates active sessions through the Next.js `proxy.ts` middleware.

---

### Layer 4: Transport Layer
- **Protocols:** Transmission Control Protocol (TCP, RFC 9293).
- **Maximum Segment Size (MSS):** Standard IPv4 Ethernet MSS is:
  $$\text{MSS} = \text{MTU (1500 bytes)} - \text{IP Header (20 bytes)} - \text{TCP Header (20 bytes)} = 1460 \text{ bytes}$$
- **Segment Calculation Formula in NetShare:**
  $$\text{Estimated TCP Segments} = \max\left(1, \left\lceil \frac{\text{File Size in Bytes}}{1460} \right\rceil\right)$$
  *(e.g., a 4.19 MB PDF requires approximately $\approx 3,010$ individual TCP data segments).*
- **Transport Mechanics:**
  - **Connection Setup:** 3-Way Handshake (`SYN` $\rightarrow$ `SYN-ACK` $\rightarrow$ `ACK`).
  - **Reliability:** Cumulative sequence numbers (`SEQ`) and acknowledgments (`ACK`); retransmissions triggered by Triple Duplicate ACKs or Retransmission Timeout (`RTO`).
  - **Flow Control:** Advertised receiver window (`rwnd`) prevents buffer overrun.
  - **Congestion Control:** Algorithms like Cubic or BBR adjust Congestion Window (`cwnd`) based on network capacity.

---

### Layer 3: Network Layer
- **Protocols:** Internet Protocol version 4 (IPv4, RFC 791) / IPv6 (RFC 8200), ICMP, DNS.
- **Maximum Transmission Unit (MTU):** Standard MTU is **1500 bytes**.
- **Function:** Logical host addressing (32-bit IPv4 or 128-bit IPv6) and packet routing across intermediate hops.
- **In NetShare:** Explains IP packet encapsulation, Time-to-Live (TTL) hop decrements to prevent infinite loops, and "Don't Fragment" (DF) bit handling for Path MTU Discovery (PMTUD).

---

### Layer 2: Data Link Layer
- **Protocols:** IEEE 802.3 Ethernet, IEEE 802.11 Wi-Fi, Address Resolution Protocol (ARP).
- **Frame Structure:** Preamble (8B) + Dest MAC (6B) + Source MAC (6B) + EtherType (2B) + Payload (46–1500B) + Frame Check Sequence (4B CRC32).
- **In NetShare:** Explains link-layer physical hop addressing where MAC addresses change hop-by-hop across routers while IP addresses remain constant end-to-end.

---

### Layer 1: Physical Layer
- **Media:** 1000BASE-T Cat6 Twisted-Pair Copper (voltage modulation), 802.11ax Wi-Fi (OFDMA radio frequency), or Fiber Optic (laser light pulses).
- **Function:** Conversion of raw binary bits (`0`s and `1`s) into electrical, optical, or radio physical signals.

---

## 5. How Network Data is Visualized to the User

NetShare renders this data across 4 dedicated UI components styled in the pitch-black Linear aesthetic (`#080808` background, `#111111` surfaces, hairline borders, Inter + JetBrains Mono fonts):

### 5.1 The Real-Time Protocol Inspector Modal
- **Component:** [`ProtocolInspectorModal`](file:///Users/vinitk/Developer/net-share/src/components/network/protocol-inspector-modal.tsx).
- **Access Point:** Click **Protocols** from any file action dropdown, or from the upload dropzone / network page.
- **Features:**
  - Dynamic context binding: automatically displays the exact file name, size, SHA-256 hash, and latency of the selected item.
  - Interactive tabs for **File Upload Pipeline**, **Download & Verification**, **Directory Discovery**, **Authentication & Session**, and **Expiring Share Link**.
  - Interactive layer switcher (L7 down to L1) with technical breakdown, RFC citations, header diagrams, and frame math.

---

### 5.2 The Network Activity Dashboard (`/network`)
- **Page:** [`src/app/(dashboard)/network/page.tsx`](file:///Users/vinitk/Developer/net-share/src/app/(dashboard)/network/page.tsx).
- **Visualizations:**
  1. **Metric Cards:** Real-time counters for Total Operations, Bytes Transferred, Mean Duration, and System Success Rate.
  2. **Latency Trend Chart (Recharts AreaChart):** Monotonic duration in milliseconds over sequential operations.
  3. **Throughput Distribution Chart (Recharts BarChart):** Effective transfer throughput in MiB/s for each logged operation.
  4. **Live Activity Log Table:** Shows timestamp, HTTP method/operation, status code badges (green 200, amber 400, red 500), duration, and payload size.

---

### 5.3 The HTTP Request Inspector Drawer
- **Component:** [`RequestInspectorDrawer`](file:///Users/vinitk/Developer/net-share/src/components/request-inspector/inspector-drawer.tsx).
- **Trigger:** Clicking the **Inspect** button on any row in the Network Dashboard table.
- **Details Displayed:**
  - Exact REST endpoint & HTTP verb (`POST /api/files`, `GET /api/files/:id/download`).
  - Request ID correlation token (UUIDv4).
  - Observable HTTP headers (`Content-Type`, `Content-Length`, `Authorization: Bearer`).
  - Educational explanation of the **Browser Observability Boundary**.

---

### 5.4 The Controlled Networking Lab & Benchmark Runner (`/lab`)
- **Page:** [`src/app/(dashboard)/lab/page.tsx`](file:///Users/vinitk/Developer/net-share/src/app/(dashboard)/lab/page.tsx).
- **Purpose:** Allows students to run repeatable empirical experiments for project viva demonstrations.
- **Workflow:**
  1. Select test payload size: **100 KiB** (Small Frame), **1 MiB** (Standard), **5 MiB** (Medium), or **10 MiB** (Large).
  2. Set iteration count (1 to 5 runs) and simulated environment (Loopback, LAN, Internet).
  3. The browser generates a pseudo-random memory buffer, calculates pre-transfer SHA-256, executes roundtrip streaming, and measures duration with `performance.now()`.
  4. Plots comparative throughput bar charts demonstrating how larger files achieve higher MiB/s due to amortization of HTTP and TCP connection overhead.
  5. Saves benchmark history to the PostgreSQL `experiments` table.

---

## 6. Low-Level Transport Lab: The Python TCP Socket Server (`tcp-lab/`)

### 6.1 Why Python Sockets are Needed Beyond the Browser
Because the browser sandbox prohibits raw Layer 4 socket manipulation, NetShare includes a standalone **Python TCP Socket Laboratory** located in `tcp-lab/`. It implements low-level socket programming, binary message framing, and Wireshark capture.

---

### 6.2 The Custom Binary Frame Protocol (`NSHR`)
The TCP Lab defines a binary framing protocol called **NSHR** (`tcp-lab/protocol.py`). Every transmission begins with a **fixed 10-byte binary header**:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Magic: "NSHR"                           |
|                        (0x4E534852)                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Version (0x01)| MsgType (0x01)|     Payload Length (uint32)   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Payload Length (cont.)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Variable Length Payload                   |
|                   (0 to 65,536 bytes / 64 KiB)                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### Protocol Specification:
- **Magic Bytes (4 bytes):** `b"NSHR"` (validates that incoming stream is a NetShare frame).
- **Version (1 byte):** `0x01`.
- **Message Types (1 byte):**
  - `0x01 MSG_HELLO`: Initial capability handshake.
  - `0x02 MSG_FILE_START`: File metadata (JSON with filename, size, expected SHA-256).
  - `0x03 MSG_FILE_CHUNK`: Raw file bytes (maximum 64 KiB per frame).
  - `0x04 MSG_FILE_END`: Transmission finished indicator.
  - `0x05 MSG_ACK`: Server acknowledgment with verification status.
  - `0x06 MSG_ERROR`: Protocol error alert.
- **Payload Length (4 bytes):** Big-Endian unsigned 32-bit integer (`!I` format code in Python `struct`).
- **Payload:** 0 to 65,536 bytes of raw data.

---

### 6.3 Solving Stream Fragmentation with `recv_exact()`

A classic trap in socket programming is assuming that `sock.recv(1024)` will return 1024 bytes:
> **TCP is an unformatted byte stream, not a message-based protocol.** If a sender writes 1000 bytes, network fragmentation or operating system buffer draining can cause the receiver to read 400 bytes in the first call and 600 bytes in the second.

NetShare solves this by implementing an exact-length accumulator loop (`tcp-lab/protocol.py`):

```python
def recv_exact(sock: socket.socket, num_bytes: int) -> bytes:
    """
    Reads exactly `num_bytes` from the socket stream.
    Loops until all requested bytes are accumulated or the connection closes.
    """
    buffer = bytearray()
    while len(buffer) < num_bytes:
        chunk = sock.recv(num_bytes - len(buffer))
        if not chunk:
            if len(buffer) == 0:
                raise ConnectionClosedError("Socket closed gracefully")
            raise StreamTruncatedError(f"Stream truncated: expected {num_bytes}, got {len(buffer)}")
        buffer.extend(chunk)
    return bytes(buffer)
```

This guarantees that:
1. The 10-byte header is never parsed prematurely.
2. The payload length specified in the header is read to the exact byte before the next frame is processed.

---

### 6.4 Wireshark Packet Capture & Verification

The TCP Lab allows you to capture and inspect real network packets locally using **Wireshark**:

#### Step 1: Start Wireshark
1. Open Wireshark and select the **Loopback interface** (`lo0` on macOS / `Loopback` on Linux).
2. Set the display filter:
   ```wireshark
   tcp.port == 9099
   ```

#### Step 2: Run Server & Client
```bash
# Terminal 1: Start Server
python3 tcp-lab/server.py --port 9099

# Terminal 2: Send a file
python3 tcp-lab/client.py --file sample.pdf --port 9099
```

#### Step 3: What You Will Observe in Wireshark:
1. **TCP 3-Way Handshake:**
   - Frame 1: Client $\rightarrow$ Server `[SYN]` Seq=0
   - Frame 2: Server $\rightarrow$ Client `[SYN, ACK]` Seq=0 Ack=1
   - Frame 3: Client $\rightarrow$ Server `[ACK]` Seq=1 Ack=1
2. **Data Transfer (`PSH, ACK`):**
   - Packets containing ASCII string `NSHR` in the data payload view.
   - 10-byte header followed by JSON metadata (`MSG_FILE_START`).
   - Binary chunks (`MSG_FILE_CHUNK`).
3. **Graceful Teardown (4-Way Handshake):**
   - Client $\rightarrow$ Server `[FIN, ACK]`
   - Server $\rightarrow$ Client `[ACK]`
   - Server $\rightarrow$ Client `[FIN, ACK]`
   - Client $\rightarrow$ Server `[ACK]`

---

## 7. Viva & Project Defense Guide: Talking Points & Model Q&A

Use these talking points during your project viva or evaluation:

### Viva Question 1: "What was your motivation for building NetShare?"
> **Model Answer:**  
> "In conventional web applications, network activity is treated as a black box—the browser handles sockets, encryption, and headers invisibly. We built NetShare to provide full observability into the computer networking stack. NetShare combines a high-performance web application that meters HTTP telemetry and demonstrates all 7 OSI layers with a standalone Python socket lab that exposes raw TCP framing and Wireshark packet capture."

---

### Viva Question 2: "Why can't browser JavaScript see TCP sequence numbers or packet drops?"
> **Model Answer:**  
> "Browsers operate within a strict security sandbox that isolates application code to Layer 7. APIs like `fetch` expose HTTP methods, response bodies, and high-level timing, but the operating system kernel manages IP routing, TCP sequence/ACK numbers, congestion windows, and retransmissions. Exposing raw Layer 4 sockets to untrusted web scripts would create severe security vulnerabilities like packet sniffing and session hijacking. That is why we complemented the web app with our Python TCP lab."

---

### Viva Question 3: "Why does TCP require message framing like your 10-byte NSHR protocol?"
> **Model Answer:**  
> "TCP is a byte-stream protocol, not a datagram protocol. It guarantees that bytes arrive in order and without duplicates, but it does not preserve message boundaries. If a client sends two separate 50-byte messages, the receiver might read them as a single 100-byte chunk, or two chunks of 30 and 70 bytes. Without our 10-byte NSHR framing header containing a magic signature and explicit Big-Endian payload length, the receiver cannot know where one message ends and the next begins."

---

### Viva Question 4: "Why does your throughput chart show lower MiB/s on small files than large files?"
> **Model Answer:**  
> "This illustrates the impact of network protocol overhead and TCP Slow-Start. Every HTTP request requires DNS resolution, a TCP 3-way handshake, and a TLS 1.3 cryptographic handshake. Additionally, TCP begins transmission with a conservative Congestion Window (`cwnd`). For a small 100 KiB file, the transfer completes before TCP can ramp up to line speed, so the handshake latency dominates the duration. With a 10 MiB file, connection overhead is amortized over millions of bytes, and TCP reaches full channel saturation."

---

### Viva Question 5: "What is the difference between data integrity (SHA-256) and encryption (TLS 1.3)?"
> **Model Answer:**  
> "Encryption provides confidentiality by scrambling plaintext into ciphertext so unauthorized eavesdroppers cannot read it. Data integrity via SHA-256 provides mathematical proof that the received byte stream matches the original byte stream exactly. A file can be encrypted in transit via TLS 1.3, but if a disk sector is corrupt on the server or the socket closes prematurely, the decrypted file will be corrupted. Our client-side Web Crypto SHA-256 calculation verifies end-to-end byte-level integrity independently of transport encryption."

---

### Viva Question 6: "How did you implement multi-tenant security and cross-user public sharing?"
> **Model Answer:**  
> "We enforced security at the database and storage levels rather than relying solely on frontend UI logic. We used PostgreSQL Row Level Security (RLS) policies keyed to `auth.uid()`, and isolated storage namespaces by user ID prefixes (`{userId}/`). When a user marks a file as public (`is_public = true`), our database policy allows authenticated peers to read metadata, and our API generates 10-minute expiring signed storage URLs, while restricting destructive actions like rename or delete strictly to the file owner."

---

### Summary Checklist for Demo
1. **Show Login:** Demonstrate switching between User A and User B.
2. **Show Upload:** Upload a file, observe the pre-transfer SHA-256 calculation and the high-resolution duration.
3. **Open Protocol Inspector:** Dissect Layer 7 down to Layer 1, pointing out estimated TCP segments based on MSS (1460 bytes).
4. **Show Cross-Account Sharing:** Log in as User B, filter by **Public Network**, download User A's file, and show the green SHA-256 match badge.
5. **Show Network Dashboard:** Display the Recharts latency and throughput graphs and open the Request Inspector Drawer.
6. **Show Python TCP Lab:** Run `server.py` and `client.py` and show the NSHR binary frames and Wireshark packet capture.
