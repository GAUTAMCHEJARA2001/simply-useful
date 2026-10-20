"""
Purchases and Purchase Orders Controllers.
Part of Enterprise Domain Modularization.
"""
import datetime
import json
import uuid
from decimal import Decimal
from django.db import models, connection, transaction, IntegrityError
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Purchase, Purchaseitem, Supplier, Product, Purchaseorder,
    Purchaseorderitem, Company, Warehouse, Stocktransaction, StockLedgerEntry,
    Userwarehouseaccess
)
from api.serializers import PurchaseorderSerializer, PurchaseorderitemSerializer
from api.db_router import get_tenant_model_cross_db
from api.utils_gst import calculate_gst_split
from api.views import send_success, send_error, _get_company_id, resolve_warehouse

@api_view(['GET', 'POST'])
def transaction_purchases(request):
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder, Company, Warehouse
    from django.db import IntegrityError, transaction
    from django.utils import timezone
    import uuid

    def next_purchase_number():
        prefix = f'PUR-{timezone.now().year}-'
        max_sequence = 0
        for purchase_id in Purchase.objects.filter(purchaseid__startswith=prefix).values_list('purchaseid', flat=True):
            suffix = str(purchase_id).removeprefix(prefix)
            if suffix.isdigit():
                max_sequence = max(max_sequence, int(suffix))
        sequence = max_sequence + 1
        candidate = f'{prefix}{sequence:05d}'
        while Purchase.objects.filter(purchaseid=candidate).exists():
            sequence += 1
            candidate = f'{prefix}{sequence:05d}'
        return candidate

    def as_float(value, field_name):
        if value in (None, ''):
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            raise ValueError(f'{field_name} must be a number')
    if request.method == 'GET':
        from api.models import Userwarehouseaccess, Purchase, Product
        user_id = request.user.id
        has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
        assigned_wh_ids = []
        if has_wh_assignments and request.user.role in ('INVENTORY', 'PRODUCTION'):
            assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
        wh_header = request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_header and wh_header not in ('GLOBAL', 'none', 'undefined'):
            try:
                assigned_wh_ids = [int(wh_header)]
            except (ValueError, TypeError):
                pass
        all_purchases = list(Purchase.objects.prefetch_related('purchaseitem_set', 'purchaseorderid').all())
        if assigned_wh_ids:
            all_purchases = [p for p in all_purchases if p.warehouseid_id in assigned_wh_ids]
        from api.utils_gst import calculate_gst_split
        
        company_id = _get_company_id(request)
        company = Company.objects.filter(id=company_id).first()
        company_gst = getattr(company, 'gst_number', '') or ''
        
        data = []
        for p in all_purchases:
            items_data = []
            supplier_gst = getattr(p.supplierid, 'gst_number', '') if p.supplierid else ''
            
            total_igst = 0
            total_cgst = 0
            total_sgst = 0
            tax_type = "IGST"
            
            for item in p.purchaseitem_set.all():
                prod_id = ''
                tax_p = 18.0
                try:
                    prod = Product.objects.filter(name=item.productname).first()
                    if prod:
                        prod_id = prod.id
                        tax_p = getattr(prod, 'gst', 18.0)
                except Exception:
                    pass
                
                # Base amount without tax? item.total is with or without tax? Usually it's qty * rate (base amount). Let's use item.total as base.
                split = calculate_gst_split(company_gst, supplier_gst, item.total, tax_p)
                total_igst += split['igst']
                total_cgst += split['cgst']
                total_sgst += split['sgst']
                tax_type = split['type']
                
                item_dict = {'id': item.id, 'productName': item.productname, 'productId': prod_id, 'qty': item.qty, 'quantity': item.qty, 'rate': item.rate, 'total': item.total, 'tax_percent': tax_p, 'tax_split': split}
                items_data.append(item_dict)
                
            tax_summary = {
                'igst': total_igst,
                'cgst': total_cgst,
                'sgst': total_sgst,
                'type': tax_type
            }
                
            data.append({'id': p.id, 'purchaseId': p.purchaseid, 'date': p.date, 'vendorName': p.vendorname, 'supplierName': p.vendorname, 'supplier': {'name': p.vendorname}, 'supplier_id': p.supplierid_id, 'supplierId': p.supplierid_id, 'warehouse_id': p.warehouseid_id or '', 'warehouseId': p.warehouseid_id or '', 'grandTotal': p.grandtotal, 'netAmount': p.grandtotal, 'total_amount': p.grandtotal, 'status': p.status, 'companyId': p.companyid_id, 'createdAt': p.createdat, 'updatedAt': p.updatedat, 'challanNumber': p.challannumber or '', 'vehicleNumber': p.vehiclenumber or '', 'vehicle_number': p.vehiclenumber or '', 'totalTax': p.totaltax or 0.0, 'purchaseOrderId': p.purchaseorderid_id or '', 'purchase_order_id': p.purchaseorderid_id or '', 'purchaseOrderNumber': p.purchaseorderid.ponumber if p.purchaseorderid else '', 'items': items_data, 'lineItems': items_data, 'taxSummary': tax_summary})
        return send_success(data, 'Purchases fetched')
    elif request.method == 'POST':
        data = request.data.copy()
        now = timezone.now()
        company_id = _get_company_id(request)  # Handles JWT (.companyId) and Django model (.companyid_id)
        if not Company.objects.filter(id=company_id).exists():
            fallback_company = Company.objects.first()
            if not fallback_company:
                return send_error('No company is configured for purchases', 400)
            company_id = fallback_company.id
        data['companyId'] = company_id
        supplier_id = data.get('supplier_id') or data.get('supplierId')
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                pass
        vendor_name = supplier.name if supplier else data.get('vendorName') or data.get('supplierName') or 'Walk-in Vendor'
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId')
        warehouse = None
        if warehouse_id:
            try:
                warehouse = resolve_warehouse(warehouse_id)
            except Exception:
                pass
        pur_num = next_purchase_number()
        pur_id = 'pur_' + uuid.uuid4().hex[:20]
        line_items_data = data.get('lineItems') or data.get('items') or []
        if not isinstance(line_items_data, list) or not line_items_data:
            return send_error('At least one purchase line item is required', 400)
        grand_total = 0.0
        total_tax = 0.0
        try:
            for it in line_items_data:
                qty = as_float(it.get('quantity') or it.get('qty'), 'Quantity')
                rate = as_float(it.get('rate'), 'Rate')
                tax_p = as_float(it.get('tax_percent'), 'Tax percent')
                item_subtotal = qty * rate
                item_tax = item_subtotal * (tax_p / 100)
                total_tax += item_tax
                grand_total += item_subtotal + item_tax
        except ValueError as exc:
            return send_error(str(exc), 400)
        purchase_order_id = data.get('purchase_order_id') or data.get('purchaseOrderId')
        purchase_order = None
        if purchase_order_id:
            try:
                purchase_order = Purchaseorder.objects.get(id=purchase_order_id)
            except Purchaseorder.DoesNotExist:
                pass
        purchase_date = now
        req_date = data.get('date')
        if req_date:
            try:
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_dt = parse_datetime(req_date)
                if parsed_dt:
                    if timezone.is_naive(parsed_dt):
                        parsed_dt = timezone.make_aware(parsed_dt, timezone.get_current_timezone())
                    purchase_date = parsed_dt
                else:
                    parsed_d = parse_date(req_date)
                    if parsed_d:
                        import datetime
                        purchase_date = timezone.make_aware(datetime.datetime.combine(parsed_d, datetime.time.min), timezone.get_current_timezone())
            except Exception:
                pass
        try:
            with transaction.atomic():
                purchase_obj = Purchase.objects.create(id=pur_id, purchaseid=pur_num, date=purchase_date, vendorname=vendor_name, grandtotal=grand_total, status=data.get('status') or 'Completed', companyid_id=company_id, createdat=now, updatedat=now, supplierid=supplier, challannumber=data.get('challanNumber') or data.get('challan_number') or data.get('challan'), vehiclenumber=str(data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle') or '').strip().upper(), totaltax=total_tax, purchaseorderid=purchase_order, warehouseid=warehouse)
                items_data = []
                for it in line_items_data:
                    item_id = 'pui_' + uuid.uuid4().hex[:19]
                    qty = int(as_float(it.get('quantity') or it.get('qty'), 'Quantity'))
                    rate = as_float(it.get('rate'), 'Rate')
                    tax_p = as_float(it.get('tax_percent'), 'Tax percent')
                    item_total = qty * rate * (1 + tax_p / 100)
                    product_name = 'Unknown Product'
                    prod = None
                    prod_id = it.get('productId') or it.get('product_id')
                    if prod_id:
                        try:
                            prod = Product.objects.get(id=prod_id)
                            product_name = prod.name
                        except Product.DoesNotExist:
                            pass
                    if not prod and it.get('productName'):
                        prod = Product.objects.filter(name__iexact=it.get('productName').strip()).first()
                        if prod:
                            product_name = prod.name

                    Purchaseitem.objects.create(
                        id=item_id,
                        purchaseid=purchase_obj,
                        productname=product_name,
                        qty=qty,
                        rate=rate,
                        total=item_total,
                        productid=prod
                    )

                    if prod and warehouse:
                        try:
                            from api.services.ledger_service import record_stock_ledger_entry
                            record_stock_ledger_entry(
                                product_id=prod.id,
                                warehouse_id=warehouse.id,
                                company_id=company_id,
                                voucher_type='PURCHASE_RECEIPT',
                                quantity_change=qty,
                                voucher_id=pur_id,
                                voucher_number=pur_num,
                                unit_cost=Decimal(str(rate)),
                                narration=f"Purchase receipt from {vendor_name}",
                                posting_date=purchase_date,
                                created_by=request.user
                            )
                        except Exception as sle_err:
                            print(f"[PURCHASE] Warning: Could not record stock ledger entry: {sle_err}")

                    items_data.append({'id': item_id, 'productName': product_name, 'productId': prod.id if prod else prod_id, 'qty': qty, 'quantity': qty, 'rate': rate, 'total': item_total, 'tax_percent': tax_p})
        except IntegrityError as e:
            print(f'[PURCHASE CREATE] IntegrityError: {e}')
            return send_error('Purchase could not be recorded because related data is out of sync. Please refresh and try again.', 409)
        except Exception as e:
            import traceback
            print(f'[PURCHASE CREATE] Unexpected error: {traceback.format_exc()}')
            return send_error(f'Purchase save failed: {str(e)}', 500)
        if purchase_order:
            try:
                ordered_qty = sum((item.quantity for item in purchase_order.purchaseorderitem_set.all()))
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=purchase_order).values_list('id', flat=True)
                received_qty = sum((item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids)))
                if received_qty >= ordered_qty:
                    purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    purchase_order.status = 'ORDERED'
                purchase_order.save()
            except Exception:
                pass
        res_data = {'id': purchase_obj.id, 'purchaseId': purchase_obj.purchaseid, 'date': purchase_obj.date, 'vendorName': purchase_obj.vendorname, 'supplierName': purchase_obj.vendorname, 'supplier': {'name': purchase_obj.vendorname}, 'supplier_id': purchase_obj.supplierid_id, 'supplierId': purchase_obj.supplierid_id, 'warehouse_id': purchase_obj.warehouseid_id or '', 'warehouseId': purchase_obj.warehouseid_id or '', 'grandTotal': purchase_obj.grandtotal, 'netAmount': purchase_obj.grandtotal, 'total_amount': purchase_obj.grandtotal, 'status': purchase_obj.status, 'companyId': purchase_obj.companyid_id, 'createdAt': purchase_obj.createdat, 'updatedAt': purchase_obj.updatedat, 'challanNumber': purchase_obj.challannumber or '', 'vehicleNumber': purchase_obj.vehiclenumber or '', 'vehicle_number': purchase_obj.vehiclenumber or '', 'totalTax': purchase_obj.totaltax or 0.0, 'purchaseOrderId': purchase_obj.purchaseorderid_id or '', 'purchase_order_id': purchase_obj.purchaseorderid_id or '', 'purchaseOrderNumber': purchase_obj.purchaseorderid.ponumber if purchase_obj.purchaseorderid else '', 'items': items_data, 'lineItems': items_data}
        return send_success(res_data, 'Purchase recorded', 201)

