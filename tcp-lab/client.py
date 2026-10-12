"""
NetShare TCP Socket Laboratory — Client Implementation
Connects to the NetShare TCP server, executes the framed binary handshake,
streams chunked file bytes, and verifies receipt and integrity.
"""

import socket
import json
import hashlib
import os
import sys
import time
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
    ProtocolError,
    pack_frame,
    recv_frame,
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("NetShare-TCP-Client")

CHUNK_SIZE = 32 * 1024  # 32 KiB chunking

def compute_file_sha256(filepath: str) -> str:
    """Computes SHA-256 digest of a local file."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(64 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest().lower()

def send_file(
    filepath: str,
    host: str = "127.0.0.1",
    port: int = 9099,
) -> dict:
    """
    Connects to the NetShare TCP server and transfers the specified file.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    file_size = os.path.getsize(filepath)
    filename = os.path.basename(filepath)

    logger.info(f"Computing SHA-256 for '{filename}' ({file_size} bytes)...")
    expected_sha256 = compute_file_sha256(filepath)
    logger.info(f"Pre-computed SHA-256: {expected_sha256}")

    # Establish TCP Socket connection
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15.0)

    logger.info(f"Connecting to NetShare TCP Server at {host}:{port}...")
    connect_start = time.perf_counter()
    sock.connect((host, port))
    connect_duration = (time.perf_counter() - connect_start) * 1000
    logger.info(f"TCP 3-way handshake established in {connect_duration:.2f} ms")

    try:
        transfer_start = time.perf_counter()

        # ── Step 1: Send HELLO ─────────────────────────────────────────────
        logger.info("Sending MSG_HELLO capability probe...")
        sock.sendall(pack_frame(MSG_HELLO, json.dumps({"client": "netshare-py-client"}).encode("utf-8")))

        msg_type, hello_resp = recv_frame(sock)
        if msg_type != MSG_HELLO:
            raise ProtocolError(f"Expected HELLO reply, received {msg_type}")
        logger.info(f"Received HELLO response: {hello_resp.decode('utf-8')}")

        # ── Step 2: Send FILE_START ────────────────────────────────────────
        meta_payload = json.dumps({
            "filename": filename,
            "total_bytes": file_size,
            "expected_sha256": expected_sha256,
        }).encode("utf-8")

        logger.info(f"Sending MSG_FILE_START ({len(meta_payload)} bytes metadata)...")
        sock.sendall(pack_frame(MSG_FILE_START, meta_payload))

        # ── Step 3: Stream Chunks ──────────────────────────────────────────
        bytes_sent = 0
        chunk_count = 0

        with open(filepath, "rb") as f:
            while True:
                data = f.read(CHUNK_SIZE)
                if not data:
                    break
                sock.sendall(pack_frame(MSG_FILE_CHUNK, data))
                bytes_sent += len(data)
                chunk_count += 1

        logger.info(f"Streamed {bytes_sent} bytes across {chunk_count} frames")

        # ── Step 4: Send FILE_END ──────────────────────────────────────────
        logger.info("Sending MSG_FILE_END frame...")
        sock.sendall(pack_frame(MSG_FILE_END))

        # ── Step 5: Await Server ACK ───────────────────────────────────────
        msg_type, ack_data = recv_frame(sock)
        total_transfer_duration = time.perf_counter() - transfer_start

        if msg_type == MSG_ERROR:
            err = json.loads(ack_data.decode("utf-8"))
            raise RuntimeError(f"Server rejected transfer: {err.get('message', 'Unknown error')}")

        if msg_type != MSG_ACK:
            raise ProtocolError(f"Expected ACK frame, got {msg_type}")

        ack_json = json.loads(ack_data.decode("utf-8"))
        logger.info(f"Server ACK received: {ack_json}")

        seconds = max(0.001, total_transfer_duration)
        throughput_mib_s = (bytes_sent / (1024 * 1024)) / seconds

        results = {
            "status": "success",
            "filename": filename,
            "bytes_sent": bytes_sent,
            "duration_ms": total_transfer_duration * 1000,
            "throughput_mib_s": round(throughput_mib_s, 2),
            "expected_sha256": expected_sha256,
            "verified_sha256": ack_json.get("sha256"),
            "integrity_matched": expected_sha256 == ack_json.get("sha256"),
        }

        print("\n" + "=" * 65)
        print("          NETSHARE TCP TRANSFER REPORT          ")
        print("=" * 65)
        print(f" File Name:            {results['filename']}")
        print(f" Bytes Transferred:    {results['bytes_sent']:,} bytes")
        print(f" Total Duration:       {results['duration_ms']:.2f} ms")
        print(f" Effective Throughput: {results['throughput_mib_s']} MiB/s")
        print(f" SHA-256 Checksum:     {results['verified_sha256']}")
        print(f" Integrity Matched:    {'✓ YES (Identical)' if results['integrity_matched'] else '✗ NO (MISMATCH)'}")
        print("=" * 65 + "\n")

        return results

    finally:
        sock.close()
        logger.info("Socket closed cleanly.")

def generate_sample_file(filepath: str, size_bytes: int):
    """Generates a test file with pseudo-random content."""
    with open(filepath, "wb") as f:
        remaining = size_bytes
        counter = 0
        while remaining > 0:
            chunk_len = min(64 * 1024, remaining)
            # deterministic pattern
            data = bytes([(i + counter) % 256 for i in range(chunk_len)])
            f.write(data)
            remaining -= chunk_len
            counter += 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetShare TCP Lab Client")
    parser.add_argument("--file", help="Path to file to transmit")
    parser.add_argument("--size-mb", type=float, default=1.0, help="Generate and send dummy file of this size in MB")
    parser.add_argument("--host", default="127.0.0.1", help="Server host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=9099, help="Server port (default: 9099)")
    args = parser.parse_args()

    target_file = args.file
    created_tmp = False

    if not target_file:
        target_file = f"sample_{int(args.size_mb * 1024)}kb.dat"
        logger.info(f"Generating temporary test file '{target_file}' ({args.size_mb} MB)...")
        generate_sample_file(target_file, int(args.size_mb * 1024 * 1024))
        created_tmp = True

    try:
        send_file(target_file, args.host, args.port)
    finally:
        if created_tmp and os.path.exists(target_file):
            os.remove(target_file)
