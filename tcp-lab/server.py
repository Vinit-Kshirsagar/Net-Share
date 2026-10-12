"""
NetShare TCP Socket Laboratory — Server Implementation
Demonstrates low-level TCP socket programming, stateful framing,
stream fragmentation handling, and SHA-256 integrity verification.
"""

import socket
import json
import hashlib
import os
import re
import sys
import argparse
import logging
from typing import Optional

from protocol import (
    MAGIC,
    PROTOCOL_VERSION,
    MSG_HELLO,
    MSG_FILE_START,
    MSG_FILE_CHUNK,
    MSG_FILE_END,
    MSG_ACK,
    MSG_ERROR,
    MAX_FILE_SIZE,
    ProtocolError,
    pack_frame,
    recv_frame,
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("NetShare-TCP-Server")

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")

def sanitize_filename(name: str) -> str:
    """Sanitizes client-supplied filename to prevent directory traversal attacks."""
    basename = os.path.basename(name)
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", basename)
    return sanitized if sanitized else "downloaded_file.bin"

def handle_client(conn: socket.socket, addr: tuple):
    """
    Handles a single client connection through the NSHR state machine.
    """
    conn.settimeout(10.0)  # 10 second socket timeout
    temp_filepath: Optional[str] = None
    final_filepath: Optional[str] = None

    logger.info(f"Accepted TCP connection from {addr[0]}:{addr[1]}")

    try:
        # ── State 1: Expect HELLO ──────────────────────────────────────────
        msg_type, payload = recv_frame(conn)
        if msg_type != MSG_HELLO:
            error_data = json.dumps({"code": "ERR_UNEXPECTED_STATE", "message": "Expected MSG_HELLO"}).encode("utf-8")
            conn.sendall(pack_frame(MSG_ERROR, error_data))
            raise ProtocolError(f"Expected HELLO, got message type {msg_type}")

        logger.info(f"Received HELLO from {addr}. Sending capability ACK.")
        conn.sendall(pack_frame(MSG_HELLO, json.dumps({"status": "ready", "version": PROTOCOL_VERSION}).encode("utf-8")))

        # ── State 2: Expect FILE_START ─────────────────────────────────────
        msg_type, payload = recv_frame(conn)
        if msg_type != MSG_FILE_START:
            error_data = json.dumps({"code": "ERR_UNEXPECTED_STATE", "message": "Expected MSG_FILE_START"}).encode("utf-8")
            conn.sendall(pack_frame(MSG_ERROR, error_data))
            raise ProtocolError(f"Expected FILE_START, got message type {msg_type}")

        meta = json.loads(payload.decode("utf-8"))
        raw_filename = meta.get("filename", "unknown.bin")
        total_bytes = meta.get("total_bytes", 0)
        expected_sha256 = meta.get("expected_sha256", "").lower()

        if total_bytes > MAX_FILE_SIZE:
            error_data = json.dumps({"code": "ERR_FILE_TOO_LARGE", "message": f"File size exceeds max {MAX_FILE_SIZE} bytes"}).encode("utf-8")
            conn.sendall(pack_frame(MSG_ERROR, error_data))
            raise ProtocolError(f"File size {total_bytes} exceeds limit")

        safe_filename = sanitize_filename(raw_filename)
        os.makedirs(STORAGE_DIR, exist_ok=True)
        final_filepath = os.path.join(STORAGE_DIR, safe_filename)
        temp_filepath = final_filepath + ".tmp"

        logger.info(f"Initiating transfer: '{safe_filename}' ({total_bytes} bytes, expected SHA-256: {expected_sha256[:12]}...)")

        # ── State 3: Stream FILE_CHUNKs ────────────────────────────────────
        hasher = hashlib.sha256()
        received_bytes = 0

        with open(temp_filepath, "wb") as f:
            while True:
                msg_type, chunk_data = recv_frame(conn)

                if msg_type == MSG_FILE_CHUNK:
                    if received_bytes + len(chunk_data) > MAX_FILE_SIZE:
                        raise ProtocolError("Total received data exceeded maximum storage threshold")
                    
                    f.write(chunk_data)
                    hasher.update(chunk_data)
                    received_bytes += len(chunk_data)

                elif msg_type == MSG_FILE_END:
                    logger.info(f"Received FILE_END after {received_bytes} bytes")
                    break

                else:
                    raise ProtocolError(f"Unexpected frame type {msg_type} during chunk transfer")

        # ── State 4: Verify Integrity ──────────────────────────────────────
        computed_sha256 = hasher.hexdigest().lower()

        if received_bytes != total_bytes:
            raise ProtocolError(f"Byte count mismatch: received {received_bytes}, expected {total_bytes}")

        if expected_sha256 and computed_sha256 != expected_sha256:
            raise ProtocolError(f"SHA-256 mismatch! Computed: {computed_sha256}, Expected: {expected_sha256}")

        # Atomic commit: rename .tmp to final destination
        if os.path.exists(temp_filepath):
            os.replace(temp_filepath, final_filepath)
            temp_filepath = None

        logger.info(f"Integrity verified! '{safe_filename}' saved successfully. SHA-256: {computed_sha256}")

        # Send ACK frame
        ack_payload = json.dumps({
            "status": "ok",
            "bytes_received": received_bytes,
            "sha256": computed_sha256,
            "filename": safe_filename,
        }).encode("utf-8")
        conn.sendall(pack_frame(MSG_ACK, ack_payload))

    except Exception as e:
        logger.error(f"Error handling transfer from {addr}: {e}")
        # Clean up temporary file on any failure or disconnect (Test T-12)
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
                logger.info(f"Cleaned up partial temporary file: {temp_filepath}")
            except OSError:
                pass
        
        try:
            err_msg = json.dumps({"code": "ERR_TRANSFER_FAILED", "message": str(e)}).encode("utf-8")
            conn.sendall(pack_frame(MSG_ERROR, err_msg))
        except Exception:
            pass

    finally:
        conn.close()
        logger.info(f"Closed TCP connection with {addr[0]}:{addr[1]}")

def start_server(host: str = "127.0.0.1", port: int = 9099):
    """Starts the TCP socket listener."""
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        server_sock.bind((host, port))
        server_sock.listen(5)
        logger.info(f"NetShare TCP Lab Server listening on {host}:{port}")
        logger.info(f"Output storage directory: {STORAGE_DIR}")
        logger.info("Wireshark filter: tcp.port == " + str(port))

        while True:
            conn, addr = server_sock.accept()
            handle_client(conn, addr)

    except KeyboardInterrupt:
        logger.info("Shutting down NetShare TCP server.")
    finally:
        server_sock.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetShare TCP Lab Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=9099, help="TCP port to listen on (default: 9099)")
    args = parser.parse_args()
    start_server(args.host, args.port)
