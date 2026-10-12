# NetShare TCP Socket Laboratory

This folder contains the **standalone TCP socket programming and custom binary framing protocol** component of NetShare.

---

## 1. Architectural Motivation

Modern web hosting platforms (such as Vercel) run serverless HTTP functions that terminate incoming requests and cannot maintain long-lived raw TCP socket listeners. To fulfill the computer networks curriculum requirement for hands-on socket programming without compromising the ease of deploying the production web application, this laboratory runs locally and executes directly over raw TCP sockets.

---

## 2. Binary Framing Specification (NSHR Protocol)

TCP is a **byte stream** protocol — it does not preserve write boundaries. If a client writes 100 bytes, the server's `recv()` call might return 40 bytes on the first read and 60 bytes on the second read.

NetShare defines the **NSHR** 10-byte binary header:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Magic: "NSHR"                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Version    |   Msg Type    |        Payload Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       Payload Length (cont)   |       Payload (0..64 KiB) ... |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Fields:
- **Magic (4 Bytes):** ASCII bytes `NSHR` (`0x4E 0x53 0x48 0x52`). Rejects alien packets immediately.
- **Version (1 Byte):** Protocol version (current: `0x01`).
- **Message Type (1 Byte):**
  - `0x01` (`MSG_HELLO`): Capability negotiation
  - `0x02` (`MSG_FILE_START`): JSON metadata (`filename`, `total_bytes`, `expected_sha256`)
  - `0x03` (`MSG_FILE_CHUNK`): Raw binary payload (max 64 KiB per frame)
  - `0x04` (`MSG_FILE_END`): End-of-file signal
  - `0x05` (`MSG_ACK`): Success confirmation with server-verified SHA-256
  - `0x06` (`MSG_ERROR`): Error notification
- **Payload Length (4 Bytes):** Big-Endian unsigned 32-bit integer.
- **Payload:** Raw bytes or UTF-8 encoded JSON.

---

## 3. How to Run

### Step 1: Start Server
```bash
python3 server.py --host 127.0.0.1 --port 9099
```

### Step 2: Run Client
To transmit a specific file:
```bash
python3 client.py --file your_document.pdf --host 127.0.0.1 --port 9099
```

Or generate and transmit an on-the-fly benchmark payload:
```bash
python3 client.py --size-mb 5.0
```

### Step 3: Run Automated Edge-Case Test Suite
```bash
python3 test_edge_cases.py
```

Tests verify:
- Normal framed transfer & SHA-256 validation (T-09)
- Fragmented header reconstruction via `recv_exact` (T-10)
- Oversized frame boundary rejection (T-11)
- Premature disconnect and temporary file quarantine cleanup (T-12)
- Corrupted payload detection (T-13)