@api_view(['PUT', 'DELETE'])
def transaction_purchase_detail(request, pk):
    from api.models import Purchase, Purchaseitem, Supplier, Product, Purchaseorder, Warehouse
    from django.utils import timezone
    import uuid
    try:
        purchase_obj = get_tenant_model_cross_db(Purchase, pk, 'purchaseitem_set')
    except Purchase.DoesNotExist:
        return send_error('Purchase not found', 404)
    if request.method == 'PUT':
        data = request.data.copy()
        now = timezone.now()
        supplier_id = data.get('supplier_id') or data.get('supplierId')
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                pass
        vendor_name = supplier.name if supplier else data.get('vendorName') or data.get('supplierName') or purchase_obj.vendorname
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId')
        warehouse = None
        if warehouse_id:
            try:
                warehouse = resolve_warehouse(warehouse_id)
            except Exception:
                pass
        line_items_data = data.get('lineItems', [])
        grand_total = 0.0
        total_tax = 0.0
        for it in line_items_data:
            qty = float(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            item_subtotal = qty * rate
            item_tax = item_subtotal * (tax_p / 100)
            total_tax += item_tax
            grand_total += item_subtotal + item_tax
        purchase_order_id = data.get('purchase_order_id') or data.get('purchaseOrderId')
        old_purchase_order = purchase_obj.purchaseorderid
        purchase_order = None
        if purchase_order_id:
            try:
                purchase_order = Purchaseorder.objects.get(id=purchase_order_id)
            except Purchaseorder.DoesNotExist:
                pass
        req_date = data.get('date')
        if req_date:
            try:
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_dt = parse_datetime(req_date)
                if parsed_dt:
                    if timezone.is_naive(parsed_dt):
                        parsed_dt = timezone.make_aware(parsed_dt, timezone.get_current_timezone())
                    purchase_obj.date = parsed_dt
                else:
                    parsed_d = parse_date(req_date)
                    if parsed_d:
                        import datetime
                        purchase_obj.date = timezone.make_aware(datetime.datetime.combine(parsed_d, datetime.time.min), timezone.get_current_timezone())
            except Exception:
                pass
        purchase_obj.vendorname = vendor_name
        purchase_obj.grandtotal = grand_total
        if 'status' in data:
            purchase_obj.status = data.get('status')
        purchase_obj.updatedat = now
        purchase_obj.supplierid = supplier
        purchase_obj.challannumber = data.get('challanNumber') or data.get('challan_number') or data.get('challan')
        purchase_obj.vehiclenumber = str(data.get('vehicleNumber') or data.get('vehicle_number') or data.get('vehicle') or '').strip().upper()
        purchase_obj.totaltax = total_tax
        purchase_obj.purchaseorderid = purchase_order
        purchase_obj.warehouseid = warehouse
        purchase_obj.save()
        Purchaseitem.objects.filter(purchaseid=purchase_obj).delete()
        items_data = []
        for it in line_items_data:
            item_id = 'pui_' + uuid.uuid4().hex[:19]
            qty = int(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or 0)
            item_total = qty * rate * (1 + tax_p / 100)
            product_name = 'Unknown Product'
            prod_id = it.get('productId') or it.get('product_id')
            if prod_id:
                try:
                    prod = Product.objects.get(id=prod_id)
                    product_name = prod.name
                except Product.DoesNotExist:
                    pass
            Purchaseitem.objects.create(id=item_id, purchaseid=purchase_obj, productname=product_name, qty=qty, rate=rate, total=item_total)
            if prod_id:
                pass
            items_data.append({'id': item_id, 'productName': product_name, 'productId': prod_id, 'qty': qty, 'quantity': qty, 'rate': rate, 'total': item_total, 'tax_percent': tax_p})
        if purchase_order:
            try:
                ordered_qty = sum((item.quantity for item in purchase_order.purchaseorderitem_set.all()))
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=purchase_order).values_list('id', flat=True)
                received_qty = sum((item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids)))
                if received_qty >= ordered_qty:
                    purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    purchase_order.status = 'ORDERED'
                purchase_order.save()
            except Exception:
                pass
        if old_purchase_order and old_purchase_order != purchase_order:
            try:
                ordered_qty = sum((item.quantity for item in old_purchase_order.purchaseorderitem_set.all()))
                linked_purchase_ids = Purchase.objects.filter(purchaseorderid=old_purchase_order).values_list('id', flat=True)
                received_qty = sum((item.qty for item in Purchaseitem.objects.filter(purchaseid_id__in=linked_purchase_ids)))
                if received_qty >= ordered_qty:
                    old_purchase_order.status = 'RECEIVED'
                elif received_qty > 0:
                    old_purchase_order.status = 'PARTIALLY_RECEIVED'
                else:
                    old_purchase_order.status = 'ORDERED'
                old_purchase_order.save()
            except Exception:
                pass
        res_data = {'id': purchase_obj.id, 'purchaseId': purchase_obj.purchaseid, 'date': purchase_obj.date, 'vendorName': purchase_obj.vendorname, 'supplierName': purchase_obj.vendorname, 'supplier': {'name': purchase_obj.vendorname}, 'supplier_id': purchase_obj.supplierid_id, 'supplierId': purchase_obj.supplierid_id, 'warehouse_id': purchase_obj.warehouseid_id or '', 'warehouseId': purchase_obj.warehouseid_id or '', 'grandTotal': purchase_obj.grandtotal, 'netAmount': purchase_obj.grandtotal, 'total_amount': purchase_obj.grandtotal, 'status': purchase_obj.status, 'companyId': purchase_obj.companyid_id, 'createdAt': purchase_obj.createdat, 'updatedAt': purchase_obj.updatedat, 'challanNumber': purchase_obj.challannumber or '', 'vehicleNumber': purchase_obj.vehiclenumber or '', 'vehicle_number': purchase_obj.vehiclenumber or '', 'totalTax': purchase_obj.totaltax or 0.0, 'purchaseOrderId': purchase_obj.purchaseorderid_id or '', 'purchase_order_id': purchase_obj.purchaseorderid_id or '', 'purchaseOrderNumber': purchase_obj.purchaseorderid.ponumber if purchase_obj.purchaseorderid else '', 'items': items_data, 'lineItems': items_data}
        return send_success(res_data, 'Purchase updated')
    elif request.method == 'DELETE':
        items = list(Purchaseitem.objects.filter(purchaseid=purchase_obj))
        Purchaseitem.objects.filter(purchaseid=purchase_obj).delete()
        purchase_obj.delete()
        for it in items:
            try:
                prod = Product.objects.filter(name=it.productname).first()
                if prod:
                    pass
            except Exception:
                pass
        return send_success(None, 'Purchase deleted')



