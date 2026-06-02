from django.db import connection
from django.utils import timezone
import datetime
import re

def run_data_quality_validations(cursor, company_id=None):
    """
    Runs the 7 Data Quality (DQ) checks on the SQLite analytics warehouse,
    saves the results to the DataQualityLog ledger, and synchronizes failures
    with the closed-loop AnalyticsAlert engine.
    """
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    now_utc = timezone.now()
    now_str = now_utc.strftime('%Y-%m-%d %H:%M:%S')

    checks = []

    # ──────────────────────────────────────────────────────────────────
    # Check 1: Orphaned Sales Orders Key Check
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT COUNT(*), GROUP_CONCAT(order_id)
        FROM FactSales
        WHERE product_key NOT IN (SELECT product_key FROM DimProduct)
           OR so_key NOT IN (SELECT so_surrogate_key FROM DimSO)
    """)
    orphaned_sales_count, samples = cursor.fetchone()
    orphaned_sales_count = orphaned_sales_count or 0
    checks.append({
        "name": "Orphaned Sales Orders Key Check",
        "desc": "Verifies that every record in FactSales references a valid, active DimProduct and DimSO surrogate entry.",
        "status": "PASS" if orphaned_sales_count == 0 else "FAIL",
        "failure_count": orphaned_sales_count,
        "samples": samples[:100] if samples else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 2: Orphaned Visits Key Check
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT COUNT(*), GROUP_CONCAT(visit_id)
        FROM FactVisits
        WHERE customer_key IS NOT NULL AND customer_key NOT IN (SELECT customer_key FROM DimCustomer)
    """)
    orphaned_visits_count, samples = cursor.fetchone()
    orphaned_visits_count = orphaned_visits_count or 0
    checks.append({
        "name": "Orphaned Visits Key Check",
        "desc": "Verifies that every recorded customer visit references a valid DimCustomer entity.",
        "status": "PASS" if orphaned_visits_count == 0 else "FAIL",
        "failure_count": orphaned_visits_count,
        "samples": samples[:100] if samples else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 3: Transaction Date Bounds Assertion
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT COUNT(*), GROUP_CONCAT(order_id)
        FROM FactSales
        WHERE date_key > %s OR date_key < '2024-01-01'
    """, (today_str,))
    bounds_count, samples = cursor.fetchone()
    bounds_count = bounds_count or 0
    checks.append({
        "name": "Transaction Date Bounds Assertion",
        "desc": "Asserts that order transaction dates are logically placed between standard baseline 2024-01-01 and today's date.",
        "status": "PASS" if bounds_count == 0 else "FAIL",
        "failure_count": bounds_count,
        "samples": samples[:100] if samples else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 4: Non-Negative Value Integrity
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT COUNT(*), GROUP_CONCAT(sku)
        FROM DimProduct
        WHERE rate < 0 OR landed_cost < 0
    """)
    neg_count, samples = cursor.fetchone()
    neg_count = neg_count or 0
    checks.append({
        "name": "Non-Negative Value Integrity",
        "desc": "Validates that landed costs and standard rates listed in DimProduct profiles are non-negative values.",
        "status": "PASS" if neg_count == 0 else "FAIL",
        "failure_count": neg_count,
        "samples": samples[:100] if samples else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 5: Vehicle Number standard casing
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("SELECT orderId, narration FROM `Order` WHERE narration LIKE '%[VEHICLE:%'")
    order_narrations = cursor.fetchall()
    casing_failures = 0
    failing_orders = []
    for order_id, narration in order_narrations:
        narration = narration or ''
        match = re.search(r'\[VEHICLE:\s*([^\]]+)\]', narration, re.IGNORECASE)
        if match:
            veh_num = match.group(1).strip()
            # If contains lowercase letters, it's a format violation
            if re.search(r'[a-z]', veh_num):
                casing_failures += 1
                failing_orders.append(order_id)

    checks.append({
        "name": "Vehicle Number Standard Casing",
        "desc": "Ensures that all logistical dispatch vehicle numbers listed in order narration tags conform strictly to the standardized uppercase layout.",
        "status": "PASS" if casing_failures == 0 else "FAIL",
        "failure_count": casing_failures,
        "samples": ",".join(failing_orders[:5]) if failing_orders else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 6: Invoice Uniqueness Integrity
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT COUNT(*), GROUP_CONCAT(orderId) FROM (
            SELECT orderId FROM `Order` GROUP BY orderId HAVING COUNT(*) > 1
        )
    """)
    dup_count, samples = cursor.fetchone()
    dup_count = dup_count or 0
    checks.append({
        "name": "Invoice Uniqueness Integrity",
        "desc": "Asserts that every transaction lists a unique transaction/invoice order ID, preventing key collisions.",
        "status": "PASS" if dup_count == 0 else "FAIL",
        "failure_count": dup_count,
        "samples": samples[:100] if samples else ""
    })

    # ──────────────────────────────────────────────────────────────────
    # Check 7: Sync Freshness Observation
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("SELECT MAX(updatedAt) FROM `Order`")
    max_order_updated = cursor.fetchone()[0]
    cursor.execute("SELECT MAX(updatedat) FROM Inventory")
    max_inv_updated = cursor.fetchone()[0]

    latest_sync_time = None
    for val in [max_order_updated, max_inv_updated]:
        if val:
            try:
                # Handle string dates vs datetime instances
                if isinstance(val, str):
                    dt = datetime.datetime.strptime(val.split('.')[0].replace('T', ' ').replace('Z', ''), '%Y-%m-%d %H:%M:%S')
                else:
                    dt = val
                if latest_sync_time is None or dt > latest_sync_time:
                    latest_sync_time = dt
            except:
                pass

    hours_since_sync = 0.0
    if latest_sync_time:
        # Assume timezone naive comparison
        if latest_sync_time.tzinfo:
            now_naive = datetime.datetime.now(latest_sync_time.tzinfo)
        else:
            now_naive = datetime.datetime.now()
        diff = now_naive - latest_sync_time
        hours_since_sync = round(diff.total_seconds() / 3600.0, 1)

    sync_stale = hours_since_sync > 6.0
    checks.append({
        "name": "Sync Freshness Observation",
        "desc": "Sweeps the operational warehouse tables, alerting if the rolling synchronization gap exceeds 6 hours.",
        "status": "PASS" if not sync_stale else "FAIL",
        "failure_count": 1 if sync_stale else 0,
        "samples": f"Sync gap: {hours_since_sync} hours"
    })

    # ──────────────────────────────────────────────────────────────────
    # Write Check Results to DataQualityLog Table
    # ──────────────────────────────────────────────────────────────────
    active_dq_keys = set()
    for check in checks:
        check_id = f"dq_{check['name'].lower().replace(' ', '_')}"
        active_dq_keys.add(check['name'])

        cursor.execute("""
            INSERT OR REPLACE INTO DataQualityLog (id, rule_name, description, status, failure_count, sample_failures, timestamp, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (check_id, check['name'], check['desc'], check['status'], check['failure_count'], check['samples'], now_str, company_id))

        # ──────────────────────────────────────────────────────────────────
        # Closed-Loop Alerts Sync
        # ──────────────────────────────────────────────────────────────────
        alert_id = f"alert_dq_{check_id}"
        if check['status'] == 'FAIL':
            # Check if alert already open
            cursor.execute("SELECT id FROM AnalyticsAlert WHERE id = %s AND status IN ('Open', 'Acknowledged')", (alert_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO AnalyticsAlert (id, type, severity, entity_type, entity_id, metric_value, threshold, status, assigned_to, created_at, resolution_note, company_id)
                    VALUES (%s, 'DATA_QUALITY', 'CRITICAL', 'System', %s, %s, 0.0, 'Open', NULL, %s, %s, %s)
                """, (alert_id, check['name'], float(check['failure_count']), today_str, f"Data Quality Check '{check['name']}' failed with {check['failure_count']} violations.", company_id))
            else:
                cursor.execute("""
                    UPDATE AnalyticsAlert
                    SET metric_value = %s, resolution_note = %s
                    WHERE id = %s
                """, (float(check['failure_count']), f"Data Quality Check '{check['name']}' failed with {check['failure_count']} violations.", alert_id))
        else:
            # Auto-resolve alert if it exists open
            cursor.execute("SELECT id FROM AnalyticsAlert WHERE id = %s AND status IN ('Open', 'Acknowledged')", (alert_id,))
            if cursor.fetchone():
                cursor.execute("""
                    UPDATE AnalyticsAlert
                    SET status = 'Resolved', resolved_at = %s, resolution_note = %s
                    WHERE id = %s
                """, (today_str, f"System auto-resolved: Data Quality check '{check['name']}' recovered successfully to passing status.", alert_id))

    return checks


def get_data_quality_report(company_id=None):
    """
    Compiles the executive data quality report, returning health scores,
    individual rules performance, sync timestamps, and audit metrics.
    """
    report = {
        "health_score": 100.0,
        "rules": [],
        "sync_freshness": {
            "hours_since_sync": 0.0,
            "status": "Optimal",
            "last_sync_time": "—"
        },
        "critical_violations": 0
    }

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT rule_name, description, status, failure_count, sample_failures, timestamp
            FROM DataQualityLog
            ORDER BY rule_name ASC
        """)
        rows = cursor.fetchall()

        if not rows:
            # First time baseline run (run immediately if table empty)
            run_data_quality_validations(cursor, company_id)
            cursor.execute("""
                SELECT rule_name, description, status, failure_count, sample_failures, timestamp
                FROM DataQualityLog
                ORDER BY rule_name ASC
            """)
            rows = cursor.fetchall()

        passing_count = 0
        total_rules = len(rows)

        for r in rows:
            status = r[2]
            if status == 'PASS':
                passing_count += 1
            else:
                report["critical_violations"] += int(r[3] or 0)

            report["rules"].append({
                "name": r[0],
                "description": r[1],
                "status": status,
                "failure_count": r[3],
                "samples": r[4],
                "timestamp": r[5]
            })

        if total_rules > 0:
            report["health_score"] = round((passing_count / total_rules) * 100, 1)

        # Freshness offsets calculation
        cursor.execute("SELECT MAX(updatedAt) FROM `Order`")
        max_order_updated = cursor.fetchone()[0]
        cursor.execute("SELECT MAX(updatedat) FROM Inventory")
        max_inv_updated = cursor.fetchone()[0]

        latest_sync_time = None
        for val in [max_order_updated, max_inv_updated]:
            if val:
                try:
                    if isinstance(val, str):
                        dt = datetime.datetime.strptime(val.split('.')[0].replace('T', ' ').replace('Z', ''), '%Y-%m-%d %H:%M:%S')
                    else:
                        dt = val
                    if latest_sync_time is None or dt > latest_sync_time:
                        latest_sync_time = dt
                except:
                    pass

        if latest_sync_time:
            if latest_sync_time.tzinfo:
                now_naive = datetime.datetime.now(latest_sync_time.tzinfo)
            else:
                now_naive = datetime.datetime.now()
            diff = now_naive - latest_sync_time
            hours = round(diff.total_seconds() / 3600.0, 1)
            report["sync_freshness"]["hours_since_sync"] = hours
            report["sync_freshness"]["last_sync_time"] = latest_sync_time.strftime('%Y-%m-%d %H:%M:%S')
            report["sync_freshness"]["status"] = "Optimal" if hours <= 6.0 else "Stale (Critical Delay)"

    return report
