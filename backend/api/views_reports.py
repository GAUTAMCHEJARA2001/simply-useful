import datetime
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.models import Order, Orderitem, Product, Expense, Visit, Stocktransaction, Userwarehouseaccess, Dealer, Warehouse
from api.views import send_success, send_error, _get_company_id, _get_request_warehouse_ids, _compute_all_product_stocks


@api_view(['GET'])
def report_dashboard_kpis(request):
    company_id = _get_company_id(request)
    user_id = request.user.id
    has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
    assigned_wh_ids = []
    if has_wh_assignments and request.user.role == 'INVENTORY':
        assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
    wh_header = request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
    is_global_request = not wh_header or wh_header == 'GLOBAL' or wh_header == 'none'

    today = datetime.date.today()

    active_products = Product.objects.all()
    if company_id and request.user.role != 'SUPERADMIN':
        active_products = active_products.filter(companyid_id=company_id)
    if assigned_wh_ids and not is_global_request:
        active_products = active_products.filter(warehouseid_id__in=assigned_wh_ids)
    elif wh_header and not is_global_request:
        active_products = active_products.filter(warehouseid_id=wh_header)

    all_stocks = _compute_all_product_stocks(company_id, request=request)
    low_stock = sum(1 for s in all_stocks if s['currentStock'] <= s['minimumStock'])

    orders_qs = Order.objects.all()
    if company_id and request.user.role != 'SUPERADMIN':
        orders_qs = orders_qs.filter(companyid_id=company_id)
    if assigned_wh_ids and not is_global_request:
        orders_qs = orders_qs.filter(warehouseid_id__in=assigned_wh_ids)
    elif wh_header and not is_global_request:
        orders_qs = orders_qs.filter(warehouseid_id=wh_header)

    today_orders = orders_qs.filter(createdat__date=today)
    total_sales_today = sum(o.grandtotal or 0 for o in today_orders)
    orders_today_count = today_orders.count()

    month_orders = orders_qs.filter(createdat__year=today.year, createdat__month=today.month)
    total_sales_month = sum(o.grandtotal or 0 for o in month_orders)

    total_sales_overall = sum(o.grandtotal or 0 for o in orders_qs)
    total_orders_count = orders_qs.count()

    active_dealers = Dealer.objects.filter(companyid_id=company_id, active=True).count()
    active_visits = Visit.objects.filter(companyid_id=company_id, date__date=today).count()
    total_expenses = sum(e.amount or 0 for e in Expense.objects.filter(companyid_id=company_id))

    return send_success({
        'totalSalesToday': total_sales_today,
        'totalSalesOverall': total_sales_overall,
        'ordersTodayCount': orders_today_count,
        'totalOrdersCount': total_orders_count,
        'activeDealersCount': active_dealers,
        'activeProductsCount': active_products.count(),
        'lowStockAlertsCount': low_stock,
        'activeVisitsToday': active_visits,
        'totalExpenses': total_expenses
    }, 'KPIs fetched')

def MathRound(val):
    return round(float(val or 0.0), 2)

@api_view(['GET'])
def report_sales_summary(request):
    company_id = _get_company_id(request)
    orders = Order.objects.filter(companyid_id=company_id)

    target_wh_ids = _get_request_warehouse_ids(request)
    if target_wh_ids:
        orders = orders.filter(warehouseid_id__in=target_wh_ids)

    start_date = request.GET.get('startDate') or request.GET.get('start_date')
    end_date = request.GET.get('endDate') or request.GET.get('end_date')

    if start_date:
        orders = orders.filter(createdat__date__gte=start_date)
    if end_date:
        orders = orders.filter(createdat__date__lte=end_date)

    summary_map = {}
    for o in orders:
        if not o.createdat:
            continue
        date_str = o.createdat.strftime('%Y-%m-%d')
        amt = float(o.totalamount or 0)
        if date_str not in summary_map:
            summary_map[date_str] = {
                'date': date_str,
                'totalSales': 0.0,
                'totalOrders': 0,
                'cashSales': 0.0,
                'creditSales': 0.0
            }
        summary_map[date_str]['totalSales'] += amt
        summary_map[date_str]['totalOrders'] += 1
        if (o.paymentstatus or '').lower() == 'paid':
            summary_map[date_str]['cashSales'] += amt
        else:
            summary_map[date_str]['creditSales'] += amt

    result = []
    for d in sorted(summary_map.keys()):
        row = summary_map[d]
        row['totalSales'] = MathRound(row['totalSales'])
        row['cashSales'] = MathRound(row['cashSales'])
        row['creditSales'] = MathRound(row['creditSales'])
        result.append(row)

    return send_success(result, 'Sales summary generated')

