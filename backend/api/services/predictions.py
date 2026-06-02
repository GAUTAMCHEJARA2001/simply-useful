from django.db import connection
import datetime
from django.utils import timezone

def compile_forecast_snapshots(cursor, company_id=None):
    """
    Called during the ETL compile phase.
    Calculates rolling 90-day demand averages for all SKUs
    and writes predictive snapshot entries into ForecastSnapshot.
    This ensures statistical forecasting metrics are precomputed
    for instant retrieval at scale.
    """
    # 1. Clear old snapshots to avoid duplicate bloat
    cursor.execute("DELETE FROM ForecastSnapshot")
    
    # 2. Get all products from DimProduct
    cursor.execute("SELECT product_key, sku, rate, company_id FROM DimProduct")
    products = cursor.fetchall()
    
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    date_90_days_ago = (datetime.date.today() - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
    
    snapshots = []
    for prod_key, sku, rate, co_id in products:
        # Calculate daily velocity over last 90 days
        cursor.execute("""
            SELECT SUM(quantity) 
            FROM FactSales 
            WHERE product_key = %s AND status = 'Completed' AND date_key >= %s
        """, (prod_key, date_90_days_ago))
        sum_qty_row = cursor.fetchone()
        sum_qty = sum_qty_row[0] or 0
        
        daily_velocity = sum_qty / 90.0
        # If no sales recorded, fallback to standard industry baseline
        if daily_velocity == 0:
            daily_velocity = 0.25 
            
        # Project 30, 60, and 90 days milestones
        milestones = [
            (30, 0.85),  # 30-day forecast, 85% confidence score
            (60, 0.75),  # 60-day forecast, 75% confidence score
            (90, 0.65)   # 90-day forecast, 65% confidence score
        ]
        
        for days, confidence in milestones:
            predicted_qty = round(daily_velocity * days, 1)
            forecast_date = (datetime.date.today() + datetime.timedelta(days=days)).strftime('%Y-%m-%d')
            snap_id = f"snap_{sku}_{days}_{today_str}"
            
            snapshots.append((
                snap_id, sku, forecast_date, predicted_qty, "MA_90", confidence, today_str, co_id
            ))
            
    if snapshots:
        cursor.executemany("""
            INSERT INTO ForecastSnapshot (id, sku, forecast_date, predicted_quantity, model_version, confidence_score, created_at, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, snapshots)

def get_predictions_dashboard(company_id=None):
    """
    API Query Engine: Retrieves forecasts, stockout risks, and CRM projections.
    Uses centralized metric functions from Star Schema fact tables.
    """
    data = {
        "demand_forecasts": [],
        "stockout_risks": [],
        "crm_weighted_pipeline": {
            "total_raw_value": 0.0,
            "total_weighted_value": 0.0,
            "stages": []
        }
    }
    
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    date_30_days_ago = (datetime.date.today() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
    
    with connection.cursor() as cursor:
        # A. Demand Forecasts from materialized snapshots
        cursor.execute("""
            SELECT sku, forecast_date, predicted_quantity, confidence_score 
            FROM ForecastSnapshot 
            ORDER BY sku, forecast_date ASC
        """)
        forecast_rows = cursor.fetchall()
        for r in forecast_rows:
            data["demand_forecasts"].append({
                "sku": r[0],
                "forecast_date": r[1],
                "predicted_quantity": r[2],
                "confidence_score": r[3]
            })
            
        # B. Stockout Risk Velocity countdown
        cursor.execute("SELECT product_key, sku, name, rate FROM DimProduct")
        products = cursor.fetchall()
        
        for prod_key, sku, name, rate in products:
            # Query operational stock count from Inventory table
            cursor.execute("SELECT SUM(quantity), AVG(avgCost) FROM Inventory WHERE productId = %s", (prod_key,))
            inv_row = cursor.fetchone()
            current_stock = inv_row[0] if inv_row and inv_row[0] is not None else 0.0
            avg_cost = inv_row[1] if inv_row and inv_row[1] is not None else 0.0
            
            # Query daily sales velocity over rolling 30-day window
            cursor.execute("""
                SELECT SUM(quantity) 
                FROM FactSales 
                WHERE product_key = %s AND status = 'Completed' AND date_key >= %s
            """, (prod_key, date_30_days_ago))
            sales_row = cursor.fetchone()
            sales_30_days = sales_row[0] or 0.0
            
            daily_velocity = round(sales_30_days / 30.0, 2)
            
            # Prevent division by zero, set minimum baseline
            calc_velocity = daily_velocity if daily_velocity > 0 else 0.1
            risk_days = round(current_stock / calc_velocity, 1)
            
            # Determine safety stocks: standard threshold set to 50 bags baseline
            safety_stock_threshold = 50.0
            
            status = "HEALTHY"
            if risk_days < 7:
                status = "CRITICAL"
            elif risk_days < 15:
                status = "WARNING"
                
            data["stockout_risks"].append({
                "sku": sku,
                "name": name,
                "current_stock": current_stock,
                "daily_velocity": daily_velocity,
                "risk_days": risk_days,
                "safety_stock_threshold": safety_stock_threshold,
                "status": status
            })
            
        # C. CRM Probability weighted pipeline
        stage_weights = {
            "NEW": 0.10,
            "CONTACTED": 0.30,
            "PROPOSAL": 0.60,
            "NEGOTIATION": 0.80,
            "WON": 1.00,
            "LOST": 0.00
        }
        
        cursor.execute("""
            SELECT status, SUM(value), COUNT(id) 
            FROM Lead 
            WHERE isDeleted = 0 
            GROUP BY status
        """)
        crm_rows = cursor.fetchall()
        
        total_raw = 0.0
        total_weighted = 0.0
        stages_data = []
        
        # Enforce presence of all stages for visual dashboard structure consistency
        stage_sums = {k: 0.0 for k in stage_weights.keys()}
        stage_counts = {k: 0 for k in stage_weights.keys()}
        
        for status, sum_val, count in crm_rows:
            status_upper = (status or '').upper()
            if status_upper in stage_sums:
                stage_sums[status_upper] = float(sum_val or 0.0)
                stage_counts[status_upper] = count
                
        for stage, raw_val in stage_sums.items():
            weight = stage_weights[stage]
            weighted_val = raw_val * weight
            count = stage_counts[stage]
            
            total_raw += raw_val
            total_weighted += weighted_val
            
            stages_data.append({
                "stage": stage,
                "display_name": stage.title(),
                "lead_count": count,
                "raw_value": round(raw_val, 2),
                "probability": weight,
                "weighted_value": round(weighted_val, 2)
            })
            
        data["crm_weighted_pipeline"]["total_raw_value"] = round(total_raw, 2)
        data["crm_weighted_pipeline"]["total_weighted_value"] = round(total_weighted, 2)
        data["crm_weighted_pipeline"]["stages"] = stages_data
        
    return data
