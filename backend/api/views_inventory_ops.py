"""
Inventory Operations Controllers: Production, Raw Materials, Adjustments, Returns.
Part of Enterprise Domain Modularization.
"""
import datetime
import json
import uuid
from decimal import Decimal
from django.db import models, connection, transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

import re
import sys
import io
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND

from api.models import (
    Company, User, Product, Warehouse, Order, Orderitem,
    Stocktransaction, Bom, Bomitem, Returnlog, Returnlogitem, StockLedgerEntry,
    Purchase, Purchaseitem, Userwarehouseaccess
)
from api.serializers import OrderSerializer
from api.db_router import get_tenant_model_cross_db
from api.services.ledger_service import record_stock_ledger_entry
from api.views import (
    send_success, send_error, _get_company_id, _extract_order_tag,
    _append_order_tags, _get_clean_narration_helper, resolve_warehouse
)

def resolve_product_for_db(prod_id, target_db=None):
    if not prod_id:
        return None
    from api.models import Product
    try:
        return Product.objects.get(id=prod_id)
    except Product.DoesNotExist:
        pass
    try:
        p = Product.objects.get(productcode=prod_id)
        if p:
            return p
    except (Product.DoesNotExist, Exception):
        pass
    return None

def check_negative_raw_materials(prod_id, yield_qty, wh_id, custom_items=None, existing_prod_id=None):
    from api.models import Product, Warehouse, Bom, Bomitem
    from django.db import connections
    wh = resolve_warehouse(wh_id)
    consumptions = []
    if custom_items is not None and isinstance(custom_items, list):
        for item in custom_items:
            item_prod_id = item.get('productId') or item.get('product_id')
            try:
                item_qty = float(item.get('quantity') or item.get('qty') or 0)
            except (ValueError, TypeError):
                item_qty = 0.0
            if item_prod_id and item_qty > 0:
                p = resolve_product_for_db(item_prod_id)
                if p:
                    consumptions.append({'product_id': p.id, 'name': p.name, 'qty': item_qty})
    else:
        try:
            prod = resolve_product_for_db(prod_id)
            if prod:
                bom = Bom.objects.filter(productcode=prod.productcode, status='APPROVED').first()
                if not bom:
                    bom = Bom.objects.filter(name=prod.name, status='APPROVED').first()
                if bom:
                    bom_items = Bomitem.objects.filter(bomid=bom)
                    for b_item in bom_items:
                        m_prod = Product.objects.filter(name=b_item.materialname).first()
                        if m_prod:
                            consumptions.append({'product_id': m_prod.id, 'name': m_prod.name, 'qty': b_item.qty * yield_qty})
        except Exception:
            pass
    negatives = []
    if not consumptions:
        return []
    
    from api.models import Product, Purchaseitem, Orderitem, Stocktransaction
    from django.db.models import Sum
    pids = [c['product_id'] for c in consumptions]
    prods = Product.objects.filter(id__in=pids)
    
    stock_map = {}
    name_to_id = {p.name: p.id for p in prods}
    for p in prods:
        stock_map[p.id] = float(p.openingstock or 0)
        
    purchases = Purchaseitem.objects.filter(
        purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED'],
        productname__in=[p.name for p in prods]
    ).values('productname').annotate(total=Sum('qty'))
    for row in purchases:
        pid = name_to_id.get(row['productname'])
        if pid: stock_map[pid] += float(row['total'] or 0)
        
    purchase_ret = Purchaseitem.objects.filter(
        purchaseid__status='Returned',
        productname__in=[p.name for p in prods]
    ).values('productname').annotate(total=Sum('qty'))
    for row in purchase_ret:
        pid = name_to_id.get(row['productname'])
        if pid: stock_map[pid] -= float(row['total'] or 0)
        
    sales = Orderitem.objects.filter(
        orderid__status='Completed',
        productid_id__in=pids
    ).values('productid_id').annotate(total=Sum('qty'))
    for row in sales:
        pid = row['productid_id']
        stock_map[pid] -= float(row['total'] or 0)
        
    sales_ret = Orderitem.objects.filter(
        orderid__status='Returned',
        productid_id__in=pids
    ).values('productid_id').annotate(total=Sum('qty'))
    for row in sales_ret:
        pid = row['productid_id']
        stock_map[pid] += float(row['total'] or 0)
        
    st_aggs = Stocktransaction.objects.exclude(
        reason__in=['PENDING_APPROVAL', 'REJECTED']
    ).exclude(is_deleted=True).exclude(referenceid__startswith='REV-').exclude(
        transactiontype__in=['SALE', 'DISPATCH']
    ).filter(productid_id__in=pids).values('productid_id').annotate(total=Sum('quantity'))
    for row in st_aggs:
        pid = row['productid_id']
        stock_map[pid] += float(row['total'] or 0)

    for c in consumptions:
        pid = c['product_id']
        name = c['name']
        consuming_qty = c['qty']
        current_stock = stock_map.get(pid, 0.0)
        
        # When editing an existing production, credit back consumption from this production
        # that was previously deducted in stock_map (i.e. not deleted, not pending approval, not rejected)
        old_consumed_credited = 0.0
        if existing_prod_id:
            old_consumed_txs = Stocktransaction.objects.filter(
                referenceid=existing_prod_id,
                transactiontype='CONSUMED',
                productid_id=pid,
                is_deleted=False
            ).exclude(reason__in=['PENDING_APPROVAL', 'REJECTED'])
            old_qty_sum = old_consumed_txs.aggregate(total=Sum('quantity'))['total'] or 0.0
            old_consumed_credited = abs(float(old_qty_sum))

        effective_stock = current_stock + old_consumed_credited
        new_stock = effective_stock - consuming_qty
        if new_stock < -0.001:
            negatives.append({
                'productId': pid,
                'name': name,
                'currentStock': round(effective_stock, 2),
                'consuming': round(consuming_qty, 2),
                'deficit': round(abs(new_stock), 2)
            })
    return negatives

