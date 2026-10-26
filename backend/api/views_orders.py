"""
Sales Orders, Dispatches, Approvals, and Sales Transaction Controllers.
Part of Enterprise Domain Modularization.
"""
import datetime
import json
import re
import uuid
from decimal import Decimal
from django.db import models, connection, transaction
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import viewsets, status, exceptions
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from api.models import (
    Company, User, Product, Warehouse, Dealer, Distributor,
    Order, Orderitem, Dispatchlog, Dispatchlogitem, Returnlog, Returnlogitem,
    Stocktransaction, PaymentReceipt, Userwarehouseaccess, Purchaseitem
)
from api.serializers import OrderSerializer, ProductSerializer, DispatchlogSerializer, ReturnlogSerializer
from api.db_router import get_tenant_model_cross_db
from api.services.ledger_service import record_stock_ledger_entry
from api.views import (
    send_success, send_error, _get_company_id, _extract_order_tag,
    _append_order_tags, _get_clean_narration_helper, _append_user_audit_tag,
    _parse_user_audit_tags, resolve_warehouse, _fy_date_filter
)

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        qs = Order.objects.all()
        if company_id and user_role != 'SUPERADMIN':
            qs = qs.filter(companyid_id=company_id)

        # Sales Officers only see their own orders
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER', 'SO', 'FIELD_OFFICER']
        if user_role in SALES_ROLES and getattr(self.request.user, 'email', None):
            user_email = (getattr(self.request.user, 'email', '') or '').strip().lower()
            from django.db.models.functions import Lower
            qs = qs.annotate(_so_email_lower=Lower('soemail_id')).filter(
                Q(_so_email_lower=user_email) | Q(soemail=self.request.user)
            )

        # Warehouse scoping: Inventory/Production users see orders for their assigned warehouse(s)
        if user_role in ('INVENTORY', 'PRODUCTION'):
            assigned_wh_ids = []
            if getattr(self.request, 'user', None) and getattr(self.request.user, 'id', None):
                from api.models import Userwarehouseaccess
                assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=self.request.user.id).values_list('warehouseid_id', flat=True))
                if getattr(self.request.user, 'warehouseid_id', None) and self.request.user.warehouseid_id not in assigned_wh_ids:
                    assigned_wh_ids.append(self.request.user.warehouseid_id)
            if assigned_wh_ids:
                qs = qs.filter(warehouseid_id__in=assigned_wh_ids)

        # Warehouse filter only applies on list action for non-sales roles (Sales Officers must see all their orders across all warehouses)
        if getattr(self, 'action', None) == 'list' and user_role not in SALES_ROLES:
            wh_header = self.request.headers.get('X-Warehouse-Id') or self.request.headers.get('X-Warehouse-ID') or self.request.headers.get('x-warehouse-id')
            wh_query = self.request.GET.get('warehouse_id') or self.request.GET.get('warehouseId')
            wh_filter = wh_query or wh_header
            if wh_filter and str(wh_filter).strip().upper() not in ('', 'ALL', 'NONE', 'NULL', 'UNDEFINED', 'GLOBAL'):
                try:
                    wh_id = int(str(wh_filter).strip())
                    qs = qs.filter(warehouseid_id=wh_id)
                except (ValueError, TypeError):
                    pass

        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        raw_pk = self.kwargs.get(lookup_url_kwarg, '')
        pk = str(raw_pk).strip()

        # 1. Primary lookup within current action queryset
        qs = self.get_queryset()
        obj = qs.filter(id=pk).first() or qs.filter(orderid=pk).first() or qs.filter(orderid__iexact=pk).first()
        if obj:
            return obj

        # 2. Resilient fallback: lookup in company-scoped queryset without warehouse header filter
        # (Prevents 404 when active warehouse header differs from order warehouse)
        company_id = _get_company_id(self.request)
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER', 'SO', 'FIELD_OFFICER']

        base_qs = Order.objects.all()
        if company_id and user_role != 'SUPERADMIN':
            base_qs = base_qs.filter(companyid_id=company_id)
        if user_role in SALES_ROLES and getattr(self.request.user, 'email', None):
            user_email = (getattr(self.request.user, 'email', '') or '').strip().lower()
            from django.db.models.functions import Lower
            base_qs = base_qs.annotate(_so_email_lower=Lower('soemail_id')).filter(
                Q(_so_email_lower=user_email) | Q(soemail=self.request.user)
            )

        obj = base_qs.filter(id=pk).first() or base_qs.filter(orderid=pk).first() or base_qs.filter(orderid__iexact=pk).first()
        if obj:
            return obj

        # 3. SuperAdmin global fallback
        if user_role == 'SUPERADMIN':
            obj = Order.objects.filter(id=pk).first() or Order.objects.filter(orderid=pk).first() or Order.objects.filter(orderid__iexact=pk).first()
            if obj:
                return obj

        raise exceptions.NotFound('Order not found')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        qs = _fy_date_filter(request, qs, date_field='date')
        serialized_data = OrderSerializer(qs.prefetch_related('orderitem_set'), many=True, context={'skip_stock': True}).data
        all_orders = list(serialized_data)
        all_orders.sort(key=lambda x: x.get('date', ''), reverse=True)
        return send_success(all_orders, 'Orders fetched successfully')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = OrderSerializer(instance)
        return send_success(serializer.data, 'Order fetched successfully')

    def create(self, request, *args, **kwargs):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role.startswith('INVENTORY') or user_role == 'INVENTORY':
            return send_error('Inventory users are not authorized to create sales orders.', 403)
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        if request.user.email:
            data['soEmail'] = request.user.email

        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        if 'orderId' not in data or not data['orderId']:
            import random
            data['orderId'] = f'ORD-2026-{random.randint(1000, 9999)}'
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]
        assigned_wh = data.get('warehouseId') or data.get('assignedWarehouse')
        if assigned_wh:
            from api.models import Warehouse
            wh = resolve_warehouse(assigned_wh)
            if wh:
                data['warehouseId'] = wh.id
        serializer = OrderSerializer(data=data)
        if not serializer.is_valid():
            print('[ERROR] OrderSerializer Validation Errors:', serializer.errors)
            return send_error(f'Validation failed: {serializer.errors}', 400)
        order = serializer.save()
        
        # Auto-assign warehouse to dealer/distributor on order creation
        assigned_wh_id = data.get('warehouseId') or data.get('assignedWarehouse')
        if assigned_wh_id:
            try:
                from api.models import Dealer, Distributor
                party_type = (order.partytype or '').upper()
                party_name = order.partyname
                if party_type == 'DEALER':
                    dealer = Dealer.objects.filter(dealername=party_name).first()
                    if dealer and not dealer.warehouseid_id:
                        dealer.warehouseid_id = assigned_wh_id
                        dealer.save()
                elif party_type == 'DISTRIBUTOR':
                    dist = Distributor.objects.filter(distributorname=party_name).first()
                    if dist and not dist.warehouseid_id:
                        dist.warehouseid_id = assigned_wh_id
                        dist.save()
            except Exception:
                pass
        
        full_serializer = OrderSerializer(order)
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='Order & Dispatch', action=f"Created Sales Order {order.orderid} for {order.partyname} (Rs. {float(order.grandtotal or 0):.2f})", details=data)
        except Exception:
            pass
        return send_success(full_serializer.data, 'Order created successfully', 201)

    def update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        product_ids = list(instance.orderitem_set.values_list('productid_id', flat=True))
        data = request.data.copy()

        import uuid
        if 'items' in data:
            items_list = data.get('items', [])
            for item in items_list:
                if 'id' not in item or not item['id']:
                    item['id'] = 'c' + uuid.uuid4().hex[:23]
        assigned_wh_id = data.get('assignedWarehouse') or data.get('warehouseId')
        serializer = OrderSerializer(instance, data=data, partial=partial)
        if not serializer.is_valid():
            print('[ERROR] OrderSerializer Update Validation Errors:', serializer.errors)
            return send_error(f'Validation failed: {serializer.errors}', 400)
        order = serializer.save()
        
        # Auto-assign warehouse to dealer/distributor when order is assigned to warehouse
        if assigned_wh_id:
            try:
                from api.models import Dealer, Distributor
                party_type = (order.partytype or '').upper()
                party_name = order.partyname
                if party_type == 'DEALER':
                    dealer = Dealer.objects.filter(dealername=party_name).first()
                    if dealer and not dealer.warehouseid_id:
                        dealer.warehouseid_id = assigned_wh_id
                        dealer.save()
                elif party_type == 'DISTRIBUTOR':
                    dist = Distributor.objects.filter(distributorname=party_name).first()
                    if dist and not dist.warehouseid_id:
                        dist.warehouseid_id = assigned_wh_id
                        dist.save()
            except Exception:
                pass
        
        new_product_ids = list(order.orderitem_set.values_list('productid_id', flat=True))
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='Order & Dispatch', action=f"Updated Sales Order {order.orderid} (Status: {order.status})", details=data)
        except Exception:
            pass
        return send_success(OrderSerializer(order).data, 'Order updated successfully')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product_ids = list(instance.orderitem_set.values_list('productid_id', flat=True))
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='Order & Dispatch', action=f"Deleted Sales Order {instance.orderid or instance.id}")
        except Exception:
            pass
        instance.delete()
        for p_id in product_ids:
            if p_id:
                pass
        return send_success(None, 'Order deleted successfully')

    @action(detail=True, methods=['post'], url_path='partial-dispatch')
    def partial_dispatch(self, request, pk=None):
        try:
            instance = self.get_object()
            data = request.data.copy()
            items = data.get('items', [])
            if not items:
                return send_error('No items specified for dispatch', 400)
            invoice = data.get('invoiceNumber') or data.get('invoice_number')
            vehicle = data.get('vehicleNumber') or data.get('vehicle_number')
            driver = data.get('driverName') or data.get('driver_name')
            mobile = data.get('driverMobileNumber') or data.get('driver_mobile_number') or data.get('driverMobile') or data.get('driver_mobile')
            remarks = data.get('remarks') or ''
            from api.models import Orderitem, Product
            for item_data in items:
                p_id = item_data.get('productId') or item_data.get('product_id')
                qty_to_send = int(item_data.get('qty', 0))
                if qty_to_send <= 0:
                    continue
                order_items = list(instance.orderitem_set.filter(productid_id=p_id))
                if not order_items:
                    return send_error(f'Product {p_id} not found in this order', 400)
                total_ordered = sum(oi.qty for oi in order_items)
                total_sent = sum(oi.sentqty for oi in order_items)
                if total_sent + qty_to_send > total_ordered:
                    return send_error(f'Cannot dispatch {qty_to_send} of {p_id}. Already sent: {total_sent}, Total ordered: {total_ordered}', 400)
            
            from api.models import Product, Purchaseitem, Orderitem, Stocktransaction
            from django.db.models import Sum
            
            wh_val = getattr(instance, 'assigned_warehouse', None)
            wh_name = wh_val.name if wh_val and hasattr(wh_val, 'name') else data.get('warehouseDetails')
            
            for item_data in items:
                p_id = item_data.get('productId') or item_data.get('product_id')
                qty_to_send = int(item_data.get('qty', 0))
                if qty_to_send <= 0:
                    continue
                        
                p = Product.objects.filter(id=p_id).first()
                if not p: continue
                
                stock = float(p.openingstock or 0)
                
                purchases = Purchaseitem.objects.filter(
                    purchaseid__status__in=['Completed', 'Approved', 'RECEIVED', 'PARTIALLY_RECEIVED'],
                    productname=p.name
                ).aggregate(total=Sum('qty'))
                stock += float(purchases['total'] or 0)
                
                purchases_ret = Purchaseitem.objects.filter(
                    purchaseid__status='Returned',
                    productname=p.name
                ).aggregate(total=Sum('qty'))
                stock -= float(purchases_ret['total'] or 0)
                
                sales = Orderitem.objects.filter(
                    orderid__status='Completed',
                    productid_id=p_id
                ).aggregate(total=Sum('qty'))
                stock -= float(sales['total'] or 0)
                
                sales_ret = Orderitem.objects.filter(
                    orderid__status='Returned',
                    productid_id=p_id
                ).aggregate(total=Sum('qty'))
                stock += float(sales_ret['total'] or 0)
                
                st_aggs = Stocktransaction.objects.exclude(
                    reason__in=['PENDING_APPROVAL', 'REJECTED']
                ).exclude(
                    transactiontype__in=['SALE', 'DISPATCH']
                ).filter(productid_id=p_id).aggregate(total=Sum('quantity'))
                stock += float(st_aggs['total'] or 0)
                
                if stock < qty_to_send:
                    return Response({'success': False, 'message': f'Cannot dispatch! Insufficient stock for {p.name}. Available: {stock}, Requested: {qty_to_send}'}, status=400)
            import uuid
            from django.utils import timezone
            from api.models import Dispatchlog, Dispatchlogitem

            # Respect user-provided actionDate / dispatchDate
            action_date_raw = data.get('actionDate') or data.get('action_date') or data.get('dispatchDate') or data.get('dispatch_date')
            action_time_raw = data.get('actionTime') or data.get('action_time') or data.get('dispatchTime') or data.get('dispatch_time') or '00:00'

            dispatch_dt = timezone.now()
            final_dispatch_date_str = timezone.now().strftime('%Y-%m-%d')

            if action_date_raw:
                parsed_dt = _smart_parse_date(f"{str(action_date_raw).split('T')[0]} {action_time_raw}") or _smart_parse_date(action_date_raw)
                if parsed_dt:
                    dispatch_dt = parsed_dt
                    final_dispatch_date_str = parsed_dt.strftime('%Y-%m-%d')
                else:
                    final_dispatch_date_str = str(action_date_raw).split('T')[0]

            log_id = 'c' + uuid.uuid4().hex[:23]
            dispatch_log = Dispatchlog.objects.create(
                id=log_id,
                orderid=instance,
                dispatchdate=dispatch_dt,
                invoicenumber=invoice,
                vehiclenumber=vehicle,
                drivername=driver,
                drivermobile=mobile,
                remarks=remarks
            )
            for item_data in items:
                p_id = item_data.get('productId') or item_data.get('product_id')
                qty_to_send = int(item_data.get('qty', 0))
                if qty_to_send <= 0:
                    continue
                order_items = list(instance.orderitem_set.filter(productid_id=p_id).order_by('id'))
                remaining_to_dispatch = qty_to_send
                for oi in order_items:
                    available = max(0, oi.qty - oi.sentqty)
                    if available <= 0:
                        continue
                    take = min(remaining_to_dispatch, available)
                    oi.sentqty += take
                    oi.save(update_fields=['sentqty'])
                    remaining_to_dispatch -= take
                    if remaining_to_dispatch <= 0:
                        break
                if remaining_to_dispatch > 0 and order_items:
                    order_items[-1].sentqty += remaining_to_dispatch
                    order_items[-1].save(update_fields=['sentqty'])
                item_log_id = 'c' + uuid.uuid4().hex[:23]
                Dispatchlogitem.objects.create(id=item_log_id, dispatchlogid=dispatch_log, productid_id=p_id, qty=qty_to_send)
                try:
                    assigned_wh = getattr(instance, 'warehouseid', None)
                    assigned_wh_id = getattr(instance, 'warehouseid_id', None) or (assigned_wh.id if hasattr(assigned_wh, 'id') else None)
                    st_id = 'st_' + uuid.uuid4().hex[:20]
                    Stocktransaction.objects.create(
                        id=st_id,
                        productid_id=p_id,
                        warehouseid_id=assigned_wh_id,
                        transactiontype='DISPATCH',
                        quantity=-qty_to_send,
                        referenceid=instance.orderid or instance.id,
                        reason=f"Dispatched Order {instance.orderid or instance.id} (Invoice: {invoice or '-'})",
                        createdat=dispatch_dt
                    )
                except Exception as st_err:
                    print('[DISPATCH STOCK TX ERROR]', st_err)
            all_dispatched = True
            for oi in instance.orderitem_set.all():
                if oi.sentqty < oi.qty:
                    all_dispatched = False
                    break
            if all_dispatched:
                instance.status = 'Dispatched'
            else:
                instance.status = 'Partially Dispatched'
            if invoice:
                instance.invoicenumber = invoice
            if vehicle:
                instance.vehiclenumber = vehicle
            if driver:
                instance.drivername = driver
            if mobile:
                instance.drivermobile = mobile
            wh_val = getattr(instance, 'assigned_warehouse', None)
            if wh_val and hasattr(wh_val, 'name'):
                instance.dispatchwarehouse = wh_val.name
            elif data.get('warehouseDetails'):
                instance.dispatchwarehouse = data.get('warehouseDetails')
            instance.dispatchdate = final_dispatch_date_str
            try:
                from api.views import _append_order_tags
                instance.narration = _append_order_tags(instance.narration or '', {'DISPATCH DATE': final_dispatch_date_str})
            except Exception:
                pass
            instance.save()
            from api.serializers import OrderSerializer
            return send_success(OrderSerializer(instance).data, f'Order status updated to {instance.status}')
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return send_error(f'Internal API Error: {str(e)}', 500)

    @action(detail=True, methods=['post'], url_path='partial-return')
    def partial_return(self, request, pk=None):
        instance = self.get_object()
        data = request.data.copy()
        items = data.get('items', [])
        if not items:
            return send_error('No items specified for return', 400)
        remarks = data.get('remarks') or data.get('returnReason') or ''
        from api.models import Orderitem, Product
        for item_data in items:
            p_id = item_data.get('productId') or item_data.get('product_id')
            qty_to_return = int(item_data.get('qty', 0))
            if qty_to_return <= 0:
                continue
            order_items = list(instance.orderitem_set.filter(productid_id=p_id))
            if not order_items:
                return send_error(f'Product {p_id} not found in this order', 400)
            total_dispatched = 0
            total_returned = 0
            for oi in order_items:
                effective_sentqty = oi.sentqty
                if effective_sentqty == 0 and instance.status in ['Dispatched', 'Completed', 'Partially Returned', 'Returned']:
                    effective_sentqty = oi.qty
                    oi.sentqty = oi.qty
                    oi.save(update_fields=['sentqty'])
                total_dispatched += effective_sentqty
                total_returned += oi.returnedqty
            if total_returned + qty_to_return > total_dispatched:
                return send_error(f'Cannot return {qty_to_return} of {p_id}. Already returned: {total_returned}, Dispatched: {total_dispatched}', 400)
        import uuid
        from django.utils import timezone
        import datetime
        from api.models import Returnlog, Returnlogitem
        log_id = 'c' + uuid.uuid4().hex[:23]
        
        return_date = timezone.now()
        req_return_date = data.get('returnDate')
        if req_return_date:
            try:
                if 'T' in req_return_date:
                    return_date = datetime.datetime.fromisoformat(req_return_date.replace('Z', '+00:00'))
                else:
                    return_date = datetime.datetime.strptime(req_return_date, '%Y-%m-%d').replace(tzinfo=timezone.get_current_timezone())
            except Exception:
                pass
                
        return_log = Returnlog.objects.create(id=log_id, orderid=instance, returndate=return_date, remarks=remarks)
        for item_data in items:
            p_id = item_data.get('productId') or item_data.get('product_id')
            qty_to_return = int(item_data.get('qty', 0))
            if qty_to_return <= 0:
                continue
            order_items = list(instance.orderitem_set.filter(productid_id=p_id).order_by('id'))
            remaining_to_return = qty_to_return
            for oi in order_items:
                effective_sent = oi.sentqty if oi.sentqty > 0 else (oi.qty if instance.status in ['Dispatched', 'Completed', 'Partially Returned', 'Returned'] else 0)
                returnable = max(0, effective_sent - oi.returnedqty)
                if returnable <= 0:
                    continue
                take = min(remaining_to_return, returnable)
                oi.returnedqty += take
                oi.save(update_fields=['returnedqty'])
                remaining_to_return -= take
                if remaining_to_return <= 0:
                    break
            if remaining_to_return > 0 and order_items:
                order_items[-1].returnedqty += remaining_to_return
                order_items[-1].save(update_fields=['returnedqty'])
            item_log_id = 'c' + uuid.uuid4().hex[:23]
            Returnlogitem.objects.create(id=item_log_id, returnlogid=return_log, productid_id=p_id, qty=qty_to_return)
        all_returned = True
        any_returned = False
        for oi in instance.orderitem_set.all():
            if oi.returnedqty > 0:
                any_returned = True
            effective_sentqty = oi.sentqty
            if effective_sentqty == 0 and instance.status in ['Dispatched', 'Completed', 'Partially Returned', 'Returned']:
                effective_sentqty = oi.qty
            if oi.returnedqty < effective_sentqty:
                all_returned = False
        if all_returned and any_returned:
            instance.status = 'Returned'
        elif any_returned:
            instance.status = 'Partially Returned'
        instance.save()
        from api.serializers import OrderSerializer
        return send_success(OrderSerializer(instance).data, f'Order status updated to {instance.status}')

    @action(detail=True, methods=['post'], url_path='revert-return-log')
    def revert_return_log(self, request, pk=None):
        try:
            instance = self.get_object()
            log_id = request.data.get('logId') or request.data.get('log_id')
            if not log_id:
                return send_error('logId is required', 400)
            from api.models import Returnlog, Returnlogitem, Orderitem
            try:
                return_log = Returnlog.objects.get(id=log_id, orderid=instance)
            except Returnlog.DoesNotExist:
                return send_error('Return log not found for this order', 404)
            log_items = Returnlogitem.objects.filter(returnlogid=return_log)
            product_ids = []
            for item in log_items:
                order_items = list(instance.orderitem_set.filter(productid_id=item.productid_id).order_by('-id'))
                remaining_revert = item.qty
                for oi in order_items:
                    take = min(remaining_revert, oi.returnedqty)
                    oi.returnedqty = max(0, oi.returnedqty - take)
                    oi.save(update_fields=['returnedqty'])
                    remaining_revert -= take
                    if remaining_revert <= 0:
                        break
                product_ids.append(item.productid_id)
            log_items.delete()
            return_log.delete()
            for p_id in set(product_ids):
                pass
            all_returned = True
            any_returned = False
            for oi in instance.orderitem_set.all():
                if oi.returnedqty > 0:
                    any_returned = True
                effective_sentqty = oi.sentqty
                if effective_sentqty == 0 and instance.status in ['Dispatched', 'Completed', 'Partially Returned', 'Returned']:
                    effective_sentqty = oi.qty
                if oi.returnedqty < effective_sentqty:
                    all_returned = False
            if all_returned and any_returned:
                instance.status = 'Returned'
            elif any_returned:
                instance.status = 'Partially Returned'
            else:
                all_dispatched = True
                any_dispatched = False
                for oi in instance.orderitem_set.all():
                    if oi.sentqty > 0:
                        any_dispatched = True
                    if oi.sentqty < oi.qty:
                        all_dispatched = False
                if all_dispatched and any_dispatched:
                    instance.status = 'Completed'
                elif any_dispatched:
                    instance.status = 'Partially Dispatched'
                else:
                    instance.status = 'Approved'
            instance.save(update_fields=['status'])
            from api.serializers import OrderSerializer
            return send_success(OrderSerializer(instance).data, f'Return log reverted successfully. Status is now {instance.status}')
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return send_error(f'Internal API Error: {str(e)}', 500)

    @action(detail=True, methods=['get'], url_path='dispatch-logs')
    def dispatch_logs(self, request, pk=None):
        instance = self.get_object()
        from api.models import Dispatchlog
        from api.serializers import DispatchlogSerializer
        logs = Dispatchlog.objects.filter(orderid=instance).prefetch_related('items__productid').order_by('-createdat')
        return send_success(DispatchlogSerializer(logs, many=True, context={'skip_stock': True}).data, 'Dispatch logs fetched')

    @action(detail=True, methods=['get'], url_path='return-logs')
    def return_logs(self, request, pk=None):
        instance = self.get_object()
        from api.models import Returnlog
        from api.serializers import ReturnlogSerializer
        logs = Returnlog.objects.filter(orderid=instance).prefetch_related('items__productid').order_by('-createdat')
        return send_success(ReturnlogSerializer(logs, many=True, context={'skip_stock': True}).data, 'Return logs fetched')

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        instance = self.get_object()
        data = request.data.copy()
        status_val = data.get('status')
        reason_val = data.get('reason')
        if not status_val:
            return send_error('Status field is required', 400)
        try:
            instance.status = status_val
            if status_val == 'Cancelled' or status_val == 'Rejected':
                from django.utils import timezone
                rejection_date = data.get('actionDate') or data.get('action_date') or timezone.now().strftime('%Y-%m-%d')
                instance.narration = _append_order_tags(instance.narration, {'REJECTION REASON': reason_val or 'No reason provided', 'REJECTION DATE': rejection_date})
            elif status_val == 'Dispatched' or status_val == 'Completed':
                invoice = data.get('invoiceNumber') or data.get('invoice_number')
                vehicle = data.get('vehicleNumber') or data.get('vehicle_number')
                driver = data.get('driverName') or data.get('driver_name')
                mobile = data.get('driverMobileNumber') or data.get('driver_mobile_number') or data.get('driverMobile') or data.get('driver_mobile')
                wh_name = data.get('warehouse') or data.get('warehouse_id') or data.get('warehouseName') or data.get('warehouse_name') or data.get('dispatchWarehouse')
                disp_date = data.get('dispatchDate') or data.get('dispatch_date')
                check_str = reason_val or instance.narration or ''
                if '[' in check_str and ']' in check_str:
                    if not invoice:
                        invoice = _extract_order_tag(check_str, 'INVOICE') or _extract_order_tag(check_str, 'CHALLAN')
                    if not vehicle:
                        vehicle = _extract_order_tag(check_str, 'VEHICLE')
                    if not driver:
                        driver = _extract_order_tag(check_str, 'DRIVER')
                    if not mobile:
                        mobile = _extract_order_tag(check_str, 'DRIVER MOBILE')
                    if not wh_name:
                        wh_name = _extract_order_tag(check_str, 'WAREHOUSE')
                    if not disp_date:
                        disp_date = _extract_order_tag(check_str, 'DISPATCH DATE') or _extract_order_tag(check_str, 'DISPATCH TIME')
                    instance.narration = _get_clean_narration_helper(check_str)
                elif reason_val:
                    instance.narration = reason_val
                if invoice:
                    instance.invoicenumber = invoice
                if vehicle:
                    instance.vehiclenumber = vehicle
                if driver:
                    instance.drivername = driver
                if mobile:
                    instance.drivermobile = mobile
                if wh_name:
                    instance.dispatchwarehouse = wh_name
                if disp_date:
                    instance.dispatchdate = disp_date
            elif reason_val:
                instance.narration = _append_order_tags(instance.narration, {'REASON': reason_val})
            instance.save()
            for item in instance.orderitem_set.all():
                if item.productid_id:
                    pass
            serializer = OrderSerializer(instance)
            return send_success(serializer.data, f'Order status updated to {status_val}')
        except Exception as e:
            return send_error(f'Error updating status: {str(e)}', 500)



