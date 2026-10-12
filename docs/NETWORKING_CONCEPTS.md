# NetShare: Computer Networks Concepts & Viva Preparation Guide

This document provides a comprehensive theoretical and practical reference for the Computer Networks concepts implemented in **NetShare**.

---

## 1. Core Formulas & Mathematical Definitions

### 1.1 Effective Application-Layer Throughput
$$\text{Throughput (MiB/s)} = \frac{\text{Bytes Transferred}}{(1024 \times 1024) \times \text{Elapsed Seconds}}$$

- **Caveat:** Throughput is an application-level measurement of completed payload bytes over duration. It is distinct from raw link bandwidth (e.g. 1 Gbps Ethernet line capacity) because it accounts for RTT, TCP Slow-Start, TLS encryption overhead, and HTTP request framing.

### 1.2 Latency vs. Duration
- **Network Round Trip Time (RTT):** The time taken for a data packet to travel from sender to destination and back.
- **Request Duration:** Includes client preparation time, DNS lookup, TCP handshake, TLS exchange, server processing time, and byte download time.
- Measured in NetShare using `performance.now()` (high-resolution monotonic timer with sub-millisecond precision).

---

## 2. Key Viva Topics & Model Answers

### Q1: Why does NetShare implement message framing over TCP sockets?
**Answer:** TCP is a continuous byte stream. It guarantees that bytes arrive in order, but write boundaries are not preserved across the network. A sender executing three consecutive `write(100)` calls may cause the receiver to execute one `read(250)` and one `read(50)`. Without an application-layer framing protocol (such as NetShare's 10-byte `NSHR` header with Big-Endian length prefixes), the receiver cannot determine where one message ends and the next starts.

### Q2: What is the purpose of `recv_exact(sock, n)` in the TCP Lab?
**Answer:** In socket programming, `sock.recv(n)` specifies the *maximum* number of bytes to read, not the minimum. Due to network packet fragmentation or operating system TCP buffer draining, `recv()` can return any non-zero count between 1 and `n`. `recv_exact` loops continuously until all `n` bytes are accumulated, preventing incomplete header or payload parsing.

### Q3: What is the difference between TCP and UDP?
| Property | Transmission Control Protocol (TCP) | User Datagram Protocol (UDP) |
| :--- | :--- | :--- |
| **Connection State** | Connection-oriented (SYN, SYN-ACK, ACK) | Connectionless |
| **Delivery Guarantee** | Reliable (Retransmits lost segments) | Unreliable (Best-effort) |
| **Ordering** | Guaranteed in-order (Sequence numbers) | Out-of-order arrival possible |
| **Flow & Congestion Control** | Sliding window, Slow-Start, Congestion Avoidance | None |
| **Boundary Preservation** | None (Byte stream) | Preserves datagram boundaries |
| **NetShare Application** | File transfers & `tcp-lab` binary socket framing | Basis for QUIC in HTTP/3 |

### Q4: How does HTTP/3 improve upon HTTP/2 and HTTP/1.1?
**Answer:**
- **HTTP/1.1:** Limited to one active request-response exchange per TCP connection at a time (Head-of-Line blocking at application level).
- **HTTP/2:** Multiplexes concurrent streams over a single TCP connection. However, if any single TCP packet is dropped in the network, TCP pauses delivery of all streams until retransmission succeeds (Transport-level Head-of-Line blocking).
- **HTTP/3:** Replaces TCP with QUIC over UDP. Each stream is isolated at the transport layer, so packet loss on one stream does not stall concurrent streams.

### Q5: What role does TLS 1.3 play in HTTPS file transfers?
**Answer:**
1. **Server Authentication:** Validates the server's X.509 certificate against trusted root certificate authorities.
2. **Confidentiality:** Uses symmetric encryption (AES-256-GCM or ChaCha20-Poly1305) with ephemeral Diffie-Hellman keys to provide Forward Secrecy.
3. **Integrity:** Detects packet tampering using Authenticated Encryption with Associated Data (AEAD) message authentication codes.

### Q6: Why doesn't every HTTP request initiate a DNS lookup?
**Answer:**
1. **DNS Caching:** The operating system resolver and web browser cache resolved IP addresses according to the DNS record's TTL (Time-To-Live).
2. **Connection Reuse:** HTTP/1.1 keep-alive and HTTP/2 multiplexing keep TCP/TLS connections open, sending subsequent requests over existing sockets without needing to re-resolve the domain or perform new handshakes.

### Q7: Why can't browser JavaScript observe raw TCP packet behavior?
**Answer:** Web browsers run in a strict security sandbox where JavaScript is restricted to Layer 7 APIs (`fetch`, `XMLHttpRequest`, `PerformanceResourceTiming`). The operating system kernel manages IP routing, TCP sequence/ACK numbers, congestion windows, and retransmissions transparently. Observability at Layer 4 requires tools like Wireshark or raw socket code.

### Q8: What is the difference between HTTP 401 Unauthorized and 403 Forbidden?
- **401 Unauthorized:** Authentication credentials are missing, malformed, or expired. The client must authenticate to proceed.
- **403 Forbidden:** The client is authenticated and their identity is verified, but their role/permissions do not grant access to the requested resource.

### Q9: Why is SHA-256 checksum verification distinct from authentication or encryption?
- **Checksum (SHA-256):** Provides data integrity detection (proves received bytes equal expected bytes).
- **Encryption:** Obfuscates plaintext into ciphertext to prevent eavesdropping.
- **Authentication:** Proves the identity of the sender (e.g. via digital signatures or JWTs).
A checksum detects corruption, but does not keep data secret or prove who created it.

### Q10: How does Row Level Security (RLS) enforce multi-tenant isolation?
**Answer:** RLS enforces access control policies directly in the database engine (PostgreSQL). Even if a malicious client constructs a custom SQL query or sends another user's UUID in a request, the database automatically appends `WHERE owner_id = auth.uid()` to every query, preventing cross-tenant leakage at the storage tier rather than relying on application UI filtering.
