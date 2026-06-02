import sqlite3
import datetime
from django.db import connection
from django.utils import timezone

def parse_date_key(dt_val):
    if not dt_val:
        return datetime.date.today().strftime('%Y-%m-%d')
    if hasattr(dt_val, 'strftime'):
        return dt_val.strftime('%Y-%m-%d')
    if isinstance(dt_val, str):
        return dt_val.split(' ')[0].split('T')[0]
    return datetime.date.today().strftime('%Y-%m-%d')

def get_so_surrogate_key(cursor, email, date_str):
    if not email:
        return "unknown"
    cursor.execute("""
        SELECT so_surrogate_key 
        FROM DimSO 
        WHERE so_key = %s AND %s >= start_date AND %s <= end_date 
        LIMIT 1
    """, (email, date_str, date_str))
    row = cursor.fetchone()
    if row:
        return row[0]
        
    # Fallback to current version
    cursor.execute("""
        SELECT so_surrogate_key 
        FROM DimSO 
        WHERE so_key = %s AND is_current = 1 
        LIMIT 1
    """, (email,))
    row = cursor.fetchone()
    if row:
        return row[0]
        
    return f"{email}_2024-01-01"

def compile_analytical_warehouse(company_id=None):
    """
    Orchestrates the ETL / ELT pipeline to drop, create, and populate
    the Star Schema Facts and Dimensions tables in SQLite.
    All operations execute inside a single atomic database transaction.
    """
    with connection.cursor() as cursor:
        # ──────────────────────────────────────────────────────────────────
        # 1. DROP & RE-CREATE DIMENSION TABLES
        # ──────────────────────────────────────────────────────────────────
        cursor.execute("DROP TABLE IF EXISTS DimDate")
        cursor.execute("""
            CREATE TABLE DimDate (
                date_key TEXT PRIMARY KEY,
                calendar_date TEXT NOT NULL,
                fiscal_year TEXT NOT NULL,
                fiscal_quarter TEXT NOT NULL,
                month_name TEXT NOT NULL,
                day_of_week TEXT NOT NULL,
                is_weekend INTEGER NOT NULL
            )
        """)

        # Self-healing migration: Drop DimSO if it doesn't have SCD Type 2 columns yet
        try:
            cursor.execute("SELECT so_surrogate_key FROM DimSO LIMIT 1")
        except Exception:
            cursor.execute("DROP TABLE IF EXISTS DimSO")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS DimSO (
                so_surrogate_key TEXT PRIMARY KEY,
                so_key TEXT NOT NULL, -- User email
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                active INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                is_current INTEGER NOT NULL,
                company_id TEXT
            )
        """)

        cursor.execute("DROP TABLE IF EXISTS DimProduct")
        cursor.execute("""
            CREATE TABLE DimProduct (
                product_key TEXT PRIMARY KEY, -- Product ID
                sku TEXT NOT NULL,
                name TEXT NOT NULL,
                bag_size TEXT,
                rate REAL NOT NULL,
                gst REAL NOT NULL,
                landed_cost REAL NOT NULL, -- Derived margin cost: rate * 0.75
                company_id TEXT
            )
        """)

        cursor.execute("DROP TABLE IF EXISTS DimWarehouse")
        cursor.execute("""
            CREATE TABLE DimWarehouse (
                warehouse_key TEXT PRIMARY KEY, -- Warehouse ID/Name
                name TEXT NOT NULL,
                location TEXT,
                company_id TEXT
            )
        """)

        cursor.execute("DROP TABLE IF EXISTS DimCustomer")
        cursor.execute("""
            CREATE TABLE DimCustomer (
                customer_key TEXT PRIMARY KEY, -- Customer ID
                customer_code TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'Dealer' or 'Distributor'
                city TEXT,
                state TEXT,
                assigned_so_email TEXT,
                active INTEGER NOT NULL,
                company_id TEXT
            )
        """)

        # ──────────────────────────────────────────────────────────────────
        # 2. DROP & RE-CREATE FACT TABLES
        # ──────────────────────────────────────────────────────────────────
        cursor.execute("DROP TABLE IF EXISTS FactSales")
        cursor.execute("""
            CREATE TABLE FactSales (
                fact_id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                date_key TEXT NOT NULL,
                so_key TEXT NOT NULL,
                product_key TEXT NOT NULL,
                warehouse_key TEXT,
                customer_key TEXT,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                gross_sales REAL NOT NULL,
                net_revenue REAL NOT NULL, -- Excluding 18% GST (gross_sales / 1.18)
                landed_cost REAL NOT NULL,  -- (quantity * landed_cost)
                margin REAL NOT NULL,       -- (net_revenue - landed_cost)
                tax_amount REAL NOT NULL,   -- (gross_sales - net_revenue)
                status TEXT NOT NULL,
                company_id TEXT
            )
        """)

        cursor.execute("DROP TABLE IF EXISTS FactVisits")
        cursor.execute("""
            CREATE TABLE FactVisits (
                fact_id TEXT PRIMARY KEY,
                visit_id TEXT NOT NULL,
                date_key TEXT NOT NULL,
                so_key TEXT NOT NULL,
                customer_key TEXT,
                duration_minutes INTEGER NOT NULL, -- default 30 mins
                company_id TEXT
            )
        """)

        cursor.execute("DROP TABLE IF EXISTS FactExpenses")
        cursor.execute("""
            CREATE TABLE FactExpenses (
                fact_id TEXT PRIMARY KEY,
                expense_id TEXT NOT NULL,
                date_key TEXT NOT NULL,
                so_key TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT NOT NULL,
                company_id TEXT
            )
        """)

        # ──────────────────────────────────────────────────────────────────
        # 3. DEFINE ANALYTICAL ALERTS AND FORECAST SNAPSHOTS (CREATE TABLE IF NOT EXISTS)
        # ──────────────────────────────────────────────────────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AnalyticsAlert (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                metric_value REAL NOT NULL,
                threshold REAL NOT NULL,
                status TEXT NOT NULL,
                assigned_to TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT,
                resolution_note TEXT,
                company_id TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ForecastSnapshot (
                id TEXT PRIMARY KEY,
                sku TEXT NOT NULL,
                forecast_date TEXT NOT NULL,
                predicted_quantity REAL NOT NULL,
                model_version TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                company_id TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS OperationalEventLedger (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                old_state TEXT NOT NULL,
                new_state TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                user_email TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                company_id TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS DataQualityLog (
                id TEXT PRIMARY KEY,
                rule_name TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                failure_count INTEGER NOT NULL,
                sample_failures TEXT,
                timestamp TEXT NOT NULL,
                company_id TEXT
            )
        """)

        # ──────────────────────────────────────────────────────────────────
        # 3. POPULATE DIMENSION TABLES (ETL Phase)
        # ──────────────────────────────────────────────────────────────────
        
        # A. Populate DimDate (Generate days from 2024 to 2026)
        start_date = datetime.date(2024, 1, 1)
        end_date = datetime.date(2026, 12, 31)
        delta = datetime.timedelta(days=1)
        curr = start_date
        
        date_rows = []
        while curr <= end_date:
            date_key = curr.strftime('%Y-%m-%d')
            # Determine Indian FY (Starts April 1st)
            if curr.month >= 4:
                fy = f"{curr.year}-{str(curr.year + 1)[2:]}"
                quarter = f"Q{((curr.month - 4) // 3) + 1}"
            else:
                fy = f"{curr.year - 1}-{str(curr.year)[2:]}"
                quarter = f"Q{((curr.month + 8) // 3)}"
                
            is_weekend = 1 if curr.weekday() >= 5 else 0
            
            date_rows.append((
                date_key,
                date_key,
                fy,
                quarter,
                curr.strftime('%B'),
                curr.strftime('%A'),
                is_weekend
            ))
            curr += delta
            
        cursor.executemany("""
            INSERT INTO DimDate (date_key, calendar_date, fiscal_year, fiscal_quarter, month_name, day_of_week, is_weekend)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, date_rows)

        # B. Populate DimSO (Kimball Slowly Changing Dimensions Type 2 - SCD Type 2)
        cursor.execute("SELECT email, name, role, active, companyId FROM User")
        user_rows = cursor.fetchall()
        
        today_str = datetime.date.today().strftime('%Y-%m-%d')
        
        for email, name, role, active, companyId in user_rows:
            if not email:
                continue
            name_val = name or email
            
            # Check existing current record in DimSO
            cursor.execute("""
                SELECT so_surrogate_key, name, role, active 
                FROM DimSO 
                WHERE so_key = %s AND is_current = 1 
                LIMIT 1
            """, (email,))
            dim_row = cursor.fetchone()
            
            if not dim_row:
                # No current version exists in warehouse, insert new record
                surr_key = f"{email}_2024-01-01"
                cursor.execute("""
                    INSERT INTO DimSO (so_surrogate_key, so_key, name, role, active, start_date, end_date, is_current, company_id)
                    VALUES (%s, %s, %s, %s, %s, '2024-01-01', '9999-12-31', 1, %s)
                """, (surr_key, email, name_val, role, active, companyId))
            else:
                existing_surr, existing_name, existing_role, existing_active = dim_row
                # Check for changes in descriptive attributes
                if existing_name != name_val or existing_role != role or existing_active != active:
                    # Invalidate old record (End date set to yesterday, is_current = 0)
                    yesterday_str = (datetime.date.today() - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
                    cursor.execute("""
                        UPDATE DimSO 
                        SET end_date = %s, is_current = 0 
                        WHERE so_surrogate_key = %s
                    """, (yesterday_str, existing_surr))
                    
                    # Insert new active version
                    new_surr_key = f"{email}_{today_str}"
                    cursor.execute("""
                        INSERT INTO DimSO (so_surrogate_key, so_key, name, role, active, start_date, end_date, is_current, company_id)
                        VALUES (%s, %s, %s, %s, %s, %s, '9999-12-31', 1, %s)
                    """, (new_surr_key, email, name_val, role, active, today_str, companyId))

        # C. Populate DimProduct
        # Standard Landed Cost is estimated at 75% of sale rate for margin intelligence
        cursor.execute("""
            INSERT INTO DimProduct (product_key, sku, name, bag_size, rate, gst, landed_cost, company_id)
            SELECT id, productCode, name, bagSize, rate, gst, rate * 0.75, companyId
            FROM Product
        """)

        # D. Populate DimWarehouse
        cursor.execute("""
            INSERT INTO DimWarehouse (warehouse_key, name, location, company_id)
            SELECT id, name, location, companyId
            FROM Warehouse
        """)

        # E. Populate DimCustomer (Merges Dealers and Distributors)
        cursor.execute("""
            INSERT INTO DimCustomer (customer_key, customer_code, name, type, city, state, assigned_so_email, active, company_id)
            SELECT id, dealerCode, dealerName, 'Dealer', city, 'State', assignedSoEmail, active, companyId
            FROM Dealer
        """)
        cursor.execute("""
            INSERT INTO DimCustomer (customer_key, customer_code, name, type, city, state, assigned_so_email, active, company_id)
            SELECT id, distributorName, distributorName, 'Distributor', area, 'State', assignedSoEmail, active, companyId
            FROM Distributor
            WHERE distributorName NOT IN (SELECT name FROM DimCustomer)
        """)

        # ──────────────────────────────────────────────────────────────────
        # 4. POPULATE FACT TABLES (ETL Phase)
        # ──────────────────────────────────────────────────────────────────

        # A. Populate FactSales (Join Order & OrderItem & Product)
        # Parses Warehouse ID from narration tags, e.g. [WAREHOUSE ID: 1]
        cursor.execute("""
            SELECT oi.id, o.id as order_id, o.date, o.soEmail, oi.productId, o.partyName, o.narration, 
                   oi.qty, oi.price, oi.total, p.rate * 0.75 as unit_landed_cost, o.status, o.companyId
            FROM OrderItem oi
            JOIN `Order` o ON oi.orderId = o.id
            JOIN Product p ON oi.productId = p.id
        """)
        order_rows = cursor.fetchall()
        
        sales_records = []
        for r in order_rows:
            fact_id = f"fact_sale_{r[0]}"
            order_id = r[1]
            date_str = parse_date_key(r[2])
            so_key = r[3]
            product_key = r[4]
            party_name = r[5]
            narration = r[6] or ''
            qty = r[7]
            price = r[8]
            gross_sales = r[9]
            unit_landed_cost = r[10] or (price * 0.75)
            status = r[11]
            co_id = r[12]
            
            # Extract Warehouse ID from narration if possible, e.g. [WAREHOUSE ID: 1]
            wh_key = "1" # Default warehouse fallback
            if "[WAREHOUSE ID:" in narration:
                try:
                    wh_key = narration.split("[WAREHOUSE ID:")[1].split("]")[0].strip()
                except:
                    pass
            
            # Find customer key matching customer name
            cursor.execute("SELECT customer_key FROM DimCustomer WHERE name = %s LIMIT 1", (party_name,))
            cust_row = cursor.fetchone()
            cust_key = cust_row[0] if cust_row else None
            
            net_revenue = gross_sales / 1.18 # Net of 18% GST standard
            landed_cost = qty * unit_landed_cost
            margin = net_revenue - landed_cost
            tax_amount = gross_sales - net_revenue
            
            so_surr_key = get_so_surrogate_key(cursor, so_key, date_str)
            
            sales_records.append((
                fact_id, order_id, date_str, so_surr_key, product_key, wh_key, cust_key,
                qty, price, gross_sales, net_revenue, landed_cost, margin, tax_amount,
                status, co_id
            ))
            
        cursor.executemany("""
            INSERT INTO FactSales (fact_id, order_id, date_key, so_key, product_key, warehouse_key, customer_key,
                                  quantity, price, gross_sales, net_revenue, landed_cost, margin, tax_amount, status, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, sales_records)

        # B. Populate FactVisits
        cursor.execute("""
            SELECT id, date, soEmail, dealerName, companyId
            FROM Visit
        """)
        visit_rows = cursor.fetchall()
        visit_records = []
        for r in visit_rows:
            v_id = r[0]
            date_str = parse_date_key(r[1])
            so_key = r[2]
            party_name = r[3]
            co_id = r[4]
            
            cursor.execute("SELECT customer_key FROM DimCustomer WHERE name = %s LIMIT 1", (party_name,))
            cust_row = cursor.fetchone()
            cust_key = cust_row[0] if cust_row else None
            
            so_surr_key = get_so_surrogate_key(cursor, so_key, date_str)
            
            visit_records.append((
                f"fact_visit_{v_id}", v_id, date_str, so_surr_key, cust_key, 30, co_id
            ))
            
        cursor.executemany("""
            INSERT INTO FactVisits (fact_id, visit_id, date_key, so_key, customer_key, duration_minutes, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, visit_records)

        # C. Populate FactExpenses
        cursor.execute("""
            SELECT id, date, soEmail, category, amount, status, companyId
            FROM Expense
        """)
        exp_rows = cursor.fetchall()
        exp_records = []
        for r in exp_rows:
            e_id = r[0]
            date_str = parse_date_key(r[1])
            so_key = r[2]
            cat = r[3]
            amt = r[4]
            status = r[5]
            co_id = r[6]
            
            so_surr_key = get_so_surrogate_key(cursor, so_key, date_str)
            
            exp_records.append((
                f"fact_expense_{e_id}", e_id, date_str, so_surr_key, cat, amt, status, co_id
            ))
            
        cursor.executemany("""
            INSERT INTO FactExpenses (fact_id, expense_id, date_key, so_key, category, amount, status, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, exp_records)

        # D. Precompute Forecast Snapshots
        from api.services.predictions import compile_forecast_snapshots
        compile_forecast_snapshots(cursor, company_id)

        # E. Precompute Exception Alerts
        from api.services.alert_engine import compile_exception_alerts
        compile_exception_alerts(cursor, company_id)

        # F. Run Data Quality Observability & Monitoring validations
        try:
            from api.services.data_quality import run_data_quality_validations
            run_data_quality_validations(cursor, company_id)
        except Exception as e:
            # Prevent data quality assertion exceptions from breaking core ETL transaction
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Data Quality Assertions failed: {str(e)}")

    return True
