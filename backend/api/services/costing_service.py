"""
Costing and Inventory Valuation Service.
Calculates FIFO-based and Weighted Average (WAC) costs of goods per warehouse and globally,
and computes accurate BOM (Bill of Materials) price lists based on raw material purchase rates.
"""
from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone
from api.models import Product, Purchaseitem, Bom, Bomitem, Company


def compute_product_warehouse_costs(company_id=None, warehouse_ids=None):
    """
    Computes FIFO unit cost, Weighted Average Cost (WAC), and current inventory valuation
    for each product in the specified warehouse(s) (or company-wide if warehouse_ids is None).
    
    Returns:
        tuple: (cost_map_by_id, cost_map_by_name)
    """
    # 1. Fetch Company Stock Valuation Method (FIFO vs WEIGHTED_AVG)
    stock_method = 'FIFO'
    if company_id:
        company = Company.objects.filter(id=company_id).first()
        if company and company.stockmethod:
            stock_method = company.stockmethod.upper()

    # 2. Fetch all products
    prods_qs = Product.objects.select_related('unitid', 'categoryid').all()
    if company_id:
        prods_qs = prods_qs.filter(companyid_id=company_id)
    
    products = list(prods_qs)
    prod_id_to_obj = {p.id: p for p in products}
    name_to_prod_id = {p.name.strip().lower(): p.id for p in products if p.name}
    sku_to_prod_id = {p.productcode.strip().lower(): p.id for p in products if p.productcode}

    # 3. Compute current stocks using existing stock aggregator
    from api.views import _compute_all_product_stocks
    stock_list = _compute_all_product_stocks(company_id=company_id, target_wh_ids=warehouse_ids)
    stock_by_id = {item['productId']: float(item.get('currentStock', 0.0)) for item in stock_list}

    # 4. Fetch all active purchase items (excluding returns)
    pur_qs = Purchaseitem.objects.filter(
        purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED', 'Partially Returned', 'Returned']
    ).exclude(
        purchaseid__purchaseid__startswith='PRET-'
    ).exclude(
        purchaseid__narration__contains='[ORIGINAL PURCHASE:'
    ).select_related('purchaseid')

    if warehouse_ids:
        pur_qs = pur_qs.filter(purchaseid__warehouseid_id__in=warehouse_ids)

    # Order by purchase date descending for FIFO remaining stock evaluation
    pur_qs = pur_qs.order_by('-purchaseid__date', '-purchaseid__createdat', '-id')

    # Group purchases by product id
    purchases_by_prod_id = {p.id: [] for p in products}
    for item in pur_qs:
        pid = item.productid_id
        if not pid and item.productname:
            pid = name_to_prod_id.get(item.productname.strip().lower())
        if pid and pid in purchases_by_prod_id:
            purchases_by_prod_id[pid].append({
                'qty': float(item.qty or 0),
                'rate': float(item.rate or 0.0),
                'date': item.purchaseid.date if item.purchaseid else None
            })

    # 5. Compute WAC and FIFO for each product
    cost_map_by_id = {}
    cost_map_by_name = {}

    for p in products:
        p_id = p.id
        base_master_rate = float(p.rate or 0.0)
        opening_qty = float(p.openingstock or 0.0) if (not warehouse_ids or getattr(p, 'warehouseid_id', None) in warehouse_ids) else 0.0
        opening_rate = base_master_rate
        current_stock = stock_by_id.get(p_id, 0.0)
        
        prod_purchases = purchases_by_prod_id.get(p_id, [])

        # Total inflow calculation for Weighted Average Cost (WAC)
        valid_purchases = [item for item in prod_purchases if item['qty'] > 0 and item['rate'] > 0]
        
        total_inflow_qty = sum(item['qty'] for item in valid_purchases)
        total_inflow_val = sum(item['qty'] * item['rate'] for item in valid_purchases)

        # Include opening stock in WAC if present and has rate
        if opening_qty > 0 and opening_rate > 0:
            total_inflow_qty += opening_qty
            total_inflow_val += (opening_qty * opening_rate)

        if total_inflow_qty > 0 and total_inflow_val > 0:
            wac_cost = round(total_inflow_val / total_inflow_qty, 4)
        else:
            wac_cost = base_master_rate

        # Latest purchase rate
        latest_purchase_rate = valid_purchases[0]['rate'] if valid_purchases else base_master_rate

        # FIFO Calculation of remaining inventory (Current Stock Q)
        if current_stock <= 0:
            # If out of stock, cost equals latest purchase or WAC or base rate
            fifo_cost = latest_purchase_rate or wac_cost or base_master_rate
            cost_source = 'LATEST_PURCHASE' if valid_purchases else 'MASTER_RATE'
        else:
            needed_qty = current_stock
            fifo_val = 0.0
            
            # Match against most recent purchase layers first
            for batch in valid_purchases:
                take_qty = min(needed_qty, batch['qty'])
                fifo_val += (take_qty * batch['rate'])
                needed_qty -= take_qty
                if needed_qty <= 0.00001:
                    break
            
            # If remaining stock extends beyond recorded purchases, use opening stock rate
            if needed_qty > 0.00001:
                fifo_val += (needed_qty * opening_rate)
            
            fifo_cost = round(fifo_val / current_stock, 4)
            cost_source = 'FIFO_PURCHASE_LAYERS' if valid_purchases else 'MASTER_RATE'

        # Select effective unit cost based on company policy
        if stock_method == 'WEIGHTED_AVG':
            effective_cost = wac_cost
        else:
            effective_cost = fifo_cost

        # Guard against zero cost if master rate is available
        if effective_cost <= 0.0001 and base_master_rate > 0:
            effective_cost = base_master_rate
            fifo_cost = base_master_rate
            wac_cost = base_master_rate
            cost_source = 'MASTER_RATE_FALLBACK'

        val_data = {
            'productId': p_id,
            'sku': p.productcode,
            'name': p.name,
            'unit': p.unitid.name if p.unitid else '—',
            'currentStock': current_stock,
            'baseRate': base_master_rate,
            'fifoCost': round(fifo_cost, 2),
            'weightedAvgCost': round(wac_cost, 2),
            'effectiveCost': round(effective_cost, 2),
            'latestPurchaseRate': round(latest_purchase_rate, 2),
            'stockValue': round(current_stock * effective_cost, 2),
            'costSource': cost_source,
            'stockMethod': stock_method
        }

        cost_map_by_id[p_id] = val_data
        if p.name:
            cost_map_by_name[p.name.strip().lower()] = val_data

    return cost_map_by_id, cost_map_by_name


