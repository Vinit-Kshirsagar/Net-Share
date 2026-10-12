# NetShare: Wireshark Packet Capture & Protocol Analysis Guide

This guide walks through capturing and analyzing the **NetShare TCP Protocol Lab** traffic in Wireshark for project demonstration and viva defense.

---

## 1. Capturing Setup

1. Open **Wireshark**.
2. Select the capture interface:
   - For tests running on `127.0.0.1`, double-click **Loopback: lo0** (on macOS/Linux) or **Adapter for loopback traffic** (on Windows).
   - If running across two machines on a local Wi-Fi / Ethernet LAN, select your **Wi-Fi (en0)** or **Ethernet (en1)** interface.
3. In the display filter bar at the top, type:
   ```
   tcp.port == 9099
   ```
   and press **Enter**.

---

## 2. Triggering the Transfer

With Wireshark actively capturing:

```bash
cd tcp-lab
python3 client.py --size-mb 1.0
```

Once the transfer finishes, click the red **Stop** button in Wireshark.

---

## 3. What to Point Out to Faculty / Evaluators

### 1. The TCP 3-Way Handshake
Look at the first three packets in the stream:
- **Packet 1 (SYN):** The client sends `[SYN]` with an initial sequence number (ISN), advertising Maximum Segment Size (MSS) and window scale.
- **Packet 2 (SYN-ACK):** The server responds with `[SYN, ACK]`, acknowledging the client's ISN (`ack = client_seq + 1`) and providing its own ISN.
- **Packet 3 (ACK):** The client acknowledges the server's sequence number `[ACK]`. The connection is now in the `ESTABLISHED` state.

### 2. NSHR Binary Application Frames
Click on any data packet (`PSH, ACK`):
- Expand the **Data** or **Transmission Control Protocol** pane.
- Look at the first 10 bytes:
  - First 4 bytes in ASCII: `4e 53 48 52` (`NSHR`) — The protocol Magic identifier.
  - Byte 5: `01` — Protocol Version 1.
  - Byte 6: `01` (HELLO), `02` (FILE_START), or `03` (FILE_CHUNK).
  - Bytes 7-10: 32-bit unsigned Big-Endian integer denoting exact payload length.

### 3. Sliding Window & Stream Assembly
- Show how larger files are broken into multiple TCP segments (typically 1460 bytes MSS or larger on loopback).
- Point out the **Window Size Value** (`Win=...`) showing receiver buffer capacity flow control.

### 4. Connection Teardown
Look at the final packets after the `MSG_ACK` frame is sent:
- Client or server sends `[FIN, ACK]` indicating no more data to send.
- The other peer responds with `[ACK]`, then sends its own `[FIN, ACK]`.
- Both sockets transition to `CLOSED` / `TIME_WAIT`.

---

## 4. Key Questions Faculty May Ask

| Question | Answer |
| :--- | :--- |
| **Why not just capture the Next.js HTTPS uploads in Wireshark?** | HTTPS traffic is encrypted with TLS 1.3. In Wireshark, HTTPS bodies appear as opaque encrypted application data. NetShare's local TCP lab exposes clean, unencrypted binary framing and socket states specifically for networking education. |
| **Why doesn't the client just send the raw file without NSHR framing?** | If you send raw bytes without framing over a persistent socket, the receiver has no way of knowing how many bytes belong to the metadata versus the file, or where the file ends without closing the socket. NetShare frames each message with exact length headers. |