@api_view(['GET'])
def report_low_stock(request):
    company_id = _get_company_id(request)
    all_stocks = _compute_all_product_stocks(company_id, request=request)
    low_stock_list = [s for s in all_stocks if s['currentStock'] <= s['minStock']]
    return send_success(low_stock_list, 'Low stock report fetched')

@api_view(['GET'])
def report_daily(request):
    company_id = _get_company_id(request)
    today = datetime.date.today()
    orders = Order.objects.filter(companyid_id=company_id, createdat__date=today)

    target_wh_ids = _get_request_warehouse_ids(request)
    if target_wh_ids:
        orders = orders.filter(warehouseid_id__in=target_wh_ids)

    daily_data = []
    for o in orders:
        daily_data.append({
            'orderId': o.orderid,
            'customer': o.dealerid.name if o.dealerid else 'Unknown',
            'amount': o.totalamount or 0,
            'status': o.status
        })

    return send_success(daily_data, 'Daily report fetched')

@api_view(['GET'])
def report_current_stock(request):
    company_id = _get_company_id(request)
    final_stock_list = _compute_all_product_stocks(company_id, request=request)
    return send_success(final_stock_list, 'Current stock fetched dynamically')

@api_view(['GET'])
def report_stock_ledger(request, pk):
    company_id = _get_company_id(request)
    target_wh_ids = _get_request_warehouse_ids(request)

    # Support warehouseId parameter from stock ledger popup filter
    wh_param = request.GET.get('warehouseId') or request.GET.get('warehouse_id') or request.GET.get('warehouse')
    if wh_param and wh_param != 'GLOBAL' and wh_param != 'all' and wh_param != 'none':
        target_wh_ids = [wh_param]

    product = Product.objects.filter(id=pk, companyid_id=company_id).first()
    if not product:
        # Fallback search by ID or product code across products
        product = Product.objects.filter(Q(id=pk) | Q(productcode=pk)).first()
        if not product:
            return send_success({'items': [], 'openingBalance': 0, 'currentStock': 0}, 'Product not found')

    start_date = request.GET.get('startDate') or request.GET.get('start_date') or request.GET.get('dateFrom') or request.GET.get('date_from')
    end_date = request.GET.get('endDate') or request.GET.get('end_date') or request.GET.get('dateTo') or request.GET.get('date_to')

    # 1. Fetch Stocktransaction entries
    st_qs = Stocktransaction.objects.filter(
        Q(productid_id=product.id) | Q(productid__productcode=product.productcode)
    ).exclude(
        reason__in=['PENDING_APPROVAL', 'REJECTED']
    ).exclude(is_deleted=True).exclude(referenceid__startswith='REV-')
    if company_id:
        st_qs = st_qs.filter(productid__companyid_id=company_id)
    if target_wh_ids:
        st_qs = st_qs.filter(warehouseid_id__in=target_wh_ids)

    st_txs = list(st_qs.select_related('warehouseid', 'productid'))

    # 2. Fetch Dispatchlogitem entries
    from api.models import Dispatchlogitem, Returnlogitem, Purchaseitem
    valid_order_statuses = ['Completed', 'Returned', 'Delivered', 'Dispatched', 'Partially Dispatched', 'Partially Returned', 'Approved']
    
    dispatch_items_qs = Dispatchlogitem.objects.filter(
        Q(productid_id=product.id) | Q(productid__productcode=product.productcode),
        dispatchlogid__orderid__status__in=valid_order_statuses
    )
    if company_id:
        dispatch_items_qs = dispatch_items_qs.filter(dispatchlogid__orderid__companyid_id=company_id)
    if target_wh_ids:
        dispatch_items_qs = dispatch_items_qs.filter(dispatchlogid__orderid__warehouseid_id__in=target_wh_ids)
    
    dispatch_items = list(dispatch_items_qs.select_related('dispatchlogid__orderid', 'dispatchlogid__orderid__warehouseid'))

    # 3. Fetch Returnlogitem entries
    return_items_qs = Returnlogitem.objects.filter(
        Q(productid_id=product.id) | Q(productid__productcode=product.productcode),
        returnlogid__orderid__status__in=valid_order_statuses
    )
    if company_id:
        return_items_qs = return_items_qs.filter(returnlogid__orderid__companyid_id=company_id)
    if target_wh_ids:
        return_items_qs = return_items_qs.filter(returnlogid__orderid__warehouseid_id__in=target_wh_ids)
    
    return_items = list(return_items_qs.select_related('returnlogid__orderid', 'returnlogid__orderid__warehouseid'))

    # 4. Fetch Purchaseitem entries
    purchase_items_qs = Purchaseitem.objects.filter(
        productname=product.name
    ).filter(
        purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED', 'Returned']
    )
    if company_id:
        purchase_items_qs = purchase_items_qs.filter(purchaseid__companyid_id=company_id)
    if target_wh_ids:
        purchase_items_qs = purchase_items_qs.filter(purchaseid__warehouseid_id__in=target_wh_ids)
    
    purchase_items = list(purchase_items_qs.select_related('purchaseid', 'purchaseid__warehouseid'))

    # Track doc numbers from Stocktransaction to prevent duplicates
    st_ref_ids = {str(t.referenceid) for t in st_txs if t.referenceid}

    events = []

    for t in st_txs:
        qty = float(t.quantity or 0)
        t_type = (t.transactiontype or '').upper()
        dt = t.createdat
        wh_name = t.warehouseid.name if (t.warehouseid and hasattr(t.warehouseid, 'name')) else 'Main Warehouse'

        in_qty = 0.0
        out_qty = 0.0

        if t_type == 'OPENING_STOCK':
            in_qty = qty
        elif t_type in ['PURCHASE', 'PRODUCTION', 'ADD_STOCK', 'RETURN_IN', 'IN']:
            in_qty = qty
        elif t_type in ['SALE', 'DISPATCH', 'CONSUMED', 'RETURN_OUT', 'OUT']:
            out_qty = abs(qty)
        elif t_type in ['ADJUSTMENT', 'MANUAL_ADJUSTMENT']:
            if qty >= 0:
                in_qty = qty
            else:
                out_qty = abs(qty)
        else:
            if qty >= 0:
                in_qty = qty
            else:
                out_qty = abs(qty)

        events.append({
            'id': str(t.id),
            'datetime': dt,
            'createdat': t.createdat,
            'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
            'type': t_type,
            'docNo': str(t.referenceid or '-'),
            'party': wh_name,
            'inQty': in_qty,
            'outQty': out_qty,
            'credit': in_qty,
            'debit': out_qty,
            'remarks': str(t.reason or '-')
        })

    for di in dispatch_items:
        dl = di.dispatchlogid
        order = dl.orderid if dl else None
        order_id = order.orderid if order else '—'
        if str(order_id) in st_ref_ids or str(dl.id) in st_ref_ids:
            continue
        dt = dl.dispatchdate if (dl and dl.dispatchdate) else (dl.createdat if dl else None)
        wh = order.assigned_warehouse if (order and hasattr(order, 'assigned_warehouse')) else None
        wh_name = wh.name if (wh and hasattr(wh, 'name')) else (order.dispatchwarehouse if order else 'Main Warehouse')
        qty = float(di.qty or 0)
        if qty > 0:
            events.append({
                'id': f"disp_{di.id}",
                'datetime': dt,
                'createdat': dl.createdat if dl else None,
                'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
                'type': 'DISPATCH',
                'docNo': str(order_id),
                'party': wh_name,
                'inQty': 0.0,
                'outQty': qty,
                'credit': 0.0,
                'debit': qty,
                'remarks': f"Dispatched Order (Inv: {dl.invoicenumber or '-'}, Veh: {dl.vehiclenumber or '-'})"
            })

    for ri in return_items:
        rl = ri.returnlogid
        order = rl.orderid if rl else None
        order_id = order.orderid if order else '—'
        if str(order_id) in st_ref_ids or str(rl.id) in st_ref_ids:
            continue
        dt = rl.returndate if (rl and rl.returndate) else (rl.createdat if rl else None)
        wh = order.assigned_warehouse if (order and hasattr(order, 'assigned_warehouse')) else None
        wh_name = wh.name if (wh and hasattr(wh, 'name')) else 'Main Warehouse'
        qty = float(ri.qty or 0)
        if qty > 0:
            events.append({
                'id': f"ret_{ri.id}",
                'datetime': dt,
                'createdat': rl.createdat if rl else None,
                'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
                'type': 'RETURN_IN',
                'docNo': str(order_id),
                'party': wh_name,
                'inQty': qty,
                'outQty': 0.0,
                'credit': qty,
                'debit': 0.0,
                'remarks': f"Sales Return ({rl.remarks or '-'})"
            })

    for pi in purchase_items:
        p = pi.purchaseid
        if not p:
            continue
        is_return = p.status == 'Returned'
        dt = p.date if p.date else p.createdat
        wh = p.warehouseid
        wh_name = wh.name if (wh and hasattr(wh, 'name')) else 'Main Warehouse'
        qty = float(pi.qty or 0)
        if qty > 0:
            if is_return:
                events.append({
                    'id': f"pur_ret_{pi.id}",
                    'datetime': dt,
                    'createdat': p.createdat,
                    'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
                    'type': 'RETURN_OUT',
                    'docNo': str(p.purchaseid or '-'),
                    'party': p.vendorname or '-',
                    'inQty': 0.0,
                    'outQty': qty,
                    'credit': 0.0,
                    'debit': qty,
                    'remarks': f"Purchase Return ({p.challannumber or '-'})"
                })
            else:
                events.append({
                    'id': f"pur_{pi.id}",
                    'datetime': dt,
                    'createdat': p.createdat,
                    'date_str': dt.strftime('%Y-%m-%d %H:%M') if dt else '',
                    'type': 'PURCHASE',
                    'docNo': str(p.purchaseid or '-'),
                    'party': p.vendorname or '-',
                    'inQty': qty,
                    'outQty': 0.0,
                    'credit': qty,
                    'debit': 0.0,
                    'remarks': f"Purchase (Challan: {p.challannumber or '-'})"
                })

    # Sort chronologically by (primary date, exact database insertion timestamp)
    events.sort(key=lambda x: (x['datetime'] or timezone.now(), x['createdat'] or timezone.now()))

    # Compute opening balance (opening stock + net transactions prior to start_date)
    opening_balance = float(product.openingstock or 0.0)
    filtered_events = []

    s_dt = None
    e_dt = None
    if start_date:
        try:
            s_dt = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        except Exception:
            pass
    if end_date:
        try:
            e_dt = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
        except Exception:
            pass

    for ev in events:
        ev_date = ev['datetime'].date() if (ev['datetime'] and hasattr(ev['datetime'], 'date')) else None
        if s_dt and ev_date and ev_date < s_dt:
            opening_balance += (ev['inQty'] - ev['outQty'])
        elif e_dt and ev_date and ev_date > e_dt:
            continue
        else:
            filtered_events.append(ev)

    running_balance = opening_balance
    ledger_rows = []

    # Always prepend Opening Balance as Row #1 in the Stock Ledger table
    ob_date_str = start_date if start_date else (filtered_events[0]['date_str'] if filtered_events else timezone.now().strftime('%Y-%m-%d'))
    ledger_rows.append({
        'id': 'ob_start_row',
        'date': ob_date_str,
        'type': 'OPENING_STOCK',
        'transactionType': 'OPENING_STOCK',
        'docNo': 'OB',
        'referenceId': 'OB',
        'party': 'Opening Balance',
        'inQty': opening_balance if opening_balance > 0 else 0.0,
        'outQty': 0.0,
        'credit': opening_balance if opening_balance > 0 else 0.0,
        'debit': 0.0,
        'balance': opening_balance,
        'remarks': 'Opening Balance'
    })

    for ev in filtered_events:
        # Skip duplicate OPENING_STOCK if it matches the initial opening row
        if ev['type'] == 'OPENING_STOCK':
            continue
        running_balance += (ev['inQty'] - ev['outQty'])
        ledger_rows.append({
            'id': ev['id'],
            'date': ev['date_str'],
            'type': ev['type'],
            'transactionType': ev['type'],
            'docNo': ev['docNo'],
            'referenceId': ev['docNo'],
            'party': ev['party'],
            'inQty': ev['inQty'],
            'outQty': ev['outQty'],
            'credit': ev['credit'],
            'debit': ev['debit'],
            'balance': running_balance,
            'remarks': ev['remarks']
        })

    res_payload = {
        'items': ledger_rows,
        'openingBalance': opening_balance,
        'currentStock': running_balance
    }
    return send_success(res_payload, 'Stock ledger retrieved successfully')

