"""
SQLite Database interface for incident history, remediation audit logs, and settings.
"""
import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("self_healing.database")

class Database:
    def __init__(self, db_path: str = "cloud_self_healing.db"):
        self.db_path = db_path
        self._init_tables()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Incidents table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                detected_condition TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                anomaly_score REAL NOT NULL,
                probable_cause TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                executed_action TEXT,
                metrics_snapshot TEXT,
                recovery_status TEXT,
                verification_result TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT,
                duration_sec REAL DEFAULT 0.0
            )
            """)

            # Incident timeline events
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS incident_timeline (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id TEXT NOT NULL,
                stage TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                data TEXT,
                FOREIGN KEY (incident_id) REFERENCES incidents (id)
            )
            """)

            # Audit logs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT
            )
            """)

            # Settings store table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)

            # Benchmark evaluation results
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS benchmarks (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                mode TEXT NOT NULL,
                detection_latency_ms REAL,
                remediation_time_sec REAL,
                recovery_duration_sec REAL,
                success INTEGER,
                scenario TEXT,
                details TEXT
            )
            """)

            conn.commit()
            logger.info("Database tables initialized successfully.")

    def save_incident(self, incident: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            metrics_json = json.dumps(incident.get("metrics_snapshot", {}))
            cursor.execute("""
            INSERT OR REPLACE INTO incidents (
                id, timestamp, detected_condition, severity, status,
                anomaly_score, probable_cause, recommended_action, executed_action,
                metrics_snapshot, recovery_status, verification_result, created_at,
                resolved_at, duration_sec
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                incident["id"],
                incident["timestamp"],
                incident["detected_condition"],
                incident["severity"],
                incident["status"],
                incident["anomaly_score"],
                incident["probable_cause"],
                incident["recommended_action"],
                incident.get("executed_action"),
                metrics_json,
                incident.get("recovery_status", "PENDING"),
                incident.get("verification_result"),
                incident["created_at"],
                incident.get("resolved_at"),
                incident.get("duration_sec", 0.0)
            ))
            conn.commit()

    def update_incident_status(self, incident_id: str, status: str, recovery_status: Optional[str] = None,
                               verification_result: Optional[str] = None, resolved_at: Optional[str] = None,
                               duration_sec: Optional[float] = None, executed_action: Optional[str] = None):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            updates = ["status = ?"]
            params = [status]

            if recovery_status is not None:
                updates.append("recovery_status = ?")
                params.append(recovery_status)
            if verification_result is not None:
                updates.append("verification_result = ?")
                params.append(verification_result)
            if resolved_at is not None:
                updates.append("resolved_at = ?")
                params.append(resolved_at)
            if duration_sec is not None:
                updates.append("duration_sec = ?")
                params.append(duration_sec)
            if executed_action is not None:
                updates.append("executed_action = ?")
                params.append(executed_action)

            params.append(incident_id)
            query = f"UPDATE incidents SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()

    def add_timeline_event(self, incident_id: str, stage: str, message: str, data: Optional[Dict[str, Any]] = None):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            data_json = json.dumps(data) if data else None
            now = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO incident_timeline (incident_id, stage, message, timestamp, data)
            VALUES (?, ?, ?, ?, ?)
            """, (incident_id, stage, message, now, data_json))
            conn.commit()

    def add_audit_log(self, event_type: str, source: str, action: str, status: str, details: Optional[Dict[str, Any]] = None):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            details_json = json.dumps(details) if details else None
            cursor.execute("""
            INSERT INTO audit_logs (timestamp, event_type, source, action, status, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (now, event_type, source, action, status, details_json))
            conn.commit()

    def get_incidents(self, limit: int = 100, severity: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM incidents"
            clauses = []
            params = []
            if severity:
                clauses.append("severity = ?")
                params.append(severity)
            if status:
                clauses.append("status = ?")
                params.append(status)
            if clauses:
                query += " WHERE " + " AND ".join(clauses)
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for row in rows:
                item = dict(row)
                if item.get("metrics_snapshot"):
                    try:
                        item["metrics_snapshot"] = json.loads(item["metrics_snapshot"])
                    except Exception:
                        pass
                results.append(item)
            return results

    def get_incident_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
            row = cursor.fetchone()
            if not row:
                return None
            incident = dict(row)
            if incident.get("metrics_snapshot"):
                try:
                    incident["metrics_snapshot"] = json.loads(incident["metrics_snapshot"])
                except Exception:
                    pass

            cursor.execute("SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY id ASC", (incident_id,))
            events = [dict(r) for r in cursor.fetchall()]
            for ev in events:
                if ev.get("data"):
                    try:
                        ev["data"] = json.loads(ev["data"])
                    except Exception:
                        pass
            incident["timeline"] = events
            return incident

    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            logs = []
            for r in rows:
                item = dict(r)
                if item.get("details"):
                    try:
                        item["details"] = json.loads(item["details"])
                    except Exception:
                        pass
                logs.append(item)
            return logs

    def save_settings(self, settings_dict: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            for k, v in settings_dict.items():
                cursor.execute("""
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, ?)
                """, (k, json.dumps(v), now))
            conn.commit()

    def get_settings(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings")
            rows = cursor.fetchall()
            res = {}
            for r in rows:
                try:
                    res[r["key"]] = json.loads(r["value"])
                except Exception:
                    res[r["key"]] = r["value"]
            return res

    def save_benchmark(self, bench: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            details_json = json.dumps(bench.get("details", {}))
            cursor.execute("""
            INSERT INTO benchmarks (id, timestamp, mode, detection_latency_ms, remediation_time_sec,
                                   recovery_duration_sec, success, scenario, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                bench["id"],
                bench["timestamp"],
                bench["mode"],
                bench.get("detection_latency_ms", 0.0),
                bench.get("remediation_time_sec", 0.0),
                bench.get("recovery_duration_sec", 0.0),
                1 if bench.get("success", False) else 0,
                bench.get("scenario", "general"),
                details_json
            ))
            conn.commit()

    def get_benchmarks(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM benchmarks ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                if item.get("details"):
                    try:
                        item["details"] = json.loads(item["details"])
                    except Exception:
                        pass
                results.append(item)
            return results