@api_view(['GET', 'POST'])
def transaction_sales(request):
    if request.method == 'GET':
        from api.models import Userwarehouseaccess, Warehouse
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
        company_id = _get_company_id(request)
        user_role = (getattr(request.user, 'role', '') or '').upper()

        orders_qs = Order.objects.all().prefetch_related('orderitem_set__productid')
        if company_id and user_role != 'SUPERADMIN':
            orders_qs = orders_qs.filter(companyid_id=company_id)
        if assigned_wh_ids:
            orders_qs = orders_qs.filter(warehouseid_id__in=assigned_wh_ids)

        all_orders = list(orders_qs)
        serialized = OrderSerializer(all_orders, many=True, context={'skip_stock': True}).data
        
        expanded_sales = []
        order_ids = [d['id'] for d in serialized]
        
        from api.models import Dispatchlog, Orderitem, Returnlog, Product
        dispatch_logs_list = list(Dispatchlog.objects.filter(orderid_id__in=order_ids).prefetch_related('items__productid'))
        return_logs_list = list(Returnlog.objects.filter(orderid_id__in=order_ids).prefetch_related('items'))
        order_items_list = list(Orderitem.objects.filter(orderid_id__in=order_ids))
        
        dl_map = {}
        for log in dispatch_logs_list:
            dl_map.setdefault(log.orderid_id, []).append(log)
            
        rl_map = {}
        for rl in return_logs_list:
            rl_map.setdefault(rl.orderid_id, []).append(rl)
            
        oi_map = {}
        for oi in order_items_list:
            oi_map.setdefault(oi.orderid_id, {})[oi.productid_id] = oi
            
        prod_ids = set()
        for d in serialized:
            for item in d.get('items') or []:
                if item.get('productId'): prod_ids.add(item.get('productId'))
        for log in dispatch_logs_list:
            for li in log.items.all():
                if li.productid_id: prod_ids.add(li.productid_id)
        
        products_list = list(Product.objects.filter(id__in=prod_ids))
        prod_map = {p.id: p for p in products_list}
            
        for d in serialized:
            dispatch_logs = dl_map.get(d['id'], [])
            if dispatch_logs:
                returns = rl_map.get(d['id'], [])
                invoice_returns = {}
                global_returns = {}
                for rl in returns:
                    import re
                    match = re.search('\\[INVOICE:\\s*([^\\]]+)\\]', rl.remarks or '')
                    if match:
                        inv = match.group(1).strip()
                        if inv not in invoice_returns:
                            invoice_returns[inv] = {}
                        for rli in rl.items.all():
                            invoice_returns[inv][rli.productid_id] = invoice_returns[inv].get(rli.productid_id, 0) + rli.qty
                    else:
                        for rli in rl.items.all():
                            global_returns[rli.productid_id] = global_returns.get(rli.productid_id, 0) + rli.qty
                            
                from django.utils import timezone
                dispatch_logs.sort(key=lambda x: (x.dispatchdate or timezone.now(), x.createdat or timezone.now()), reverse=True)
                for log in dispatch_logs:
                    sale = d.copy()
                    sale['id'] = log.id
                    sale['originalOrderId'] = d['id']
                    sale['partyName'] = log.orderid.partyname if (getattr(log, 'orderid', None) and getattr(log.orderid, 'partyname', None)) else (d.get('partyName') or '')
                    sale['customerName'] = sale['partyName']
                    sale['invoiceNumber'] = log.invoicenumber
                    sale['challanNumber'] = log.invoicenumber
                    disp_date_str = log.dispatchdate.strftime('%Y-%m-%d') if log.dispatchdate else (d.get('dispatchDate') or '')
                    order_date_str = d.get('date') or ''
                    sale['dispatchDate'] = disp_date_str
                    sale['orderDate'] = order_date_str
                    sale['date'] = disp_date_str or order_date_str or (log.createdat.strftime('%Y-%m-%d') if log.createdat else '')
                    if log.createdat:
                        sale['createdAt'] = log.createdat.isoformat()
                    sale['isDispatchLog'] = True
                    sale['driverMobileNumber'] = log.drivermobile or d.get('driverMobileNumber') or d.get('driverMobile') or ''
                    sale['driverMobile'] = sale['driverMobileNumber']
                    sale['vehicleNumber'] = log.vehiclenumber or d.get('vehicleNumber') or ''
                    sale['driverName'] = log.drivername or d.get('driverName') or ''
                    wh_name = log.warehouseid.name if getattr(log, 'warehouseid', None) else None
                    sale['warehouseName'] = wh_name or d.get('warehouseName') or d.get('dispatchWarehouse') or ''
                    sale['remarks'] = log.remarks or d.get('remarks') or d.get('narration') or ''
                    sale['narration'] = log.remarks or d.get('narration') or d.get('remarks') or ''
                    log_items = log.items.all()
                    dispatch_items = []
                    total_amount = 0
                    total_cost = 0
                    total_returned = 0
                    total_dispatched = 0
                    for li in log_items:
                        oi = oi_map.get(d['id'], {}).get(li.productid_id)
                        price = float(oi.price) if oi and oi.price else 0.0
                        prod = prod_map.get(li.productid_id)
                        cost_price = float(prod.rate or 0) * 0.7 if prod else 0.0
                        specific_ret = invoice_returns.get(log.invoicenumber, {}).get(li.productid_id, 0)
                        rem = li.qty - specific_ret
                        glob_ret = 0
                        if rem > 0 and global_returns.get(li.productid_id, 0) > 0:
                            glob_ret = min(rem, global_returns[li.productid_id])
                            global_returns[li.productid_id] -= glob_ret
                        actual_ret = specific_ret + glob_ret
                        total_returned += actual_ret
                        total_dispatched += li.qty
                        prod_name = prod.name if prod else (li.productid_id or '')
                        dispatch_items.append({'productId': li.productid_id, 'productName': prod_name, 'qty': li.qty, 'price': price, 'total': (li.qty - actual_ret) * price, 'sentQty': li.qty, 'returnedQty': actual_ret})
                        total_amount += (li.qty - actual_ret) * price
                        total_cost += (li.qty - actual_ret) * cost_price
                    if not dispatch_items and d.get('items'):
                        sale['items'] = d.get('items')
                        sale['grandTotal'] = d.get('grandTotal') or 0.0
                        sale['netAmount'] = d.get('grandTotal') or 0.0
                    else:
                        sale['items'] = dispatch_items
                        sale['grandTotal'] = total_amount
                        sale['netAmount'] = total_amount
                        sale['totalProfit'] = max(0.0, total_amount - total_cost)
                    if total_returned >= total_dispatched and total_dispatched > 0:
                        sale['status'] = 'Returned'
                    elif total_returned > 0:
                        sale['status'] = 'Partially Returned'
                    else:
                        sale['status'] = 'Completed' if d.get('status') == 'Completed' else 'Dispatched'
                    expanded_sales.append(sale)
            else:
                narration = d.get('narration') or ''
                import re
                match = re.search('\\[CHALLAN:\\s*([^\\]]+)\\]', narration)
                if not match:
                    match = re.search('\\[INVOICE:\\s*([^\\]]+)\\]', narration)
                d['challanNumber'] = match.group(1) if match else (d.get('invoiceNumber') or '')
                d['customerName'] = d.get('partyName') or d.get('customerName') or ''
                d['partyName'] = d['customerName']
                d['driverMobileNumber'] = d.get('driverMobile') or _extract_order_tag(narration, 'DRIVER MOBILE') or ''
                d['driverMobile'] = d.get('driverMobile') or d['driverMobileNumber']
                d['vehicleNumber'] = d.get('vehicleNumber') or _extract_order_tag(narration, 'VEHICLE') or ''
                d['driverName'] = d.get('driverName') or _extract_order_tag(narration, 'DRIVER') or ''
                d['warehouseName'] = d.get('warehouseName') or d.get('dispatchWarehouse') or _extract_order_tag(narration, 'WAREHOUSE') or ''
                disp_date_str = d.get('dispatchDate') or _extract_order_tag(narration, 'DISPATCH DATE') or ''
                order_date_str = d.get('date') or ''
                d['dispatchDate'] = disp_date_str
                d['orderDate'] = order_date_str
                d['date'] = disp_date_str or order_date_str
                d['netAmount'] = d.get('grandTotal') or 0.0
                total_profit = 0.0
                order_items = d.get('items') or []
                for item in order_items:
                    qty = item.get('qty') or 0
                    price = item.get('price') or 0.0
                    prod_id = item.get('productId')
                    prod = prod_map.get(prod_id)
                    cost_price = float(prod.rate or 0) * 0.7 if prod else 0.0
                    item_revenue = qty * price
                    item_cost = qty * cost_price
                    total_profit += item_revenue - item_cost
                d['totalProfit'] = max(0.0, total_profit)
                expanded_sales.append(d)
        return send_success(expanded_sales, 'Sales transactions fetched')
    elif request.method == 'POST':
        data = request.data.copy()
        if not data.get('companyId') and _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        if not data.get('soEmail') and request.user.email:
            data['soEmail'] = request.user.email
        import uuid
        if 'id' not in data or not data['id']:
            data['id'] = 'c' + uuid.uuid4().hex[:23]
        if 'orderId' not in data or not data['orderId']:
            import random
            data['orderId'] = f'ORD-2026-{random.randint(1000, 9999)}'
        items_list = data.get('items', [])
        for item in items_list:
            if 'id' not in item or not item['id']:
                item['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = OrderSerializer(data=data)
        if not serializer.is_valid():
            return send_error(f'Validation failed: {serializer.errors}', 400)
        order = serializer.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                pass
        return send_success(serializer.data, 'Sale recorded successfully', 201)

def _smart_parse_date(d_str):
    if not d_str:
        return None
    d_str = str(d_str).strip()
    from django.utils.dateparse import parse_datetime, parse_date
    from datetime import datetime, time
    from django.utils import timezone
    dt = parse_datetime(d_str)
    if dt:
        return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
    d = parse_date(d_str)
    if d:
        return timezone.make_aware(datetime.combine(d, time.min))
    import re
    m = re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', d_str)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        hr = int(m.group(4)) if m.group(4) else 0
        mn = int(m.group(5)) if m.group(5) else 0
        sc = int(m.group(6)) if m.group(6) else 0
        try:
            d_val = datetime(year, month, day, hr, mn, sc)
            return timezone.make_aware(d_val) if timezone.is_naive(d_val) else d_val
        except ValueError:
            pass
    return None

@api_view(['PUT', 'DELETE'])
def transaction_sales_detail(request, pk):
    from api.models import Order
    try:
        order = get_tenant_model_cross_db(Order, pk, 'orderitem_set')
    except Order.DoesNotExist:
        return send_error('Sale record not found', 404)
    if request.method == 'PUT':
        data = request.data.copy()
        import uuid
        if 'items' in data:
            valid_items = [i for i in data.get('items', []) if i.get('productId') and str(i.get('productId')).strip()]
            if not valid_items and order.orderitem_set.exists():
                data.pop('items', None)
            else:
                for item in valid_items:
                    if 'id' not in item or not item['id']:
                        item['id'] = 'c' + uuid.uuid4().hex[:23]
                data['items'] = valid_items
        if data.get('dispatchDate'):
            from api.views import _append_order_tags
            dt_disp = _smart_parse_date(data.get('dispatchDate'))
            disp_val = dt_disp.strftime('%Y-%m-%d') if dt_disp else str(data.get('dispatchDate')).strip()
            data['dispatchDate'] = disp_val
            raw_narr = data.get('narration') or order.narration or ''
            data['narration'] = _append_order_tags(raw_narr, {'DISPATCH DATE': disp_val})
        if data.get('date'):
            dt_ord = _smart_parse_date(data.get('date'))
            if dt_ord:
                data['date'] = dt_ord.isoformat()
        serializer = OrderSerializer(order, data=data, partial=True)
        if not serializer.is_valid():
            return send_error(f'Validation failed: {serializer.errors}', 400)
        updated_order = serializer.save()
        if data.get('dispatchDate'):
            disp_val = str(data.get('dispatchDate')).strip()
            updated_order.dispatchdate = disp_val
            updated_order.save(update_fields=['dispatchdate', 'narration'])
            from api.models import Dispatchlog
            dl = Dispatchlog.objects.filter(orderid=updated_order).first()
            if dl:
                dt_obj = _smart_parse_date(disp_val)
                if dt_obj:
                    dl.dispatchdate = dt_obj
                    dl.save(update_fields=['dispatchdate'])
        updated_order.refresh_from_db()
        return send_success(OrderSerializer(updated_order).data, 'Sale updated successfully')
    elif request.method == 'DELETE':
        # Snapshot deleted sales order for Deleted Sales audit
        order_items_list = list(order.orderitem_set.select_related('productid').all())
        deleted_items_snapshot = []
        for oi in order_items_list:
            p = getattr(oi, 'productid', None)
            deleted_items_snapshot.append({
                'productId': getattr(oi, 'productid_id', ''),
                'productName': getattr(p, 'name', 'Unknown') if p else 'Unknown',
                'productCode': getattr(p, 'productcode', '') if p else '',
                'qty': float(getattr(oi, 'qty', 0) or 0),
                'unitPrice': float(getattr(oi, 'unitprice', 0) or 0),
                'amount': float(getattr(oi, 'amount', 0) or 0),
            })

        party = getattr(order, 'partyid', None)
        cust_name = getattr(party, 'name', '') if party else getattr(order, 'partyname', '')
        user_name = getattr(request.user, 'name', None) or getattr(request.user, 'email', 'Unknown User')
        user_email = getattr(request.user, 'email', '')
        company_id = getattr(order, 'companyid_id', None) or getattr(request.user, 'companyid_id', None) or getattr(request.user, 'companyId', None)
        order_no = getattr(order, 'orderid', '') or str(order.id)

        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(
                user=request.user,
                user_email=user_email,
                user_name=user_name,
                user_role=getattr(request.user, 'role', 'USER'),
                company_id=company_id,
                log_type='ACTION',
                feature='Deleted Sales',
                action='DELETE_SALE',
                details={
                    'type': 'SALE',
                    'orderId': str(order.id),
                    'orderNo': order_no,
                    'customerName': cust_name,
                    'date': str(order.date or ''),
                    'grandTotal': float(order.grandtotal or 0),
                    'deletedAt': timezone.now().isoformat(),
                    'deletedBy': user_name,
                    'deletedByEmail': user_email,
                    'items': deleted_items_snapshot,
                }
            )
        except Exception as log_err:
            print('[LOG ERROR] Could not log deleted sale:', log_err)

        # Delete any related Stocktransaction records (both SALE and DISPATCH)
        try:
            from api.models import Stocktransaction
            Stocktransaction.objects.filter(
                Q(referenceid__in=[str(order.id), str(order.orderid or '')]) |
                Q(reason__icontains=str(order.orderid or '___NONE___')),
                transactiontype__in=['SALE', 'DISPATCH']
            ).delete()
        except Exception as st_err:
            print('[STOCK CLEANUP ERROR] Could not clean sale stock transaction:', st_err)

        order.orderitem_set.all().delete()
        order.delete()
        return send_success(None, 'Sale deleted successfully')

@api_view(['GET'])
def transaction_approvals(request):
    from api.models import Userwarehouseaccess, Warehouse, Order
    user_id = request.user.id
    has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
    assigned_wh_ids = []
    if has_wh_assignments and request.user.role == 'INVENTORY':
        assigned_wh_ids = list(Userwarehouseaccess.objects.filter(userid_id=user_id).values_list('warehouseid_id', flat=True))
    company_id = getattr(request.user, 'companyid_id', getattr(request.user, 'companyId', None))
    all_approvals = []
    qs = Order.objects.all()
    if company_id:
        qs = qs.filter(companyid_id=company_id)
    all_approvals.extend(OrderSerializer(qs, many=True, context={'skip_stock': True}).data)
    mapped_approvals = []
    for order in all_approvals:
        mapped_approvals.append({'id': order.get('id'), 'type': 'SALES_ORDER', 'referenceId': order.get('orderId'), 'customerName': order.get('partyName'), 'soName': order.get('soEmail'), 'grandTotal': order.get('grandTotal'), 'status': order.get('status') or 'Pending', 'createdAt': order.get('createdAt'), 'warehouseId': order.get('assignedWarehouse')})
    return send_success(mapped_approvals, 'Approvals fetched successfully')
from api.db_router import get_tenant_model_cross_db

@api_view(['GET'])
def transaction_approval_detail(request, pk):
    try:
        user_id = request.user.id
        from api.models import Userwarehouseaccess, Order
        has_wh_assignments = Userwarehouseaccess.objects.filter(userid_id=user_id).exists()
        order = get_tenant_model_cross_db(Order, pk)
        serializer = OrderSerializer(order, context={'skip_stock': True})
        mapped = {'id': serializer.data.get('id'), 'type': 'SALES_ORDER', 'referenceId': serializer.data.get('orderId'), 'customerName': serializer.data.get('partyName'), 'soName': serializer.data.get('soEmail'), 'grandTotal': serializer.data.get('grandTotal'), 'status': serializer.data.get('status') or 'Pending', 'createdAt': serializer.data.get('createdAt'), 'data': serializer.data}
        return send_success(mapped, 'Approval detail fetched')
    except Order.DoesNotExist:
        return send_success(None, 'Approval detail fetched')

@api_view(['POST'])
def transaction_approve(request, pk):
    if pk.startswith('st_'):
        from api.models import Stocktransaction
        st = None
        try:
            st = Stocktransaction.objects.get(id=pk)
        except Stocktransaction.DoesNotExist:
            try:
                sts = Stocktransaction.objects.filter(referenceid=pk)
                if sts.exists():
                    st = sts.first()
            except Exception:
                pass
        except Exception:
            pass

        if not st:
            return send_error('Production transaction not found', 404)
            
        try:
            Stocktransaction.objects.filter(id=pk).update(reason='APPROVED', approved_by_id=request.user.id)
            Stocktransaction.objects.filter(referenceid=pk).update(reason='APPROVED', approved_by_id=request.user.id)
        except Exception as e:
            pass
        return send_success({'id': pk, 'status': 'Approved'}, 'Production approved successfully')

    from api.models import Order
    try:
        order = get_tenant_model_cross_db(Order, pk, 'orderitem_set')
        order.status = 'Approved'
        order.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                pass
        serializer = OrderSerializer(order)
        return send_success(serializer.data, 'Order approved successfully')
    except Order.DoesNotExist:
        return send_error('Order not found', 404)

@api_view(['POST'])
def transaction_dispatch(request, pk):
    from api.models import Order
    try:
        order = get_tenant_model_cross_db(Order, pk, 'orderitem_set')
    except Order.DoesNotExist:
        return send_error('Order not found', 404)
    data = request.data.copy()
    dispatch_date = data.get('dispatchDate') or data.get('dispatch_date')
    invoice_number = data.get('invoiceNumber') or data.get('invoice_number')
    warehouse_id = data.get('warehouseId') or data.get('warehouse_id')
    vehicle_number = str(data.get('vehicleNumber') or data.get('vehicle_number') or '').strip().upper()
    driver_name = data.get('driverName') or data.get('driver_name')
    driver_mobile = data.get('driverMobileNumber') or data.get('driver_mobile_number')
    missing = []
    for label, value in [('Dispatch Date', dispatch_date), ('Invoice Number', invoice_number), ('Warehouse', warehouse_id), ('Vehicle Number', vehicle_number), ('Driver Name', driver_name), ('Driver Mobile Number', driver_mobile)]:
        if not value:
            missing.append(label)
    if missing:
        return send_error(f"Missing required fields: {', '.join(missing)}", 400)
    warehouse_name = ''
    try:
        warehouse = resolve_warehouse(warehouse_id)
        warehouse_name = warehouse.name if warehouse else str(warehouse_id)
    except Exception:
        warehouse_name = str(warehouse_id)
        warehouse = None
        
    if warehouse:
        from api.serializers import ProductSerializer
        from api.models import Product
        shortages = []
        for item in order.orderitem_set.all():
            if item.productid_id:
                try:
                    prod = Product.objects.get(id=item.productid_id)
                    serializer = ProductSerializer(prod, context={'warehouse': warehouse})
                    avail = float(serializer.data.get('availableStock') or 0)
                    if avail < float(item.qty or 0):
                        shortages.append({'product': prod.name, 'required': float(item.qty), 'available': avail})
                except Exception:
                    pass
        if shortages:
            msg = ', '.join([s['product'] + ' (Req: ' + str(s['required']) + ', Avail: ' + str(s['available']) + ')' for s in shortages])
            return send_error(f"Insufficient stock for: {msg}", 400)

    from django.utils import timezone
    order.status = 'Completed'
    order.invoicenumber = invoice_number
    order.vehiclenumber = vehicle_number
    order.drivername = driver_name
    order.drivermobile = driver_mobile
    order.dispatchwarehouse = warehouse_name
    order.dispatchdate = dispatch_date
    remarks = data.get('remarks')
    if remarks:
        order.narration = _append_order_tags(order.narration, {'DISPATCH REMARKS': remarks})
    elif order.narration:
        order.narration = _get_clean_narration_helper(order.narration)
    order.updatedat = timezone.now()
    order.save()
    for item in order.orderitem_set.all():
        if item.productid_id:
            pass
    serializer = OrderSerializer(order)
    return send_success(serializer.data, 'Order dispatched successfully')

@api_view(['POST'])
def transaction_reject(request, pk):
    if pk.startswith('st_'):
        from api.models import Stocktransaction
        st = None
        try:
            st = Stocktransaction.objects.get(id=pk)
        except Stocktransaction.DoesNotExist:
            try:
                sts = Stocktransaction.objects.filter(referenceid=pk)
                if sts.exists():
                    st = sts.first()
            except Exception:
                pass
        except Exception:
            pass

        if not st:
            return send_error('Production transaction not found', 404)
            
        try:
            Stocktransaction.objects.filter(id=pk).update(reason='REJECTED', approved_by_id=request.user.id)
            Stocktransaction.objects.filter(referenceid=pk).update(reason='REJECTED', approved_by_id=request.user.id)
        except Exception as e:
            pass
        return send_success({'id': pk, 'status': 'Rejected'}, 'Production rejected successfully')

    from api.models import Order
    try:
        order = get_tenant_model_cross_db(Order, pk, 'orderitem_set')
        order.status = 'Cancelled'
        from django.utils import timezone
        order.narration = _append_order_tags(order.narration, {'REJECTION REASON': 'Rejected by Admin', 'REJECTION DATE': timezone.now().strftime('%Y-%m-%d')})
        order.save()
        for item in order.orderitem_set.all():
            if item.productid_id:
                pass
        serializer = OrderSerializer(order)
        return send_success(serializer.data, 'Order rejected successfully')
    except Order.DoesNotExist:
        return send_error('Order not found', 404)



@api_view(['GET', 'PUT', 'DELETE'])
def transaction_dispatch_log_detail(request, pk):
    from api.models import Dispatchlog, Dispatchlogitem, Orderitem
    from api.db_router import get_tenant_model_cross_db
    try:
        dispatch_log = get_tenant_model_cross_db(Dispatchlog, pk, 'items')
    except Dispatchlog.DoesNotExist:
        return send_error('Dispatch log not found', 404)
    if request.method == 'GET':
        return send_success(None, 'Fetched dispatch log')
    elif request.method == 'PUT':
        data = request.data
        dispatch_log.invoicenumber = data.get('invoiceNumber', dispatch_log.invoicenumber)
        dispatch_log.vehiclenumber = data.get('vehicleNumber', dispatch_log.vehiclenumber)
        dispatch_log.drivername = data.get('driverName', dispatch_log.drivername)
        dispatch_log.drivermobile = data.get('driverMobile') or data.get('driverMobileNumber') or dispatch_log.drivermobile
        dispatch_log.remarks = data.get('remarks', dispatch_log.remarks)
        disp_raw = data.get('dispatchDate') or data.get('date')
        dt_obj = None
        if disp_raw:
            try:
                dt_obj = _smart_parse_date(disp_raw)
                if dt_obj:
                    dispatch_log.dispatchdate = dt_obj
                    if getattr(dispatch_log, 'orderid', None):
                        try:
                            from api.views import _append_order_tags
                            ord_obj = dispatch_log.orderid
                            iso_d = dt_obj.strftime('%Y-%m-%d')
                            ord_obj.dispatchdate = iso_d
                            ord_obj.narration = _append_order_tags(ord_obj.narration or '', {'DISPATCH DATE': iso_d})
                            ord_obj.save(update_fields=['dispatchdate', 'narration'])
                        except Exception:
                            pass
            except Exception:
                pass
        if data.get('orderDate') and getattr(dispatch_log, 'orderid', None):
            try:
                od_parsed = _smart_parse_date(data.get('orderDate'))
                if od_parsed:
                    ord_obj = dispatch_log.orderid
                    ord_obj.date = od_parsed
                    ord_obj.save(update_fields=['date'])
            except Exception:
                pass
        old_items = list(dispatch_log.items.all())
        
        order_item_q = Orderitem.objects.filter(orderid=dispatch_log.orderid_id)
        order_item_map = {oi.productid_id: oi for oi in order_item_q}
        
        for old_item in old_items:
            oi = order_item_map.get(old_item.productid_id)
            if oi:
                oi.sentqty = max(0, oi.sentqty - old_item.qty)
                oi.save()
        dispatch_log.items.all().delete()
        items_list = data.get('items', [])
        import uuid
        for item in items_list:
            p_id = item.get('productId') or item.get('product_id')
            qty = int(item.get('qty', 0))
            if qty > 0:
                Dispatchlogitem.objects.create(id='c' + uuid.uuid4().hex[:23], dispatchlogid=dispatch_log, productid_id=p_id, qty=qty)
                oi = order_item_map.get(p_id)
                if oi:
                    oi.sentqty += qty
                    oi.save()
        dispatch_log.save()
        all_pids = set([i.productid_id for i in old_items] + [i.get('productId') or i.get('product_id') for i in items_list])
        for pid in all_pids:
            if pid:
                pass
        order = dispatch_log.orderid
        all_dispatched = True
        for oi in order.orderitem_set.all():
            if oi.sentqty < oi.qty:
                all_dispatched = False
                break
        order.status = 'Completed' if all_dispatched else 'Partially Dispatched'
        if data.get('partyName') or data.get('customerName'):
            order.partyname = data.get('partyName') or data.get('customerName')
        if data.get('invoiceNumber'):
            order.invoicenumber = data.get('invoiceNumber')
        if data.get('vehicleNumber'):
            order.vehiclenumber = data.get('vehicleNumber')
        if data.get('driverName'):
            order.drivername = data.get('driverName')
        if data.get('driverMobile') or data.get('driverMobileNumber'):
            order.drivermobile = data.get('driverMobile') or data.get('driverMobileNumber')
        rem = data.get('remarks') or data.get('narration')
        if rem is not None:
            order.narration = rem
            dispatch_log.remarks = rem
        wh_id = data.get('warehouse_id') or data.get('warehouseId') or data.get('assignedWarehouse')
        if wh_id:
            from api.models import Warehouse
            wh_obj = Warehouse.objects.filter(id=wh_id).first()
            if wh_obj:
                order.warehouseid = wh_obj
                order.dispatchwarehouse = wh_obj.name
                dispatch_log.warehouseid = wh_obj
        order_date_raw = data.get('orderDate') or data.get('saleDate')
        if order_date_raw:
            od_dt = _smart_parse_date(order_date_raw)
            if od_dt:
                order.date = od_dt
        if dt_obj:
            order.dispatchdate = dt_obj.strftime('%Y-%m-%d')
        elif disp_raw:
            order.dispatchdate = str(disp_raw).strip()
        order.save()
        return send_success(None, 'Dispatch transaction updated')
    elif request.method == 'DELETE':
        order = dispatch_log.orderid
        old_items = list(dispatch_log.items.select_related('productid').all())
        order_item_q = Orderitem.objects.filter(orderid=dispatch_log.orderid_id)
        order_item_map = {oi.productid_id: oi for oi in order_item_q}
        for old_item in old_items:
            oi = order_item_map.get(old_item.productid_id)
            if oi:
                oi.sentqty = max(0, oi.sentqty - old_item.qty)
                oi.save(update_fields=['sentqty'])

        # 1. Snapshot deleted dispatch for the Deleted Sales audit view
        deleted_items_snapshot = []
        for di in old_items:
            p = getattr(di, 'productid', None)
            deleted_items_snapshot.append({
                'productId': getattr(di, 'productid_id', ''),
                'productName': getattr(p, 'name', 'Unknown') if p else 'Unknown',
                'productCode': getattr(p, 'productcode', '') if p else '',
                'qty': float(getattr(di, 'qty', 0) or 0),
            })

        invoice_no = dispatch_log.invoicenumber or ''
        order_no = getattr(order, 'orderid', '') or str(getattr(order, 'id', ''))
        cust_name = ''
        if order:
            party = getattr(order, 'partyid', None)
            cust_name = getattr(party, 'name', '') if party else getattr(order, 'partyname', '')

        user_name = getattr(request.user, 'name', None) or getattr(request.user, 'email', 'Unknown User')
        user_email = getattr(request.user, 'email', '')
        company_id = getattr(order, 'companyid_id', None) or getattr(request.user, 'companyid_id', None) or getattr(request.user, 'companyId', None)

        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(
                user=request.user,
                user_email=user_email,
                user_name=user_name,
                user_role=getattr(request.user, 'role', 'USER'),
                company_id=company_id,
                log_type='ACTION',
                feature='Deleted Sales',
                action='DELETE_DISPATCH',
                details={
                    'type': 'DISPATCH',
                    'dispatchLogId': str(dispatch_log.id),
                    'orderId': str(order.id) if order else '',
                    'orderNo': order_no,
                    'invoiceNumber': invoice_no,
                    'customerName': cust_name,
                    'dispatchDate': str(dispatch_log.dispatchdate or ''),
                    'vehicleNumber': dispatch_log.vehiclenumber or '',
                    'driverName': dispatch_log.drivername or '',
                    'remarks': dispatch_log.remarks or '',
                    'deletedAt': timezone.now().isoformat(),
                    'deletedBy': user_name,
                    'deletedByEmail': user_email,
                    'items': deleted_items_snapshot,
                }
            )
        except Exception as log_err:
            print('[LOG ERROR] Could not log deleted dispatch:', log_err)

        # 2. Reverse and remove Stocktransaction records created for this dispatch
        try:
            from api.models import Stocktransaction
            st_filter = Q(transactiontype='DISPATCH') & (
                Q(referenceid__in=[str(dispatch_log.id), str(invoice_no), str(getattr(order, 'id', '')), str(getattr(order, 'orderid', ''))])
            )
            if invoice_no:
                st_filter |= (Q(transactiontype='DISPATCH') & Q(reason__icontains=invoice_no))
            if order_no:
                st_filter |= (Q(transactiontype='DISPATCH') & Q(reason__icontains=order_no))

            Stocktransaction.objects.filter(st_filter).delete()
        except Exception as st_err:
            print('[STOCK CLEANUP ERROR] Could not delete dispatch stock transactions:', st_err)

        # 3. Clean up StockLedgerEntry if applicable
        try:
            from api.models import StockLedgerEntry
            StockLedgerEntry.objects.filter(
                voucher_type__in=['SALES_DISPATCH', 'DISPATCH'],
                voucher_id__in=[str(dispatch_log.id), str(invoice_no), str(getattr(order, 'id', '')), str(getattr(order, 'orderid', ''))]
            ).delete()
        except Exception as sle_err:
            pass

        dispatch_log.items.all().delete()
        dispatch_log.delete()

        if order:
            any_dispatched = False
            all_dispatched = True
            for oi in order.orderitem_set.all():
                if oi.sentqty > 0:
                    any_dispatched = True
                if oi.sentqty < oi.qty:
                    all_dispatched = False
            if not any_dispatched:
                order.status = 'Approved'
            else:
                order.status = 'Completed' if all_dispatched else 'Partially Dispatched'
            order.save()

        return send_success(None, 'Dispatch transaction deleted and stock ledger reversed successfully')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_deleted_sales(request):
    """
    Returns audit trail of deleted sales and dispatches for the tenant company.
    Combines Activitylog entries and automatically heals/includes any orphaned dispatch transactions.
    """
    try:
        company_id = _get_company_id(request)
        user_role = (getattr(request.user, 'role', '') or '').upper()

        # 1. Fetch from Activitylog with feature='Deleted Sales'
        from api.models import Activitylog
        qs = Activitylog.objects.filter(feature='Deleted Sales')
        if company_id and user_role != 'SUPERADMIN':
            qs = qs.filter(companyid_id=company_id)

        search = (request.query_params.get('search') or '').strip().lower()

        results = []
        logged_keys = set()

        for log in qs.order_by('-createdat')[:300]:
            try:
                details = json.loads(log.details_json) if log.details_json else {}
            except Exception:
                details = {}

            invoice_val = details.get('invoiceNumber') or '—'
            order_no_val = details.get('orderNo') or details.get('orderNumber') or '—'
            entry = {
                'id': log.id,
                'source': 'ACTIVITY_LOG',
                'type': details.get('type') or ('DISPATCH' if 'DISPATCH' in log.action else 'SALE'),
                'orderId': details.get('orderId') or '',
                'orderNo': order_no_val,
                'invoiceNumber': invoice_val,
                'customerName': details.get('customerName') or '—',
                'dispatchDate': details.get('dispatchDate') or details.get('date') or '',
                'vehicleNumber': details.get('vehicleNumber') or '—',
                'driverName': details.get('driverName') or '—',
                'remarks': details.get('remarks') or log.action or '',
                'deletedAt': details.get('deletedAt') or log.createdat.isoformat(),
                'deletedBy': details.get('deletedBy') or log.user_name or log.user_email or 'Kiran',
                'deletedByEmail': details.get('deletedByEmail') or log.user_email or '',
                'items': details.get('items') or [],
                'grandTotal': details.get('grandTotal') or 0,
            }
            results.append(entry)
            logged_keys.add(f"{invoice_val}_{order_no_val}")

        # 2. Self-heal and surface any orphaned or soft-deleted Stocktransactions (e.g. past deletions before logging)
        try:
            from api.models import Stocktransaction, Dispatchlog
            orphaned_st_qs = Stocktransaction.objects.filter(
                transactiontype='DISPATCH'
            ).select_related('productid', 'warehouseid')
            if company_id:
                orphaned_st_qs = orphaned_st_qs.filter(productid__companyid_id=company_id)

            for st in orphaned_st_qs:
                ref = str(st.referenceid or '').strip()
                has_dl = False
                if ref:
                    has_dl = Dispatchlog.objects.filter(
                        Q(id=ref) | Q(invoicenumber=ref) | Q(orderid__orderid=ref) | Q(orderid__id=ref)
                    ).exists()
                if not has_dl and st.reason:
                    import re
                    inv_match = re.search(r'Invoice:\s*([^\)]+)', st.reason)
                    if inv_match:
                        inv_val = inv_match.group(1).strip()
                        if inv_val and inv_val != '-':
                            has_dl = Dispatchlog.objects.filter(invoicenumber=inv_val).exists()
                    if not has_dl:
                        ord_match = re.search(r'Dispatched Order\s+([^\s\(]+)', st.reason)
                        if ord_match:
                            ord_target = ord_match.group(1).strip()
                            has_dl = Dispatchlog.objects.filter(
                                Q(orderid__orderid=ord_target) | Q(orderid__id=ord_target)
                            ).exists()
                            if not has_dl:
                                ord_obj = Order.objects.filter(Q(orderid=ord_target) | Q(id=ord_target)).first()
                                if ord_obj and ord_obj.status in ['Dispatched', 'Completed', 'Partially Dispatched', 'Delivered']:
                                    has_dl = True

                if not has_dl:
                    # Mark orphaned stock transaction as deleted so stock ledger does not debit it
                    if not st.is_deleted:
                        st.is_deleted = True
                        st.delete_reason = 'Deleted dispatch auto-healed'
                        st.save(update_fields=['is_deleted', 'delete_reason'])

                    # Extract invoice and order from reason
                    import re
                    inv_m = re.search(r'Invoice:\s*([^\)]+)', st.reason or '')
                    inv_found = inv_m.group(1).strip() if inv_m else '—'
                    ord_m = re.search(r'Dispatched Order\s+([^\s\(]+)', st.reason or '')
                    ord_found = ord_m.group(1).strip() if ord_m else (ref or '—')

                    key = f"{inv_found}_{ord_found}"
                    if key not in logged_keys:
                        p_name = st.productid.name if st.productid else 'Product'
                        p_code = st.productid.productcode if st.productid else ''
                        results.append({
                            'id': f"st_{st.id}",
                            'source': 'STOCK_TRANSACTION',
                            'type': 'DISPATCH',
                            'orderId': ref,
                            'orderNo': ord_found,
                            'invoiceNumber': inv_found,
                            'customerName': '—',
                            'dispatchDate': st.createdat.strftime('%Y-%m-%d') if st.createdat else '',
                            'vehicleNumber': '—',
                            'driverName': '—',
                            'remarks': st.reason or 'Deleted Dispatch Entry',
                            'deletedAt': st.createdat.isoformat() if st.createdat else timezone.now().isoformat(),
                            'deletedBy': 'Kiran (Auto-Recovered)',
                            'deletedByEmail': '',
                            'items': [{
                                'productId': st.productid_id,
                                'productName': p_name,
                                'productCode': p_code,
                                'qty': abs(float(st.quantity or 0))
                            }],
                            'grandTotal': 0
                        })
                        logged_keys.add(key)
        except Exception as heal_err:
            print('[SELF-HEAL ERROR] Could not scan orphaned dispatch transactions:', heal_err)

        if search:
            results = [
                r for r in results
                if search in str(r.get('orderNo', '')).lower()
                or search in str(r.get('invoiceNumber', '')).lower()
                or search in str(r.get('customerName', '')).lower()
                or search in str(r.get('deletedBy', '')).lower()
                or any(search in str(i.get('productName', '')).lower() for i in r.get('items', []))
            ]

        # Sort newest first
        results.sort(key=lambda x: str(x.get('deletedAt', '')), reverse=True)
        return send_success(results, 'Deleted sales fetched successfully')
    except Exception as e:
        return send_error(f'Failed to fetch deleted sales: {str(e)}', 500)