def compute_bom_cost_breakdown(bom, valuation_by_id=None, valuation_by_name=None, warehouse_ids=None, company_id=None):
    """
    Computes the accurate price list & manufacturing cost for a single BOM (Bill of Materials)
    based on the warehouse's FIFO / Weighted Average raw material costs.
    """
    if valuation_by_id is None or valuation_by_name is None:
        cid = company_id or (bom.companyid_id if hasattr(bom, 'companyid_id') else None)
        whs = warehouse_ids or ([bom.warehouseid_id] if bom.warehouseid_id else None)
        valuation_by_id, valuation_by_name = compute_product_warehouse_costs(company_id=cid, warehouse_ids=whs)

    output_qty = float(bom.outputquantity or 1.0)
    if output_qty <= 0:
        output_qty = 1.0

    total_batch_cost = 0.0
    items_breakdown = []

    for b_item in bom.bomitem_set.all():
        mat_name = b_item.materialname.strip()
        mat_lower = mat_name.lower()
        
        # Look up product valuation by name or sku
        cost_info = valuation_by_name.get(mat_lower)
        if not cost_info:
            # Try partial search or productcode
            matched_prod = Product.objects.filter(
                Q(name__iexact=mat_name) | Q(productcode__iexact=mat_name)
            ).first()
            if matched_prod and matched_prod.id in valuation_by_id:
                cost_info = valuation_by_id[matched_prod.id]

        if cost_info:
            unit_cost = cost_info['effectiveCost']
            fifo_cost = cost_info['fifoCost']
            wac_cost = cost_info['weightedAvgCost']
            cost_src = cost_info['costSource']
            prod_id = cost_info['productId']
            current_stk = cost_info['currentStock']
        else:
            unit_cost = 0.0
            fifo_cost = 0.0
            wac_cost = 0.0
            cost_src = 'UNMAPPED'
            prod_id = None
            current_stk = 0.0

        item_qty = float(b_item.qty or 0.0)
        line_cost = round(item_qty * unit_cost, 2)
        total_batch_cost += line_cost

        items_breakdown.append({
            'id': b_item.id,
            'productId': prod_id,
            'materialName': mat_name,
            'quantity': item_qty,
            'unit': b_item.unit or 'KG',
            'unitCost': round(unit_cost, 2),
            'fifoCost': round(fifo_cost, 2),
            'wacCost': round(wac_cost, 2),
            'lineCost': line_cost,
            'costSource': cost_src,
            'currentStock': current_stk
        })

    total_batch_cost = round(total_batch_cost, 2)
    unit_cost = round(total_batch_cost / output_qty, 2)

    # Finished product master rate (Base Selling Rate)
    finished_prod = Product.objects.filter(
        Q(productcode=bom.productcode) | Q(name=bom.name)
    ).first()

    selling_rate = round(float(finished_prod.rate or 0.0), 2) if finished_prod else 0.0
    gst_percent = float(finished_prod.gst if finished_prod and finished_prod.gst is not None else 18.0)
    gross_margin = round(selling_rate - unit_cost, 2)
    margin_pct = round((gross_margin / selling_rate * 100), 1) if selling_rate > 0 else 0.0

    return {
        'id': bom.id,
        'bomId': bom.id,
        'bomName': bom.name,
        'productCode': bom.productcode,
        'productName': finished_prod.name if finished_prod else bom.name,
        'productId': finished_prod.id if finished_prod else None,
        'outputQuantity': output_qty,
        'unit': finished_prod.unitid.name if finished_prod and finished_prod.unitid else 'BAG',
        'status': bom.status,
        'assignedWarehouse': bom.warehouseid_id,
        'assignedWarehouseName': bom.warehouseid.name if bom.warehouseid else 'All Warehouses',
        'totalBatchCost': total_batch_cost,
        'unitCost': unit_cost,
        'sellingRate': selling_rate,
        'gstPercent': gst_percent,
        'grossMargin': gross_margin,
        'marginPct': margin_pct,
        'itemCount': len(items_breakdown),
        'items': items_breakdown
    }


def get_all_bom_valuations(company_id=None, warehouse_ids=None):
    """
    Returns accurate price list & manufacturing cost for all approved BOMs.
    """
    val_by_id, val_by_name = compute_product_warehouse_costs(company_id=company_id, warehouse_ids=warehouse_ids)
    
    bom_qs = Bom.objects.filter(companyid_id=company_id) if company_id else Bom.objects.all()
    if warehouse_ids:
        bom_qs = bom_qs.filter(Q(warehouseid_id__in=warehouse_ids) | Q(warehouseid__isnull=True))

    results = []
    for bom in bom_qs.prefetch_related('bomitem_set', 'warehouseid'):
        data = compute_bom_cost_breakdown(
            bom,
            valuation_by_id=val_by_id,
            valuation_by_name=val_by_name,
            warehouse_ids=warehouse_ids,
            company_id=company_id
        )
        results.append(data)

    return results