@api_view(['GET', 'POST'])
def transaction_purchase_orders(request):
    from api.models import Purchaseorder, Purchaseorderitem
    from api.serializers import PurchaseorderSerializer
    from django.utils import timezone
    import uuid
    if request.method == 'GET':
        from api.models import Userwarehouseaccess, Warehouse
        user_id = request.user.id
        has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
        assigned_wh_ids = []
        if has_wh_assignments and request.user.role == 'INVENTORY':
            assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
        all_orders = list(Purchaseorder.objects.prefetch_related('purchaseorderitem_set'))
        all_orders_serialized = PurchaseorderSerializer(all_orders, many=True, context={'skip_stock': True}).data
        return send_success(all_orders_serialized, 'Purchase orders fetched')
    elif request.method == 'POST':
        data = request.data.copy()
        now = timezone.now()
        from api.views import resolve_warehouse
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
        wh = resolve_warehouse(wh_id)
        if not wh:
            return send_error('Invalid warehouse', 400)
        company_id = _get_company_id(request)  # Handles JWT (.companyId) and Django model (.companyid_id)
        data['companyId'] = company_id
        po_count = Purchaseorder.objects.count() + 1
        po_num = f'PO-{now.year}-{po_count:05d}'
        po_id = 'po_' + uuid.uuid4().hex[:20]
        supplier_id = data.get('supplier_id') or data.get('supplierId')
        expected_date = data.get('expected_date') or data.get('expectedDate')
        remarks = data.get('remarks')
        status = data.get('status') or 'Pending'
        items_data = data.get('items', [])
        net_amount = 0.0
        total_tax = 0.0
        for it in items_data:
            qty = float(it.get('quantity') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or it.get('taxPercent') or 0)
            line_total = qty * rate * (1 + tax_p / 100)
            net_amount += line_total
            total_tax += qty * rate * tax_p / 100
        po_obj = Purchaseorder.objects.create(id=po_id, ponumber=po_num, date=now, expecteddate=expected_date or None, supplierid_id=supplier_id, warehouseid=wh, netamount=net_amount, totaltax=total_tax, status=status, remarks=remarks, companyid_id=company_id, createdat=now, updatedat=now)
        for it in items_data:
            item_id = 'poi_' + uuid.uuid4().hex[:19]
            qty = int(it.get('quantity') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or it.get('taxPercent') or 0)
            line_total = qty * rate * (1 + tax_p / 100)
            Purchaseorderitem.objects.create(id=item_id, purchaseorderid=po_obj, productid_id=it.get('product_id') or it.get('productId'), productname=it.get('product_name') or it.get('productName') or '', quantity=qty, rate=rate, tax_percent=tax_p, linetotal=line_total, remark=it.get('remark'))
        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, 'Purchase order created successfully', 201)

