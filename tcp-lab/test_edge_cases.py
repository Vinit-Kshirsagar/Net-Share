"""
NetShare TCP Lab — Automated Edge Case & Acceptance Test Suite
Verifies PRD Test IDs:
  - T-09: TCP normal framed transfer & SHA-256 validation
  - T-10: TCP fragmented header (1-byte stream splits) & recv_exact reassembly
  - T-11: TCP oversized frame boundary rejection
  - T-12: TCP premature disconnect & .tmp file quarantine/cleanup
  - T-13: TCP payload corruption detection
"""

import socket
import json
import hashlib
import os
import sys
import time
import struct
import threading
import unittest

# Ensure tcp-lab directory is in python module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from protocol import (
    MAGIC,
    PROTOCOL_VERSION,
    MSG_HELLO,
    MSG_FILE_START,
    MSG_FILE_CHUNK,
    MSG_FILE_END,
    MSG_ACK,
    MSG_ERROR,
    HEADER_SIZE,
    MAX_PAYLOAD_SIZE,
    pack_frame,
    recv_frame,
)
import server

TEST_HOST = "127.0.0.1"
TEST_PORT = 9199  # Dedicated test port to avoid conflict
TEST_STORAGE = os.path.join(os.path.dirname(__file__), "test_storage")

class NetShareTcpLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Override storage dir for clean test isolation
        server.STORAGE_DIR = TEST_STORAGE
        os.makedirs(TEST_STORAGE, exist_ok=True)

        # Start server in background thread
        cls.server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        cls.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        cls.server_sock.bind((TEST_HOST, TEST_PORT))
        cls.server_sock.listen(5)

        cls.running = True
        cls.server_thread = threading.Thread(target=cls._run_server, daemon=True)
        cls.server_thread.start()
        time.sleep(0.1)  # Allow socket to bind

    @classmethod
    def _run_server(cls):
        while cls.running:
            try:
                cls.server_sock.settimeout(0.5)
                conn, addr = cls.server_sock.accept()
                server.handle_client(conn, addr)
            except socket.timeout:
                continue
            except Exception:
                break

    @classmethod
    def tearDownClass(cls):
        cls.running = False
        cls.server_sock.close()
        # Clean up test storage directory
        if os.path.exists(TEST_STORAGE):
            for f in os.listdir(TEST_STORAGE):
                os.remove(os.path.join(TEST_STORAGE, f))
            os.rmdir(TEST_STORAGE)

    def _connect(self) -> socket.socket:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5.0)
        sock.connect((TEST_HOST, TEST_PORT))
        return sock

    def test_01_normal_transfer_t09(self):
        """T-09: Normal end-to-end transfer with SHA-256 verification."""
        sock = self._connect()
        try:
            # 1. HELLO
            sock.sendall(pack_frame(MSG_HELLO, b'{"client":"test"}'))
            m_type, _ = recv_frame(sock)
            self.assertEqual(m_type, MSG_HELLO)

            # 2. FILE_START
            payload_data = b"Hello from NetShare TCP socket test harness! " * 50
            expected_hash = hashlib.sha256(payload_data).hexdigest()
            meta = json.dumps({
                "filename": "test_t09.txt",
                "total_bytes": len(payload_data),
                "expected_sha256": expected_hash,
            }).encode("utf-8")
            sock.sendall(pack_frame(MSG_FILE_START, meta))

            # 3. CHUNK
            sock.sendall(pack_frame(MSG_FILE_CHUNK, payload_data))

            # 4. END
            sock.sendall(pack_frame(MSG_FILE_END))

            # 5. ACK
            m_type, ack_bytes = recv_frame(sock)
            self.assertEqual(m_type, MSG_ACK)
            ack_json = json.loads(ack_bytes.decode("utf-8"))
            self.assertEqual(ack_json["sha256"], expected_hash)
            self.assertEqual(ack_json["bytes_received"], len(payload_data))

            # Confirm file on disk
            final_file = os.path.join(TEST_STORAGE, "test_t09.txt")
            self.assertTrue(os.path.exists(final_file))
        finally:
            sock.close()

    def test_02_fragmented_header_t10(self):
        """T-10: Stream sends 10-byte header 1 byte at a time; tests recv_exact reassembly."""
        sock = self._connect()
        try:
            # Complete frame
            frame = pack_frame(MSG_HELLO, b'{"test":"fragmented"}')

            # Send the first 10 bytes (the header) 1 byte at a time with 5ms delays
            for i in range(10):
                sock.send(frame[i : i + 1])
                time.sleep(0.005)

            # Send remainder of frame
            sock.sendall(frame[10:])

            # Verify server parsed it cleanly
            m_type, resp = recv_frame(sock)
            self.assertEqual(m_type, MSG_HELLO)
        finally:
            sock.close()

    def test_03_oversized_frame_rejection_t11(self):
        """T-11: Frame claims payload length > 64 KiB; server must reject with MSG_ERROR without crashing."""
        sock = self._connect()
        try:
            # Craft raw 10-byte header claiming 100,000 bytes payload (> 65,536 bytes limit)
            bad_header = struct.pack("!4sBBI", MAGIC, PROTOCOL_VERSION, MSG_HELLO, 100000)
            sock.sendall(bad_header)

            m_type, resp = recv_frame(sock)
            self.assertEqual(m_type, MSG_ERROR)
        finally:
            sock.close()

    def test_04_premature_disconnect_cleanup_t12(self):
        """T-12: Client closes socket mid-transfer; server cleans up any partial .tmp file."""
        sock = self._connect()
        try:
            sock.sendall(pack_frame(MSG_HELLO))
            recv_frame(sock)

            meta = json.dumps({
                "filename": "abandoned_transfer.bin",
                "total_bytes": 10000,
                "expected_sha256": "0" * 64,
            }).encode("utf-8")
            sock.sendall(pack_frame(MSG_FILE_START, meta))

            # Send partial chunk
            sock.sendall(pack_frame(MSG_FILE_CHUNK, b"partial data" * 20))
            time.sleep(0.05)
        finally:
            # Abruptly close socket without FILE_END
            sock.close()

        # Allow server to detect EOF and run cleanup
        time.sleep(0.2)

        # Assert no .tmp file and no completed file remains
        tmp_file = os.path.join(TEST_STORAGE, "abandoned_transfer.bin.tmp")
        final_file = os.path.join(TEST_STORAGE, "abandoned_transfer.bin")
        self.assertFalse(os.path.exists(tmp_file), "Temporary file should be cleaned up on disconnect!")
        self.assertFalse(os.path.exists(final_file), "Partial file should NOT be finalized!")

    def test_05_corrupted_payload_detection_t13(self):
        """T-13: Payload corrupted in transit; server detects digest mismatch and rejects."""
        sock = self._connect()
        try:
            sock.sendall(pack_frame(MSG_HELLO))
            recv_frame(sock)

            valid_data = b"Authentic payload bytes"
            corrupted_data = b"Corrupted payload bytes"
            valid_hash = hashlib.sha256(valid_data).hexdigest()

            meta = json.dumps({
                "filename": "corrupted_test.bin",
                "total_bytes": len(corrupted_data),
                "expected_sha256": valid_hash,  # Expects valid_hash, but we send corrupted_data!
            }).encode("utf-8")
            sock.sendall(pack_frame(MSG_FILE_START, meta))
            sock.sendall(pack_frame(MSG_FILE_CHUNK, corrupted_data))
            sock.sendall(pack_frame(MSG_FILE_END))

            m_type, err_payload = recv_frame(sock)
            self.assertEqual(m_type, MSG_ERROR)
        finally:
            sock.close()

if __name__ == "__main__":
    unittest.main()
