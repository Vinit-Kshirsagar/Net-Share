"""
NetShare Custom Binary Framing Protocol (NSHR)
Transport: Raw TCP Stream
Header: 10 Bytes Big-Endian
    +-------------------+---------------+-------------------+---------------------+
    | Magic (4 bytes)   | Version (1B)  | Msg Type (1 Byte) | Payload Length (4B) |
    | b"NSHR" (ASCII)   | 0x01          | 0x01 - 0x06       | uint32 (Big-Endian) |
    +-------------------+---------------+-------------------+---------------------+
    | Payload: 0 to 65,536 bytes (JSON metadata or raw file chunk)                    |
    +---------------------------------------------------------------------------------+
"""

import struct
import socket
from typing import Tuple

MAGIC = b"NSHR"
PROTOCOL_VERSION = 1

# Message Type Constants
MSG_HELLO = 1       # Client-server handshake
MSG_FILE_START = 2  # Metadata: {"filename": ..., "total_bytes": ..., "expected_sha256": ...}
MSG_FILE_CHUNK = 3  # Raw binary chunk
MSG_FILE_END = 4    # End of file notification
MSG_ACK = 5         # Success acknowledgment {"status": "ok", "checksum": ...}
MSG_ERROR = 6       # Error response {"code": ..., "message": ...}

# Header struct: 4s = 4 bytes magic, B = 1 byte version, B = 1 byte type, I = 4 bytes uint32 length
HEADER_FORMAT = "!4sBBI"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)  # exactly 10 bytes

MAX_PAYLOAD_SIZE = 64 * 1024  # 64 KiB per frame
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MiB total transfer limit

class ProtocolError(Exception):
    """Raised when an invalid or malformed frame is received."""
    pass

def pack_frame(msg_type: int, payload: bytes = b"") -> bytes:
    """
    Packs a message into a complete NSHR binary frame.
    """
    if len(payload) > MAX_PAYLOAD_SIZE:
        raise ProtocolError(f"Payload length {len(payload)} exceeds maximum allowed {MAX_PAYLOAD_SIZE} bytes")
    
    header = struct.pack(HEADER_FORMAT, MAGIC, PROTOCOL_VERSION, msg_type, len(payload))
    return header + payload

def recv_exact(sock: socket.socket, num_bytes: int) -> bytes:
    """
    Reads exactly num_bytes from a TCP socket byte stream.
    
    CRITICAL NETWORKING PRINCIPLE:
    TCP is a continuous byte stream with NO packet boundaries. A single socket.recv()
    call may return fewer bytes than requested if packets are fragmented across network
    hops. This loop guarantees buffer completion or raises EOFError on connection drop.
    """
    buffer = bytearray()
    while len(buffer) < num_bytes:
        packet = sock.recv(num_bytes - len(buffer))
        if not packet:
            if len(buffer) == 0:
                raise EOFError("Connection closed by remote peer")
            raise ConnectionResetError(f"Connection closed prematurely (received {len(buffer)}/{num_bytes} bytes)")
        buffer.extend(packet)
    return bytes(buffer)

def recv_frame(sock: socket.socket) -> Tuple[int, bytes]:
    """
    Receives and decodes the next NSHR frame from the TCP stream.
    Returns (msg_type, payload).
    """
    # 1. Read the 10-byte fixed header
    header_bytes = recv_exact(sock, HEADER_SIZE)
    magic, version, msg_type, payload_length = struct.unpack(HEADER_FORMAT, header_bytes)

    # 2. Validate magic identifier
    if magic != MAGIC:
        raise ProtocolError(f"Invalid magic bytes: {magic!r}. Expected {MAGIC!r}")

    # 3. Validate protocol version
    if version != PROTOCOL_VERSION:
        raise ProtocolError(f"Unsupported protocol version: {version}. Expected {PROTOCOL_VERSION}")

    # 4. Enforce payload length boundary
    if payload_length > MAX_PAYLOAD_SIZE:
        raise ProtocolError(f"Payload length {payload_length} exceeds max allowed {MAX_PAYLOAD_SIZE}")

    # 5. Read exact payload
    payload = recv_exact(sock, payload_length) if payload_length > 0 else b""
    return msg_type, payload
