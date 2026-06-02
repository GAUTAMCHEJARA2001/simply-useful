from django.db import connection
from django.utils import timezone
import datetime
import re

def compile_exception_alerts(cursor, company_id=None):
    """
    Scans the data warehouse and populates the AnalyticsAlert table.
    Implements a closed-loop design:
      - Automatically detects active operational anomalies.
      - Preserves user states (Acknowledge, resolution note) for existing alerts.
      - Automatically resolves alerts if the operational metrics return to safety.
    """
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    date_30_days_ago = (datetime.date.today() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    
    active_flags = [] # Elements format: {"type": X, "entity_type": Y, "entity_id": Z, "val": A, "threshold": B, "severity": C}
    
    # ──────────────────────────────────────────────────────────────────
    # 1. SCAN FOR EXPENSE LEAKAGE (SO rolling 30-day Expenses > 15% Margin)
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("SELECT so_surrogate_key, so_key, name FROM DimSO WHERE is_current = 1")
    sales_officers = cursor.fetchall()
    
    for surr_key, email, name in sales_officers:
        # Sum 30-day travel expenses
        cursor.execute("""
            SELECT SUM(amount) FROM FactExpenses 
            WHERE so_key = %s AND status = 'Approved' AND date_key >= %s
        """, (surr_key, date_30_days_ago))
        expenses = cursor.fetchone()[0] or 0.0
        
        # Sum 30-day completed sales margin
        cursor.execute("""
            SELECT SUM(margin) FROM FactSales 
            WHERE so_key = %s AND status = 'Completed' AND date_key >= %s
        """, (surr_key, date_30_days_ago))
        margin = cursor.fetchone()[0] or 0.0
        
        if expenses > 0:
            if margin <= 0:
                # Infinite leak! Margins are negative or zero, flag critical!
                active_flags.append({
                    "type": "EXPENSE_LEAKAGE",
                    "entity_type": "User",
                    "entity_id": email,
                    "val": round(expenses, 2),
                    "threshold": 0.15,
                    "severity": "CRITICAL",
                    "msg": f"Sales Officer {name} has approved travel expenses of {expenses} but generated 0/negative margins."
                })
            else:
                ratio = expenses / margin
                if ratio > 0.15:
                    sev = "CRITICAL" if ratio > 0.25 else "WARNING"
                    active_flags.append({
                        "type": "EXPENSE_LEAKAGE",
                        "entity_type": "User",
                        "entity_id": email,
                        "val": round(ratio * 100, 1),
                        "threshold": 15.0,
                        "severity": sev,
                        "msg": f"Sales Officer {name} expense-to-margin ratio is at {round(ratio * 100, 1)}%, exceeding the 15% leakage limit."
                    })

    # ──────────────────────────────────────────────────────────────────
    # 2. SCAN FOR LOGISTICS SLA DELAYS (Warehouse dispatch TAT > 48h / 2.0 days)
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("SELECT id, createdAt, narration, status FROM `Order` WHERE status IN ('Dispatched', 'Completed') AND date >= %s", (date_30_days_ago,))
    orders = cursor.fetchall()
    
    warehouse_tats = {} # {wh_id: [days, ...]}
    warehouse_names = {}
    
    for o_id, created_at_val, narration, status in orders:
        narration = narration or ''
        # Parse warehouse id and dispatch date
        wh_id = "1" # default fallback
        wh_name = "Main Depot"
        
        if "[WAREHOUSE ID:" in narration:
            try:
                wh_id = narration.split("[WAREHOUSE ID:")[1].split("]")[0].strip()
            except:
                pass
        if "[WAREHOUSE:" in narration:
            try:
                wh_name = narration.split("[WAREHOUSE:")[1].split("]")[0].strip()
            except:
                pass
                
        warehouse_names[wh_id] = wh_name
        
        match = re.search(r'\[DISPATCH DATE:\s*([^\]]+)\]', narration, re.IGNORECASE)
        dispatch_date_str = match.group(1).strip() if match else None
        
        if dispatch_date_str and created_at_val:
            try:
                if hasattr(created_at_val, 'date'):
                    created_dt = created_at_val
                else:
                    created_date_clean = str(created_at_val).split(' ')[0].split('T')[0]
                    created_dt = datetime.datetime.strptime(created_date_clean, '%Y-%m-%d')
                
                dispatch_date_clean = dispatch_date_str.split(' ')[0].split('T')[0]
                dispatch_dt = datetime.datetime.strptime(dispatch_date_clean, '%Y-%m-%d')
                
                diff_days = (dispatch_dt.date() - created_dt.date()).days
                if wh_id not in warehouse_tats:
                    warehouse_tats[wh_id] = []
                warehouse_tats[wh_id].append(diff_days)
            except:
                pass
                
    for wh_id, tats in warehouse_tats.items():
        if tats:
            avg_tat = sum(tats) / len(tats)
            if avg_tat > 2.0:
                sev = "CRITICAL" if avg_tat > 3.0 else "WARNING"
                name = warehouse_names.get(wh_id, f"Warehouse {wh_id}")
                active_flags.append({
                    "type": "LOGISTICS_SLA",
                    "entity_type": "Warehouse",
                    "entity_id": wh_id,
                    "val": round(avg_tat, 1),
                    "threshold": 2.0,
                    "severity": sev,
                    "msg": f"Warehouse {name} average dispatch TAT stands at {round(avg_tat, 1)} days, exceeding 48h SLA targets."
                })

    # ──────────────────────────────────────────────────────────────────
    # 3. SCAN FOR SAFETY STOCK BREACHES (Stock < Minimum safety stock limits)
    # ──────────────────────────────────────────────────────────────────
    cursor.execute("SELECT product_key, sku, name FROM DimProduct")
    products = cursor.fetchall()
    
    for prod_key, sku, name in products:
        # Sum warehouse inventories
        cursor.execute("SELECT SUM(quantity) FROM Inventory WHERE productId = %s", (prod_key,))
        current_stock = cursor.fetchone()[0] or 0.0
        
        # Check standard minimum stock (fallback 50 bags)
        cursor.execute("SELECT minimumStock FROM Product WHERE id = %s", (prod_key,))
        min_row = cursor.fetchone()
        safety_threshold = float(min_row[0] or 50.0) if min_row else 50.0
        
        if current_stock < safety_threshold:
            sev = "CRITICAL" if current_stock == 0 else "WARNING"
            active_flags.append({
                "type": "SAFETY_STOCK",
                "entity_type": "Product",
                "entity_id": sku,
                "val": round(current_stock, 0),
                "threshold": safety_threshold,
                "severity": sev,
                "msg": f"Product SKU {sku} ({name}) stock is critically low at {int(current_stock)} bags (Safety: {int(safety_threshold)})."
            })

    # ──────────────────────────────────────────────────────────────────
    # 4. SCAN FOR CRM LEAD STAGNATION (Status not Won/Lost & updatedat > 14 days)
    # ──────────────────────────────────────────────────────────────────
    date_14_days_ago = (timezone.now() - datetime.timedelta(days=14)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("""
        SELECT id, name, status, updatedat 
        FROM Lead 
        WHERE isDeleted = 0 AND status NOT IN ('WON', 'LOST') AND updatedat < %s
    """, (date_14_days_ago,))
    stagnant_leads = cursor.fetchall()
    
    for lead_id, lead_name, status, updated_at_val in stagnant_leads:
        try:
            if hasattr(updated_at_val, 'date'):
                updated_dt = updated_at_val
            else:
                updated_dt = datetime.datetime.strptime(updated_at_val.split('.')[0], '%Y-%m-%d %H:%M:%S')
                
            delta_days = (datetime.datetime.now() - updated_dt).days
        except:
            delta_days = 15 # default fallback flag
            
        active_flags.append({
            "type": "CRM_STAGNATION",
            "entity_type": "Lead",
            "entity_id": lead_id,
            "val": float(delta_days),
            "threshold": 14.0,
            "severity": "WARNING",
            "msg": f"CRM Prospect '{lead_name}' remains stagnant in {status.title()} stage for {delta_days} days without update."
        })

    # ──────────────────────────────────────────────────────────────────
    # 5. WRITE & SYNCHRONIZE ALERTS (Closed-loop design)
    # ──────────────────────────────────────────────────────────────────
    active_keys = set() # (type, entity_id)
    
    for flag in active_flags:
        key = (flag["type"], flag["entity_id"])
        active_keys.add(key)
        
        # Check if an open or acknowledged alert already exists
        cursor.execute("""
            SELECT id, status FROM AnalyticsAlert 
            WHERE type = %s AND entity_id = %s AND status IN ('Open', 'Acknowledged')
            LIMIT 1
        """, key)
        alert_row = cursor.fetchone()
        
        if not alert_row:
            # Create a new Alert
            alert_id = f"alert_{flag['type']}_{flag['entity_id']}_{today_str}"
            cursor.execute("""
                INSERT INTO AnalyticsAlert (
                    id, type, severity, entity_type, entity_id, metric_value, threshold, 
                    status, assigned_to, created_at, resolution_note, company_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Open', NULL, %s, %s, NULL)
            """, (alert_id, flag["type"], flag["severity"], flag["entity_type"], flag["entity_id"],
                  flag["val"], flag["threshold"], today_str, flag["msg"]))
        else:
            # Update metric value of existing alert to reflect rolling values
            cursor.execute("""
                UPDATE AnalyticsAlert 
                SET metric_value = %s, resolution_note = %s
                WHERE id = %s
            """, (flag["val"], flag["msg"], alert_row[0]))

    # Closed-Loop Auto-Resolution: Find existing Open/Acknowledged alerts not in active flag sweeps
    cursor.execute("SELECT id, type, entity_id, resolution_note FROM AnalyticsAlert WHERE status IN ('Open', 'Acknowledged')")
    open_alerts = cursor.fetchall()
    
    for a_id, a_type, a_ent, a_note in open_alerts:
        if (a_type, a_ent) not in active_keys:
            # Anomaly resolved operationally!
            cursor.execute("""
                UPDATE AnalyticsAlert 
                SET status = 'Resolved', resolved_at = %s, 
                    resolution_note = 'System resolved: operational metrics successfully returned within safety thresholds.'
                WHERE id = %s
            """, (today_str, a_id))
            
    return len(active_flags)