@api_view(['GET'])
def transaction_purchase_order_items(request, pk):
    from api.models import Purchaseorderitem, Purchaseorder
    from api.serializers import PurchaseorderitemSerializer
    try:
        from api.db_router import get_tenant_model_cross_db
        po = get_tenant_model_cross_db(Purchaseorder, pk)
        items = Purchaseorderitem.objects.filter(purchaseorderid_id=pk)
    except Exception:
        items = []
    serializer = PurchaseorderitemSerializer(items, many=True, context={'skip_stock': True})
    return send_success(serializer.data, 'Purchase order items fetched')

@api_view(['GET', 'PUT', 'DELETE'])
def transaction_purchase_order_detail(request, pk):
    from api.models import Purchaseorder, Purchaseorderitem
    from api.serializers import PurchaseorderSerializer
    from django.utils import timezone
    from django.db import transaction
    import uuid
    from api.db_router import get_tenant_model_cross_db
    try:
        po_obj = get_tenant_model_cross_db(Purchaseorder, pk, 'purchaseorderitem_set')
    except Purchaseorder.DoesNotExist:
        return send_error('Purchase order not found', 404)
    db = po_obj._state.db
    if request.method == 'GET':
        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, 'Purchase order fetched')
    elif request.method == 'PUT':
        data = request.data.copy()
        now = timezone.now()
        if 'status' in data and len(data) == 1:
            po_obj.status = data.get('status')
            po_obj.updatedat = now
            po_obj.save()
            serializer = PurchaseorderSerializer(po_obj)
            return send_success(serializer.data, 'Purchase order status updated successfully')
        supplier_id = data.get('supplier_id') or data.get('supplierId') or po_obj.supplierid_id
        warehouse_id = data.get('warehouse_id') or data.get('warehouseId') or po_obj.warehouseid_id
        expected_date = data.get('expected_date') or data.get('expectedDate') or po_obj.expecteddate
        remarks = data.get('remarks') or po_obj.remarks
        status = data.get('status') or po_obj.status
        items_data = data.get('items', [])
        net_amount = 0.0
        total_tax = 0.0
        for it in items_data:
            qty = float(it.get('quantity') or it.get('qty') or 0)
            rate = float(it.get('rate') or 0)
            tax_p = float(it.get('tax_percent') or it.get('taxPercent') or 0)
            line_total = qty * rate * (1 + tax_p / 100)
            net_amount += line_total
            total_tax += qty * rate * tax_p / 100
        with transaction.atomic():
            po_obj.supplierid_id = supplier_id
            po_obj.warehouseid_id = warehouse_id
            po_obj.expecteddate = expected_date or None
            po_obj.netamount = net_amount
            po_obj.totaltax = total_tax
            po_obj.status = status
            po_obj.remarks = remarks
            po_obj.updatedat = now
            po_obj.save()
            Purchaseorderitem.objects.filter(purchaseorderid=po_obj).delete()
            for it in items_data:
                item_id = 'poi_' + uuid.uuid4().hex[:19]
                qty = int(it.get('quantity') or it.get('qty') or 0)
                rate = float(it.get('rate') or 0)
                tax_p = float(it.get('tax_percent') or it.get('taxPercent') or 0)
                line_total = qty * rate * (1 + tax_p / 100)
                Purchaseorderitem.objects.create(id=item_id, purchaseorderid=po_obj, productid_id=it.get('product_id') or it.get('productId'), productname=it.get('product_name') or it.get('productName') or '', quantity=qty, rate=rate, tax_percent=tax_p, linetotal=line_total, remark=it.get('remark'))
        serializer = PurchaseorderSerializer(po_obj)
        return send_success(serializer.data, 'Purchase order updated successfully')
    elif request.method == 'DELETE':
        with transaction.atomic():
            Purchaseorderitem.objects.filter(purchaseorderid=po_obj).delete()
            po_obj.delete()
        return send_success(None, 'Purchase order deleted successfully')