@api_view(['GET'])
@permission_classes([AllowAny])
def fix_old_productions(request):
    from django.core.management import call_command
    import sys
    from io import StringIO
    
    out = StringIO()
    try:
        call_command('migrate', stdout=out)
        return send_success({'output': out.getvalue()}, 'Migrations applied successfully on Render')
    except Exception as e:
        return send_error(f'Migration failed: {str(e)}', 500)

@api_view(['GET', 'POST'])
def transaction_productions(request):
    from api.models import Stocktransaction, Product, Warehouse, Userwarehouseaccess
    import uuid
    from django.utils import timezone
    from django.db import transaction
    user_id = request.user.id
    has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
    assigned_wh_ids = []
    if has_wh_assignments and request.user.role in ('INVENTORY', 'PRODUCTION'):
        assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
    company_id = _get_company_id(request)
    if request.method == 'GET':
        qs = Stocktransaction.objects.filter(transactiontype='PRODUCTION').select_related('productid', 'warehouseid', 'created_by', 'approved_by', 'deleted_by').order_by('-createdat')
        if company_id and request.user.role != 'SUPERADMIN':
            qs = qs.filter(productid__companyid_id=company_id)
        wh_header = request.headers.get('X-Warehouse-Id') or request.headers.get('X-Warehouse-ID') or request.headers.get('x-warehouse-id')
        if wh_header and wh_header not in ('GLOBAL', 'none', 'undefined'):
            qs = qs.filter(warehouseid_id=wh_header)
        elif assigned_wh_ids:
            qs = qs.filter(warehouseid_id__in=assigned_wh_ids)
        rows = []
        for st in qs:
            st_status = 'Pending' if st.reason == 'PENDING_APPROVAL' else 'Rejected' if st.reason == 'REJECTED' else 'Approved'
            wh_id = st.warehouseid_id if st.warehouseid else None
            wh_name = st.warehouseid.name if st.warehouseid else 'Unknown'
            rows.append({
                'id': st.id,
                'productId': st.productid.id if st.productid else None,
                'productCode': st.productid.productcode if st.productid else None,
                'finishedProductName': st.productid.name if st.productid else '—',
                'warehouseId': wh_id,
                'warehouseName': wh_name,
                'quantityProduced': st.quantity,
                'batches': st.batches or 1.0,
                'expectedQuantity': st.expected_quantity,
                'status': 'Deleted' if st.is_deleted else st_status,
                'createdAt': st.createdat.isoformat() if st.createdat else None,
                'createdBy': (st.created_by.name or st.created_by.email) if st.created_by else None,
                'approvedBy': (st.approved_by.name or st.approved_by.email) if st.approved_by else None,
                'deletedBy': (st.deleted_by.name or st.deleted_by.email) if st.deleted_by else None,
                'deleteReason': st.delete_reason,
                'isDeleted': st.is_deleted
            })
        return send_success(rows, 'Productions fetched')
    elif request.method == 'POST':
        data = request.data.copy()
        prod_id = data.get('productId') or data.get('product_id')
        qty_produced = float(data.get('quantity') or data.get('quantity_produced') or 0)
        batches = float(data.get('batches') or 1.0)
        expected_quantity = float(data.get('expectedQuantity') or data.get('expected_quantity') or 0)
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
            
        if assigned_wh_ids and wh_id not in assigned_wh_ids:
            return Response({'success': False, 'message': 'You are not authorized to create productions in this warehouse.'}, status=status.HTTP_403_FORBIDDEN)
            
        wh = resolve_warehouse(wh_id)
        if not wh:
            return Response({'success': False, 'message': 'Invalid warehouse'}, status=status.HTTP_400_BAD_REQUEST)
        st_id = 'st_' + uuid.uuid4().hex[:20]
        
        req_date = data.get('date') or data.get('createdAt')
        if req_date:
            if len(req_date) == 10:
                req_date += 'T00:00:00Z'
            now = req_date
        else:
            now = timezone.now()
            
        product = resolve_product_for_db(prod_id)
        if not product:
            return Response({'success': False, 'message': 'Product not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        allow_deficit = bool(data.get('allow_deficit') or data.get('allow_negative') or data.get('force'))
        negatives = check_negative_raw_materials(prod_id, qty_produced, wh_id, data.get('items'), None)
        if negatives and not allow_deficit:
            return Response({'success': False, 'error_type': 'NEGATIVE_RAW_MATERIALS', 'message': 'Some raw materials will go negative.', 'data': negatives}, status=status.HTTP_400_BAD_REQUEST)
            
        user_role = (getattr(request.user, 'role', '') or '').upper()
        is_admin = getattr(request.user, 'is_superuser', False) or user_role in ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'VP')
        st_reason = 'APPROVED' if is_admin else 'PENDING_APPROVAL'
        
        Stocktransaction.objects.create(
            id=st_id, productid=product, warehouseid_id=wh.id, transactiontype='PRODUCTION', 
            quantity=qty_produced, batches=batches, expected_quantity=expected_quantity,
            referenceid='PROD', reason=st_reason, createdat=now, created_by_id=request.user.id,
            approved_by_id=request.user.id if is_admin else None
        )
        custom_items = data.get('items')
        if custom_items is not None and isinstance(custom_items, list):
            prod_ids = [item.get('productId') or item.get('product_id') for item in custom_items if (item.get('productId') or item.get('product_id'))]
            fetched_prods = Product.objects.filter(id__in=prod_ids)
            prod_map = {str(p.id): p for p in fetched_prods}

            st_creates = []
            for item in custom_items:
                item_prod_id = item.get('productId') or item.get('product_id')
                try:
                    item_qty = float(item.get('quantity') or item.get('qty') or 0)
                except (ValueError, TypeError):
                    item_qty = 0.0
                if item_prod_id and item_qty > 0:
                    item_prod = prod_map.get(str(item_prod_id))
                    if item_prod:
                        st_creates.append(Stocktransaction(
                            id='st_' + uuid.uuid4().hex[:20], 
                            productid=item_prod, 
                            warehouseid_id=wh.id, 
                            transactiontype='CONSUMED', 
                            quantity=-item_qty, 
                            referenceid=st_id, 
                            reason=st_reason, 
                            createdat=now
                        ))
            if st_creates:
                Stocktransaction.objects.bulk_create(st_creates)
        return send_success({'id': st_id, **data}, 'Production recorded')

@api_view(['GET'])
def transaction_production_materials(request, pk):
    from api.models import Stocktransaction, Product, Warehouse
    materials = []
    sts = Stocktransaction.objects.filter(referenceid=pk, transactiontype='CONSUMED').prefetch_related('productid', 'productid__unitid')
    for st in sts:
        materials.append({'productId': st.productid.id if st.productid else st.productid_id, 'productName': st.productid.name if st.productid else 'Unknown', 'quantity': abs(st.quantity), 'unit': st.productid.unitid.name if st.productid and st.productid.unitid else 'KG'})
    return send_success(materials, 'Production materials fetched')

@api_view(['PUT', 'DELETE'])
def transaction_productions_detail(request, pk):
    from api.models import Stocktransaction, Product, Warehouse, Bom, Bomitem
    from django.db import transaction
    from django.db.models import Q
    import uuid
    from django.utils import timezone
    if request.method == 'PUT':
        data = request.data.copy()
        prod_id = data.get('productId') or data.get('product_id')
        qty_produced = float(data.get('quantity') or data.get('quantity_produced') or 0)
        batches = float(data.get('batches') or 1.0)
        expected_quantity = float(data.get('expectedQuantity') or data.get('expected_quantity') or 0)
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
        wh = resolve_warehouse(wh_id)
        if not wh:
            return Response({'success': False, 'message': 'Invalid warehouse'}, status=status.HTTP_400_BAD_REQUEST)
        prod = resolve_product_for_db(prod_id)
        if not prod:
            return Response({'success': False, 'message': 'Product not found'}, status=status.HTTP_400_BAD_REQUEST)
        user_role = (getattr(request.user, 'role', '') or '').upper()
        is_admin = getattr(request.user, 'is_superuser', False) or user_role in ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'VP')
        allow_deficit = bool(data.get('allow_deficit') or data.get('allow_negative') or data.get('force'))
        negatives = check_negative_raw_materials(prod_id, qty_produced, wh_id, data.get('items'), pk)
        if negatives and not allow_deficit:
            return Response({'success': False, 'error_type': 'NEGATIVE_RAW_MATERIALS', 'message': 'Some raw materials will go negative.', 'data': negatives}, status=status.HTTP_400_BAD_REQUEST)
        custom_date = data.get('date')
        if custom_date:
            if len(str(custom_date)) <= 10:
                now_str = timezone.datetime.strptime(str(custom_date), '%Y-%m-%d').replace(hour=12)
                now_str = timezone.make_aware(now_str) if timezone.is_naive(now_str) else now_str
            else:
                now_str = timezone.datetime.fromisoformat(str(custom_date).replace('Z', '+00:00'))
        else:
            now_str = timezone.now()
        old_product_ids = set()
        new_product_ids = {prod.id}
        with transaction.atomic():
            sts = Stocktransaction.objects.filter(Q(id=pk) | Q(referenceid=pk))
            old_product_ids.update(sts.values_list('productid_id', flat=True))
            
            main_st = sts.filter(id=pk, transactiontype='PRODUCTION').first() or sts.filter(id=pk).first() or sts.filter(transactiontype='PRODUCTION').first()
            if not main_st:
                main_st = Stocktransaction.objects.filter(id=pk).first()
            if not main_st:
                return Response({'success': False, 'message': 'Production record not found'}, status=status.HTTP_404_NOT_FOUND)

            main_st.productid = prod
            main_st.warehouseid_id = wh.id
            main_st.quantity = qty_produced
            main_st.batches = batches
            main_st.expected_quantity = expected_quantity
            user_role = (getattr(request.user, 'role', '') or '').upper()
            is_admin = getattr(request.user, 'is_superuser', False) or user_role in ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'VP')
            if is_admin:
                main_st.reason = 'APPROVED'
                main_st.approved_by_id = request.user.id
            main_st.save()

            # Delete old consumed transactions for this production run
            Stocktransaction.objects.filter(
                Q(referenceid=main_st.id) | Q(referenceid=pk),
                transactiontype='CONSUMED'
            ).delete()

            custom_items = data.get('items')
            st_reason = main_st.reason or ('APPROVED' if is_admin else 'PENDING_APPROVAL')
            if custom_items is not None and isinstance(custom_items, list):
                for item in custom_items:
                    item_prod_id = item.get('productId') or item.get('product_id')
                    try:
                        item_qty = float(item.get('quantity') or item.get('qty') or 0)
                    except (ValueError, TypeError):
                        item_qty = 0.0
                    if item_prod_id and item_qty > 0:
                        item_prod = resolve_product_for_db(item_prod_id)
                        if item_prod:
                            Stocktransaction.objects.create(
                                id='st_' + uuid.uuid4().hex[:20],
                                productid=item_prod,
                                warehouseid_id=wh.id,
                                transactiontype='CONSUMED',
                                quantity=-item_qty,
                                referenceid=main_st.id,
                                reason=st_reason,
                                createdat=now_str
                            )
                            new_product_ids.add(item_prod.id)
            else:
                try:
                    bom = Bom.objects.filter(productcode=prod.productcode, status='APPROVED').first()
                    if not bom:
                        bom = Bom.objects.filter(name=prod.name, status='APPROVED').first()
                    if bom:
                        for b_item in Bomitem.objects.filter(bomid=bom):
                            m_prod = Product.objects.filter(name=b_item.materialname).first()
                            if m_prod:
                                Stocktransaction.objects.create(
                                    id='st_' + uuid.uuid4().hex[:20],
                                    productid=m_prod,
                                    warehouseid_id=wh.id,
                                    transactiontype='CONSUMED',
                                    quantity=-(float(b_item.qty or 0) * batches),
                                    referenceid=main_st.id,
                                    reason=st_reason,
                                    createdat=now_str
                                )
                                new_product_ids.add(m_prod.id)
                except Exception as e:
                    print('Error updating BOM consumption:', e)

            for p_id in old_product_ids | new_product_ids:
                if p_id:
                    pass

        return send_success({
            'id': main_st.id,
            'productId': prod.id,
            'productCode': prod.productcode,
            'finishedProductName': prod.name,
            'warehouseId': wh.id,
            'warehouseName': wh.name,
            'quantityProduced': qty_produced,
            'batches': batches,
            'expectedQuantity': expected_quantity,
            'date': custom_date
        }, 'Production updated successfully')
    elif request.method == 'DELETE':
        from django.db.models import Q
        
        if request.user.role == 'PRODUCTION':
            return Response({'success': False, 'message': 'Production managers cannot delete production entries.'}, status=status.HTTP_403_FORBIDDEN)
            
        reason = request.data.get('reason')
        if not reason:
            return Response({'success': False, 'message': 'Deletion reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        sts = Stocktransaction.objects.filter(Q(id=pk) | Q(referenceid=pk))
        if sts.exists():
            product_ids = set(sts.values_list('productid_id', flat=True))
            with transaction.atomic():
                sts.update(is_deleted=True, deleted_by_id=request.user.id, delete_reason=reason)
                
            for p_id in product_ids:
                if p_id:
                    pass
        return send_success(None, 'Production run deleted successfully')

@api_view(['GET', 'POST'])
def transaction_adjustments(request):
    from api.models import Stocktransaction, Product, Warehouse, Userwarehouseaccess
    import uuid
    from django.utils import timezone
    from django.db import transaction
    user_id = request.user.id
    has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
    assigned_wh_ids = []
    if has_wh_assignments and request.user.role == 'INVENTORY':
        assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
    if request.method == 'GET':
        qs = Stocktransaction.objects.filter(transactiontype='ADJUSTMENT').exclude(referenceid__startswith='REV-').select_related('productid', 'warehouseid').order_by('-createdat')
        if assigned_wh_ids:
            qs = qs.filter(warehouseid_id__in=assigned_wh_ids)
        rows = []
        for st in qs:
            rows.append({
                'id': st.id,
                'productId': st.productid.id if st.productid else None,
                'productName': st.productid.name if st.productid else '—',
                'warehouseId': st.warehouseid_id if st.warehouseid else None,
                'warehouseName': st.warehouseid.name if st.warehouseid else 'Unknown',
                'quantityChange': st.quantity,
                'reason': st.reason,
                'createdAt': st.createdat.isoformat() if st.createdat else None
            })
        return send_success(rows, 'Adjustments fetched')
    elif request.method == 'POST':
        data = request.data.copy()
        prod_id = data.get('productId')
        qty_change = float(data.get('quantityChange') or 0)
        reason = data.get('reason') or ''
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or 1
        try:
            wh_id = int(wh_id)
        except ValueError:
            wh_id = 1
        wh = resolve_warehouse(wh_id)
        if not wh:
            return Response({'success': False, 'message': 'Invalid warehouse'}, status=status.HTTP_400_BAD_REQUEST)
        st_id = 'st_' + uuid.uuid4().hex[:20]
        now = timezone.now()
        product = resolve_product_for_db(prod_id)
        if not product:
            return Response({'success': False, 'message': 'Product not found'}, status=status.HTTP_400_BAD_REQUEST)
        Stocktransaction.objects.create(id=st_id, productid=product, warehouseid_id=wh.id, transactiontype='ADJUSTMENT', quantity=qty_change, reason=reason, createdat=now)
        pass # Legacy Inventory table removed
        pass # Legacy Inventory table removed
        pass # Legacy Inventory table removed
        return send_success({'id': st_id, **data}, 'Adjustment recorded')

@api_view(['PUT', 'DELETE'])
def transaction_adjustments_detail(request, pk):
    from api.models import Stocktransaction, Warehouse
    from django.db import transaction
    if request.method == 'PUT':
        return send_success({'id': pk, **request.data}, 'Adjustment updated')
    elif request.method == 'DELETE':
        try:
            st = Stocktransaction.objects.get(id=pk, transactiontype='ADJUSTMENT')
            st.delete()
        except Stocktransaction.DoesNotExist:
            pass
        return send_success(None, 'Adjustment deleted')

@api_view(['GET', 'POST'])
def transaction_attendance(request):
    if request.method == 'GET':
        return send_success([], 'Attendance fetched')
    elif request.method == 'POST':
        return send_success({'id': int(timezone.now().timestamp() * 1000), **request.data}, 'Attendance recorded')

@api_view(['PUT', 'DELETE'])
def transaction_attendance_detail(request, pk):
    if request.method == 'PUT':
        return send_success({'id': pk, **request.data}, 'Attendance updated')
    elif request.method == 'DELETE':
        return send_success(None, 'Attendance deleted')

@api_view(['GET', 'POST'])
def transaction_returns(request):
    if request.method == 'GET':
        from api.models import Userwarehouseaccess, Purchase
        user_id = request.user.id
        has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
        assigned_wh_ids = []
        if has_wh_assignments and request.user.role == 'INVENTORY':
            assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
        all_returns = []

        def process_sales_returns(orders_qs):
            from api.serializers import OrderSerializer
            from api.models import Returnlog
            serialized = OrderSerializer(orders_qs, many=True, context={'skip_stock': True}).data
            order_ids = [o.id for o in orders_qs]
            returns_qs = Returnlog.objects.filter(orderid__in=order_ids).prefetch_related('items__productid')
            returns_by_order = {}
            for rl in returns_qs:
                if rl.orderid_id not in returns_by_order:
                    returns_by_order[rl.orderid_id] = []
                returns_by_order[rl.orderid_id].append(rl)
            for d, o in zip(serialized, orders_qs):
                orig = o
                orig_qtys = {}
                orig_prices = {}
                for oi in orig.orderitem_set.all():
                    try:
                        name = oi.productid.name if oi.productid else getattr(oi, 'productname', '')
                    except Exception:
                        name = getattr(oi, 'productname', '') or ''
                    orig_qtys[name] = float(oi.qty or 0)
                    orig_prices[oi.productid_id] = float(oi.price or 0)
                if o.id in returns_by_order:
                    for rl in returns_by_order[o.id]:
                        ret_entry = d.copy()
                        ret_entry['id'] = rl.id
                        items = []
                        total_amt = 0.0
                        for rli in rl.items.all():
                            try:
                                name = rli.productid.name if rli.productid else ''
                            except Exception:
                                name = rli.productid_id or ''
                            price = orig_prices.get(rli.productid_id, 0.0)
                            items.append({'productId': rli.productid_id, 'productName': name, 'qty': float(rli.qty), 'originalQty': orig_qtys.get(name, 0), 'price': price, 'total': float(rli.qty * price)})
                            total_amt += float(rli.qty * price)
                        ret_entry['items'] = items
                        ret_entry['netAmount'] = total_amt
                        ret_entry['grandTotal'] = total_amt
                        narration = o.narration or ''
                        remarks = rl.remarks or ''
                        import re
                        inv_match = re.search(r'\[INVOICE:\s*([^\]]+)\]', remarks, re.IGNORECASE)
                        inv_num = inv_match.group(1).strip() if inv_match else ''

                        veh_match = re.search(r'\[VEHICLE:\s*([^\]]+)\]', remarks, re.IGNORECASE)
                        veh_num = veh_match.group(1).strip() if veh_match else ''

                        pr_match = re.search(r'\[PR NO:\s*([^\]]+)\]', remarks, re.IGNORECASE)
                        pr_num = pr_match.group(1).strip() if pr_match else ''

                        sr_match = re.search(r'\[SR BILL:\s*([^\]]+)\]', remarks, re.IGNORECASE)
                        sr_num = sr_match.group(1).strip() if sr_match else ''

                        clean_reason = remarks
                        for tag_pat in [r'\[INVOICE:\s*[^\]]+\]', r'\[VEHICLE:\s*[^\]]+\]', r'\[PR NO:\s*[^\]]+\]', r'\[SR BILL:\s*[^\]]+\]']:
                            clean_reason = re.sub(tag_pat, '', clean_reason, flags=re.IGNORECASE)
                        clean_reason = clean_reason.strip()

                        ret_entry['type'] = 'Sales Return'
                        ret_entry['challanNumber'] = sr_num or inv_num or _extract_order_tag(narration, 'SALES RETURN BILL') or o.invoicenumber or ''
                        ret_entry['originalBillNumber'] = pr_num or (o.orderid if hasattr(o, 'orderid') else '')
                        ret_entry['originalVehicleNumber'] = _extract_order_tag(narration, 'VEHICLE') or o.vehiclenumber or ''
                        ret_entry['originalDate'] = str(o.date) if o.date else ''
                        ret_entry['party'] = ret_entry.get('partyDetails') or {}
                        ret_entry['party']['name'] = ret_entry.get('partyName')
                        ret_entry['returnDate'] = str(rl.returndate.date()) if rl.returndate else ''
                        ret_entry['returnReason'] = clean_reason or _extract_order_tag(narration, 'RETURN REASON')
                        ret_entry['vehicleNumber'] = veh_num or _extract_order_tag(narration, 'RETURN VEHICLE') or o.vehiclenumber or ''
                        all_returns.append(ret_entry)
                else:
                    for item in d.get('items', []):
                        name = item.get('product', {}).get('name') if item.get('product') else item.get('productName')
                        item['originalQty'] = orig_qtys.get(name, 0)
                        item['qty'] = float(item.get('qty') or 0)
                    narration = d.get('narration') or ''
                    d['type'] = 'Sales Return'
                    d['challanNumber'] = _extract_order_tag(narration, 'SALES RETURN BILL') or _extract_order_tag(narration, 'INVOICE') or _extract_order_tag(narration, 'CHALLAN')
                    d['originalBillNumber'] = orig.orderid if hasattr(orig, 'orderid') else ''
                    d['originalVehicleNumber'] = _extract_order_tag(narration, 'VEHICLE') or ''
                    d['originalDate'] = str(orig.date) if orig.date else ''
                    d['party'] = d.get('partyDetails') or {}
                    d['party']['name'] = d.get('partyName')
                    d['netAmount'] = d.get('grandTotal') or 0.0
                    d['returnDate'] = _extract_order_tag(narration, 'RETURN DATE')
                    d['returnReason'] = _extract_order_tag(narration, 'RETURN REASON')
                    d['vehicleNumber'] = _extract_order_tag(narration, 'RETURN VEHICLE') or _extract_order_tag(narration, 'VEHICLE')
                    all_returns.append(d)

        def append_purchases(purchases_qs):
            for p in purchases_qs:
                n = p.narration or ''
                orig = p
                supplier = None
                if orig.supplierid:
                    supplier = {'name': orig.supplierid.name, 'address': orig.supplierid.address, 'gst_number': orig.supplierid.gstnumber, 'contact_info': orig.supplierid.contactinfo or orig.supplierid.contactperson}
                elif orig.vendorname:
                    supplier = {'name': orig.vendorname}
                orig_qtys = {}
                for oi in orig.purchaseitem_set.all():
                    orig_qtys[oi.productname] = float(oi.qty or 0)
                items = []
                for item in p.purchaseitem_set.all():
                    items.append({'productName': item.productname, 'qty': float(item.qty or 0), 'originalQty': orig_qtys.get(item.productname, 0), 'rate': float(item.rate or 0), 'total': float(item.total or 0)})
                all_returns.append({'type': 'Purchase Return', 'challanNumber': _extract_order_tag(n, 'PURCHASE RETURN BILL') or p.challannumber or '', 'originalBillNumber': orig.challannumber if orig.challannumber else '', 'originalVehicleNumber': orig.vehiclenumber if orig.vehiclenumber else '', 'originalDate': str(orig.date) if orig.date else '', 'vehicleNumber': _extract_order_tag(n, 'RETURN VEHICLE') or p.vehiclenumber or '', 'netAmount': float(p.grandtotal or 0.0), 'returnDate': _extract_order_tag(n, 'RETURN DATE') or str(p.date), 'returnReason': _extract_order_tag(n, 'RETURN REASON') or '', 'createdAt': p.createdat, 'id': p.id, 'purchaseId': p.purchaseid, 'party': supplier, 'items': items})
        from django.db.models import Q
        from api.models import Returnlog
        try:
            returned_order_ids = list(Returnlog.objects.values_list('orderid_id', flat=True).distinct())
        except Exception:
            returned_order_ids = []
        orders = Order.objects.filter(
            Q(status__in=['Returned', 'Partially Returned']) | Q(id__in=returned_order_ids)
        ).prefetch_related('orderitem_set__productid')
        process_sales_returns(orders)
        purchases = Purchase.objects.filter(status__in=['Returned', 'Partially Returned']).prefetch_related('purchaseitem_set')
        if assigned_wh_ids:
            purchases = purchases.filter(warehouseid_id__in=assigned_wh_ids)
        append_purchases(purchases)
        return send_success(all_returns, 'Returns fetched')
    data = request.data.copy()
    return_type = data.get('returnType', 'SALE').upper()
    is_purchase = return_type == 'PURCHASE' or bool(data.get('purchaseId'))
    order_id = data.get('purchaseId') if is_purchase else data.get('orderId') or data.get('order_id') or data.get('saleId') or data.get('sale_id')
    if not order_id:
        return send_error('Order/Purchase id is required', 400)
    try:
        from api.models import Purchase
        if is_purchase:
            order = Purchase.objects.prefetch_related('purchaseitem_set').get(id=order_id)
        else:
            order = Order.objects.prefetch_related('orderitem_set').get(id=order_id)
    except (Order.DoesNotExist, Purchase.DoesNotExist):
        if is_purchase:
            try:
                order = Purchase.objects.prefetch_related('purchaseitem_set').get(purchaseid=order_id)
            except Purchase.DoesNotExist:
                return send_error(f"{'Purchase' if is_purchase else 'Sale'} order not found", 404)
        else:
            try:
                order = Order.objects.prefetch_related('orderitem_set').get(orderid=order_id)
            except Order.DoesNotExist:
                return send_error(f"{'Purchase' if is_purchase else 'Sale'} order not found", 404)
    except (Order.DoesNotExist, Purchase.DoesNotExist):
        return send_error(f"{('Purchase' if is_purchase else 'Sale')} order not found", 404)
    vehicle_number = str(data.get('vehicleNumber') or data.get('vehicle_number') or '').strip().upper()
    bill_number = data.get('returnBillNumber') or data.get('salesReturnBillNumber') or data.get('sales_return_bill_number') or data.get('purchaseReturnBillNumber')
    return_date = data.get('returnDate') or data.get('return_date')
    return_reason = data.get('returnReason') or data.get('return_reason')
    missing = []
    for label, value in [('Vehicle Number', vehicle_number), ('Return Bill Number', bill_number), ('Return Date', return_date), ('Return Reason', return_reason)]:
        if not value:
            missing.append(label)
    if missing:
        return send_error(f"Missing required fields: {', '.join(missing)}", 400)
    from django.utils import timezone
    order.status = 'Returned'
    if is_purchase:
        tag_prefix = 'PURCHASE'
        order.narration = _append_order_tags(order.narration, {'RETURN VEHICLE': vehicle_number, f'{tag_prefix} RETURN BILL': bill_number, 'RETURN DATE': return_date, 'RETURN REASON': return_reason, 'RETURN TIME': timezone.now().strftime('%Y-%m-%d %H:%M:%S')})
    order.updatedat = timezone.now()
    order.save()
    if is_purchase:
        for item in order.purchaseitem_set.all():
            from api.models import Product
            prod = Product.objects.filter(name=item.productname).first()
            if prod:
                pass
    else:
        for item in order.orderitem_set.all():
            if item.productid_id:
                item.returnedqty = item.qty
                item.save(update_fields=['returnedqty'])
    if is_purchase:
        return send_success({'id': order.id, 'status': order.status}, 'Purchase return recorded successfully')
    else:
        serializer = OrderSerializer(order)
        return send_success(serializer.data, 'Sales return recorded successfully')