@api_view(['GET'])
def report_aggregate_stock(request):
    company_id = _get_company_id(request)
    stocks = _compute_all_product_stocks(company_id, request=request)

    aggregate = []
    for s in stocks:
        qty = float(s['currentStock'] or 0)
        if qty > 0 or (request.GET.get('showZero') == 'true'):
            aggregate.append({
                'productId': s['productId'],
                'productName': s['productName'],
                'sku': s['sku'],
                'categoryName': s['categoryName'],
                'quantity': qty,
                'rate': s['rate']
            })
    return send_success(aggregate, 'Aggregate stocks fetched')

@api_view(['GET'])
def report_global_inventory(request):
    company_id = _get_company_id(request)
    stocks = _compute_all_product_stocks(company_id, request=request)
    inventory_data = []
    for s in stocks:
        qty = float(s['currentStock'] or 0)
        if qty != 0:
            inventory_data.append({
                'productId': s['productId'],
                'productName': s['productName'],
                'sku': s['sku'],
                'categoryName': s['categoryName'],
                'quantity': qty,
                'rate': s['rate']
            })
    return send_success(inventory_data, 'Global inventory fetched')

@api_view(['GET'])
def report_stocks_by_warehouse(request):
    from api.models import Warehouse
    company_id = _get_company_id(request)
    warehouses = Warehouse.objects.all()
    if company_id:
        warehouses = warehouses.filter(companyid_id=company_id)
        
    wh_map = {}
    for wh in warehouses:
        wh_stocks = _compute_all_product_stocks(company_id=company_id, target_wh_ids=[wh.id])
        stock_by_prod = {}
        for s in wh_stocks:
            stock_by_prod[s['productId']] = float(s['currentStock'] or 0.0)
            if s.get('sku'):
                stock_by_prod[s['sku']] = float(s['currentStock'] or 0.0)
            if s.get('productName'):
                stock_by_prod[s['productName']] = float(s['currentStock'] or 0.0)
        wh_map[str(wh.id)] = stock_by_prod
        if wh.name:
            wh_map[wh.name] = stock_by_prod

    return send_success(wh_map, 'Stocks by warehouse fetched successfully')
