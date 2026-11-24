import uuid
import logging
from decimal import Decimal
from datetime import datetime, date, timedelta, time
from django.db import IntegrityError, transaction, models
from django.db.models import (
    Sum, Count, Q, Max, F, Case, When, Value, IntegerField, FloatField, ExpressionWrapper
)
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response

from api.models import (
    Lead, LeadFollowUp, LeadStageHistory, Dealer, Distributor,
    Order, Orderitem, SalesTarget, PaymentReceipt, Visit, DailyTourPlanStop
)
from core.models import User, Company
from api.serializers import LeadSerializer, LeadFollowUpSerializer, LeadStageHistorySerializer
from api.permissions import IsLeadOwnerOrAdmin
from api.services.lead_pipeline_service import LeadPipelineService
from api.services.cache_keys import CRMCacheKeys
from api.views import send_success, send_error, _get_company_id, _get_request_warehouse_ids, _fy_date_filter
from api.views_sales_target import (
    get_dispatched_qty_expr, get_dispatched_val_expr, _get_fiscal_year_label, _get_month_date_range
)

class LeadConversionThrottle(UserRateThrottle):
    rate = '1000/hour'

class LeadFollowUpThrottle(UserRateThrottle):
    rate = '10000/hour'

class LeadDashboardThrottle(UserRateThrottle):
    rate = '1000/min'

class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsLeadOwnerOrAdmin]
    serializer_class = LeadSerializer

    def get_object(self):
        from api.db_router import get_tenant_model_cross_db
        from django.http import Http404
        pk = self.kwargs.get('pk')
        try:
            obj = get_tenant_model_cross_db(Lead, pk)
        except Lead.DoesNotExist:
            raise Http404('Lead not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        company_id = _get_company_id(self.request)
        user_role = (getattr(self.request.user, 'role', '') or '').upper()
        qs = Lead.objects.filter(companyid_id=company_id) if company_id else Lead.objects.all()
        SALES_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER']
        if user_role in SALES_ROLES:
            qs = qs.filter(assigned_to_id=self.request.user.id)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(models.Q(name__icontains=search) | models.Q(company_name__icontains=search) | models.Q(phone__icontains=search) | models.Q(email__icontains=search))
        return qs.select_related('assigned_to', 'created_by', 'companyid').prefetch_related('followups', 'stage_history')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = _fy_date_filter(request, queryset, date_field='createdat')
        serializer = self.get_serializer(queryset, many=True)
        return send_success(serializer.data, 'Leads fetched successfully')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return send_success(serializer.data, 'Lead retrieved successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        data['id'] = 'c' + uuid.uuid4().hex[:23]
        serializer = LeadSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(created_by_id=request.user.id)
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='CRM', action=f"Created CRM Lead: {serializer.data.get('name')} ({serializer.data.get('company_name', '')})", details=serializer.data)
        except IntegrityError:
            return send_error('An active lead with this email or phone number already exists in your company records.', 409)
        return send_success(serializer.data, 'Lead created successfully', 201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        old_status = instance.status
        new_status = request.data.get('status') or old_status
        client_version = request.data.get('version')
        if client_version is not None:
            try:
                client_version = int(client_version)
            except (ValueError, TypeError):
                return send_error('Invalid version payload', 400)
        else:
            client_version = instance.version
        if old_status != new_status:
            success, detail = LeadPipelineService.transition_lead(instance, new_status, request.user.id, client_version)
            if not success:
                if detail == 'STALE_WRITE':
                    latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                    return Response({'success': False, 'errorCode': 'STALE_WRITE', 'message': 'Lead was modified by another user.', 'latestVersion': latest.version, 'updatedAt': latest.updatedat.isoformat() if latest.updatedat else None, 'updatedBy': latest.updated_by.name if latest.updated_by else 'System'}, status=status.HTTP_409_CONFLICT)
                return send_error(detail, 400)
            instance.refresh_from_db()
            client_version = instance.version
        data = request.data.copy()
        if _get_company_id(request):
            data['companyId'] = _get_company_id(request)
        if 'value' in data:
            data['value'] = LeadPipelineService.quantize_decimal(data['value'])
        from django.db.models import F
        try:
            with transaction.atomic():
                serializer = LeadSerializer(instance, data=data, partial=partial)
                serializer.is_valid(raise_exception=True)
                updated = Lead.objects.filter(pk=instance.pk, version=client_version).update(name=serializer.validated_data.get('name', instance.name), company_name=serializer.validated_data.get('company_name', instance.company_name), email=serializer.validated_data.get('email', instance.email), phone=serializer.validated_data.get('phone', instance.phone), priority=serializer.validated_data.get('priority', instance.priority), source=serializer.validated_data.get('source', instance.source), city=serializer.validated_data.get('city', instance.city), state=serializer.validated_data.get('state', instance.state), pincode=serializer.validated_data.get('pincode', instance.pincode), value=serializer.validated_data.get('value', instance.value), notes=serializer.validated_data.get('notes', instance.notes), assigned_to_id=serializer.validated_data.get('assigned_to_id', instance.assigned_to_id), updated_by_id=request.user.id, updatedat=timezone.now(), version=F('version') + 1)
                if updated == 0:
                    latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                    return Response({'success': False, 'errorCode': 'STALE_WRITE', 'message': 'Lead was modified by another user.', 'latestVersion': latest.version, 'updatedAt': latest.updatedat.isoformat() if latest.updatedat else None, 'updatedBy': latest.updated_by.name if latest.updated_by else 'System'}, status=status.HTTP_409_CONFLICT)
        except IntegrityError:
            return send_error('An active lead with this email or phone number already exists in your company records.', 409)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='CRM', action=f"Updated CRM Lead: {instance.name} (Status: {instance.status})", details=request.data)
        except Exception:
            pass
        return send_success(serializer.data, 'Lead updated successfully')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(user=request.user, log_type='ACTION', feature='CRM', action=f"Archived CRM Lead: {instance.name}")
        except Exception:
            pass
        return send_success(None, 'Lead archived successfully')

    @action(detail=True, methods=['patch'], url_path='move')
    def move_stage(self, request, pk=None):
        """Lightweight API endpoint optimized for frontend Kanban drag & drop transitions"""
        instance = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return send_error('Status field is required', 400)
        client_version = request.data.get('version')
        if client_version is not None:
            try:
                client_version = int(client_version)
            except (ValueError, TypeError):
                return send_error('Invalid version payload', 400)
        else:
            client_version = instance.version
        success, detail = LeadPipelineService.transition_lead(instance, new_status, request.user.id, client_version)
        if not success:
            if detail == 'STALE_WRITE':
                latest = Lead.all_objects.select_related('updated_by').get(pk=instance.pk)
                return Response({'success': False, 'errorCode': 'STALE_WRITE', 'message': 'Lead was modified by another user.', 'latestVersion': latest.version, 'updatedAt': latest.updatedat.isoformat() if latest.updatedat else None, 'updatedBy': latest.updated_by.name if latest.updated_by else 'System'}, status=status.HTTP_409_CONFLICT)
            return send_error(detail, 400)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return send_success(serializer.data, 'Lead stage updated successfully')

    @action(detail=True, methods=['post'], url_path='followup', throttle_classes=[LeadFollowUpThrottle])
    def add_followup(self, request, pk=None):
        lead = self.get_object()
        data = request.data.copy()
        data['id'] = 'f' + uuid.uuid4().hex[:23]
        data['leadId'] = lead.id
        serializer = LeadFollowUpSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by_id=request.user.id)
        from django.db.models import F
        Lead.objects.filter(pk=lead.id).update(updatedat=timezone.now(), version=F('version') + 1)
        lead.refresh_from_db()
        return send_success(serializer.data, 'Follow-up logged successfully', 201)

    @action(detail=True, methods=['post'], url_path='convert', throttle_classes=[LeadConversionThrottle])
    def convert_to_dealer(self, request, pk=None):
        from api.models import Dealer
        try:
            with transaction.atomic():
                try:
                    lead = Lead.all_objects.select_related('assigned_to', 'companyid').select_for_update().get(pk=pk)
                except Lead.DoesNotExist:
                    return send_error('Lead not found', 404)

                if lead.status == 'WON' or Dealer.objects.filter(converted_lead=lead).exists():
                    return send_error('Lead has already been converted to a dealer', 400)
                if lead.status == 'LOST':
                    return send_error('A lost lead cannot be converted to a dealer', 400)
                if not lead.phone:
                    return send_error('Lead phone number is required for dealer creation', 400)
                if not lead.company_name and (not lead.name):
                    return send_error('Company name or contact name is required', 400)
                if not lead.assigned_to_id:
                    return send_error('Lead must have an assigned sales manager before converting', 400)

                existing_dealer = Dealer.objects.select_for_update().filter(
                    companyid=lead.companyid,
                    dealername=lead.company_name or lead.name
                ).first()
                if existing_dealer:
                    return send_error(f"A dealer named '{existing_dealer.dealername}' already exists in your company records.", 400)

                dealer_id = 'c' + uuid.uuid4().hex[:23]
                assigned_so_list = [lead.assigned_to.email] if (lead.assigned_to and getattr(lead.assigned_to, 'email', None)) else []

                dealer = Dealer.objects.create(
                    id=dealer_id,
                    dealercode=f'DLR-{uuid.uuid4().hex[:6].upper()}',
                    dealername=lead.company_name or lead.name,
                    city=getattr(lead, 'city', None) or 'Default City',
                    assignedsoemails=assigned_so_list,
                    distributorname='Select Distributor',
                    creditlimit=LeadPipelineService.quantize_decimal(50000.0),
                    outstanding=LeadPipelineService.quantize_decimal(0.0),
                    active=True,
                    party_type='DEALER',
                    phone=lead.phone or '',
                    email=getattr(lead, 'email', None) or '',
                    contact_person=lead.name or '',
                    address=getattr(lead, 'address', None) or '',
                    companyid=lead.companyid,
                    converted_lead=lead
                )

                old_status = lead.status
                lead.status = 'WON'
                lead.updated_by_id = request.user.id
                lead.updatedat = timezone.now()
                lead.version += 1
                lead.save()

                LeadStageHistory.objects.create(
                    id='h' + uuid.uuid4().hex[:23],
                    lead=lead,
                    old_status=old_status,
                    new_status='WON',
                    changed_by_id=request.user.id
                )
                LeadFollowUp.objects.create(
                    id='f' + uuid.uuid4().hex[:23],
                    lead=lead,
                    type='MEETING',
                    notes=f'Converted lead to active Dealer record: {dealer.dealername} ({dealer.dealercode}).',
                    created_by_id=request.user.id
                )

            return send_success({
                'leadId': lead.id,
                'dealerId': dealer.id,
                'dealerCode': dealer.dealercode
            }, 'Lead converted to active Dealer successfully')
        except Exception as e:
            return send_error(f'Failed to convert lead to dealer: {str(e)}', 500)

    @action(detail=False, methods=['get'], url_path='dashboard', throttle_classes=[LeadDashboardThrottle])
    def get_dashboard_metrics(self, request):
        from django.db.models import Sum, Count
        from django.core.cache import cache
        company_id = _get_company_id(self.request)
        cache_key = CRMCacheKeys.dashboard(company_id)
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return send_success(cached_stats, 'CRM dashboard metrics retrieved from cache')
        leads = Lead.objects.filter(is_deleted=False)
        if company_id:
            leads = leads.filter(companyid_id=company_id)
        metrics = leads.aggregate(total_leads=Count('id'), won_leads=Count('id', filter=models.Q(status='WON')), pipeline_value=Sum('value', filter=models.Q(status__in=['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION'])), high_priority=Count('id', filter=models.Q(priority='HIGH')))
        total_leads = metrics['total_leads'] or 0
        won_leads = metrics['won_leads'] or 0
        pipeline_value = float(metrics['pipeline_value'] or 0.0)
        high_priority = metrics['high_priority'] or 0
        overdue = LeadFollowUp.objects.select_related('lead').filter(next_followup_date__lt=timezone.now())
        if company_id:
            overdue = overdue.filter(lead__companyid_id=company_id)
        overdue_followups = overdue.count()
        stats = {'totalLeads': total_leads, 'wonLeads': won_leads, 'pipelineValue': pipeline_value, 'highPriority': high_priority, 'overdueFollowups': overdue_followups}
        cache.set(cache_key, stats, timeout=300)
        return send_success(stats, 'CRM analytics dashboard stats computed successfully')

    @action(detail=False, methods=['get'], url_path='unified-hub')
    def unified_hub(self, request):
        """
        Unified Enterprise CRM Intelligence Hub:
        Integrates:
          1. New Inquiries & Lead Pipeline (Lead to Won)
          2. Existing Territory Dealers & Counter Network (with live credit limit & payment clearance status)
          3. Sales Officer Daily SOP ("Idea of Working") & Prioritized Morning Playbook
          4. Live Sales Targets vs Confirmed Dispatch Run-Rate & Daily Target to Hit 100%
          5. Algorithmic Target Recommendation Engine for Management & Officers
        """
        company_id = _get_company_id(request)
        user = request.user
        user_role = (getattr(user, 'role', '') or '').strip().upper()
        is_admin = getattr(user, 'is_superuser', False) or user_role in {
            'SUPERUSER', 'SUPER_USER', 'SUPERADMIN', 'ADMIN', 'DIRECTOR', 'MANAGER', 'HR', 'VP'
        }

        # Date & Period resolution
        today_date = timezone.now().date()
        try:
            year = int(request.query_params.get('year', today_date.year))
            month = int(request.query_params.get('month', today_date.month))
        except (ValueError, TypeError):
            year = today_date.year
            month = today_date.month

        start_date, end_date, start_dt, end_dt = _get_month_date_range(year, month)
        fy_label = _get_fiscal_year_label(date(year, month, 1))

        # Officer Scoping
        so_roles = {'SALES', 'SALES_OFFICER', 'SALES OFFICER', 'SALES_EXECUTIVE', 'SALES EXECUTIVE', 'SO'}
        company_officers = User.objects.filter(companyid_id=company_id, active=True).order_by('name')
        sales_officers_list = [
            {
                'id': u.id,
                'name': u.name or u.email,
                'email': u.email,
                'role': u.role,
                'territory': u.territory or 'General',
                'monthlytarget': float(u.monthlytarget or 0.0)
            }
            for u in company_officers
            if (u.role or '').strip().upper() in so_roles or 'SALES' in (u.role or '').upper()
        ]

        target_user = None
        so_id = request.query_params.get('so_id', '').strip()
        if is_admin:
            if so_id and so_id != 'all':
                target_user = User.objects.filter(id=so_id, companyid_id=company_id).first()
            elif not so_id and sales_officers_list:
                first_so_id = sales_officers_list[0]['id']
                target_user = User.objects.filter(id=first_so_id, companyid_id=company_id).first()
        else:
            target_user = user

        target_officer_info = {
            'id': target_user.id,
            'name': target_user.name or target_user.email,
            'email': target_user.email,
            'role': target_user.role,
            'territory': target_user.territory or 'General',
            'monthlytarget': float(target_user.monthlytarget or 0.0),
        } if target_user else None

        # 1. INQUIRIES & LEAD PIPELINE
        leads_qs = Lead.objects.filter(is_deleted=False, companyid_id=company_id)
        if target_user:
            leads_qs = leads_qs.filter(assigned_to_id=target_user.id)

        stages_breakdown = {}
        for st_code, st_label in Lead.STATUS_CHOICES:
            st_leads = leads_qs.filter(status=st_code)
            stages_breakdown[st_code] = {
                'code': st_code,
                'label': st_label,
                'count': st_leads.count(),
                'total_value': float(st_leads.aggregate(s=Sum('value'))['s'] or 0.0)
            }

        total_inquiries = leads_qs.count()
        won_inquiries = stages_breakdown.get('WON', {}).get('count', 0)
        active_pipeline_val = float(leads_qs.filter(status__in=['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION']).aggregate(s=Sum('value'))['s'] or 0.0)
        high_priority_count = leads_qs.filter(priority='HIGH', status__in=['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION']).count()

        now_dt = timezone.now()
        overdue_qs = LeadFollowUp.objects.filter(
            lead__companyid_id=company_id,
            lead__is_deleted=False,
            next_followup_date__lt=now_dt
        ).select_related('lead').order_by('next_followup_date')
        if target_user:
            overdue_qs = overdue_qs.filter(lead__assigned_to_id=target_user.id)

        overdue_followups = []
        for fu in overdue_qs[:25]:
            days_overdue = (now_dt - fu.next_followup_date).days if fu.next_followup_date else 0
            overdue_followups.append({
                'followup_id': fu.id,
                'lead_id': fu.lead.id,
                'lead_name': fu.lead.name,
                'company_name': fu.lead.company_name or '',
                'phone': fu.lead.phone or '',
                'type': fu.type,
                'next_followup_date': fu.next_followup_date.isoformat() if fu.next_followup_date else '',
                'days_overdue': max(1, days_overdue),
                'notes': fu.notes,
                'lead_priority': fu.lead.priority,
                'lead_status': fu.lead.status,
            })

        recent_inquiries = []
        for l in leads_qs.order_by('-createdat')[:10]:
            recent_inquiries.append({
                'id': l.id,
                'name': l.name,
                'company_name': l.company_name or '',
                'phone': l.phone or '',
                'city': l.city or '',
                'source': l.source or 'Direct',
                'status': l.status,
                'priority': l.priority,
                'value': float(l.value or 0.0),
                'created_at': l.createdat.isoformat() if l.createdat else '',
            })

        # 2. EXISTING TERRITORY DEALERS & PAYMENT CLEARANCE
        dealers_qs = Dealer.objects.filter(companyid_id=company_id, active=True)
        if target_user and target_user.email:
            u_email_clean = target_user.email.strip().lower()
            dealers_qs = dealers_qs.filter(assignedsoemails__icontains=u_email_clean)

        orders_map = {}
        all_orders_qs = Order.objects.filter(companyid_id=company_id).exclude(
            status__in=['Cancelled', 'Rejected']
        ).values('partyname', 'date', 'grandtotal', 'id').order_by('date')
        for o in all_orders_qs:
            pname = (o['partyname'] or '').strip().lower()
            if pname:
                orders_map[pname] = {
                    'id': o['id'],
                    'date': o['date'].isoformat() if o['date'] else None,
                    'amount': float(o['grandtotal'] or 0.0),
                    'raw_date': o['date']
                }

        dealers_data = []
        total_dealers = 0
        active_dealers = 0
        reorder_due_dealers = 0
        dormant_dealers = 0
        blocked_dealers = 0
        near_limit_dealers = 0
        tot_outstanding = 0.0
        tot_credit_limit = 0.0
        tot_headroom = 0.0

        for d in dealers_qs:
            total_dealers += 1
            cl = float(d.creditlimit or 0.0)
            out = float(d.outstanding or 0.0)
            headroom = max(0.0, cl - out)
            util_pct = round((out / cl * 100.0), 1) if cl > 0 else (100.0 if out > 0 else 0.0)

            tot_outstanding += out
            tot_credit_limit += cl
            tot_headroom += headroom

            if out > cl and cl > 0:
                credit_status = 'BLOCKED'
                payment_clearance = 'PAYMENT_DUE'
                blocked_dealers += 1
            elif util_pct >= 85:
                credit_status = 'WARNING'
                payment_clearance = 'APPROVAL_REQUIRED'
                near_limit_dealers += 1
            else:
                credit_status = 'SAFE'
                payment_clearance = 'CLEARED'

            dname_lower = (d.dealername or '').strip().lower()
            last_order_info = orders_map.get(dname_lower)
            days_since_order = None
            if last_order_info and last_order_info.get('raw_date'):
                ord_date = last_order_info['raw_date'].date() if hasattr(last_order_info['raw_date'], 'date') else last_order_info['raw_date']
                days_since_order = (today_date - ord_date).days

            if days_since_order is not None:
                if days_since_order <= 30:
                    activity_status = 'ACTIVE'
                    active_dealers += 1
                elif days_since_order <= 60:
                    activity_status = 'REORDER_DUE'
                    reorder_due_dealers += 1
                else:
                    activity_status = 'DORMANT'
                    dormant_dealers += 1
            else:
                activity_status = 'DORMANT'
                dormant_dealers += 1

            dealers_data.append({
                'id': d.id,
                'code': d.dealercode,
                'name': d.dealername,
                'city': d.city or '—',
                'phone': d.phone or '',
                'email': d.email or '',
                'contact_person': d.contact_person or '',
                'brand': d.brand or '',
                'distributor_name': d.distributorname or '',
                'credit_limit': cl,
                'outstanding': out,
                'available_credit': headroom,
                'utilization_pct': util_pct,
                'credit_status': credit_status,
                'payment_clearance': payment_clearance,
                'last_order_date': last_order_info['date'] if last_order_info else None,
                'last_order_amount': last_order_info['amount'] if last_order_info else 0.0,
                'days_since_last_order': days_since_order,
                'activity_status': activity_status,
            })

        dealers_summary = {
            'total_dealers': total_dealers,
            'active_dealers': active_dealers,
            'reorder_due_dealers': reorder_due_dealers,
            'dormant_dealers': dormant_dealers,
            'blocked_dealers': blocked_dealers,
            'near_limit_dealers': near_limit_dealers,
            'total_outstanding': tot_outstanding,
            'total_credit_limit': tot_credit_limit,
            'total_available_credit': tot_headroom,
        }

        # 3. SALES OFFICER DAILY SOP ("IDEA OF WORKING")
        credit_alerts = [d for d in dealers_data if d['credit_status'] in ('BLOCKED', 'WARNING')]
        credit_alerts.sort(key=lambda x: (x['credit_status'] != 'BLOCKED', -x['outstanding']))

        reorder_candidates = [d for d in dealers_data if d['activity_status'] == 'REORDER_DUE' and d['credit_status'] == 'SAFE']
        reorder_candidates.sort(key=lambda x: (x['days_since_last_order'] or 999))

        closing_leads = []
        for l in leads_qs.filter(status__in=['PROPOSAL', 'NEGOTIATION']).order_by('-value')[:10]:
            closing_leads.append({
                'id': l.id,
                'name': l.name,
                'company_name': l.company_name or '',
                'phone': l.phone or '',
                'status': l.status,
                'value': float(l.value or 0.0),
                'city': l.city or '',
                'priority': l.priority,
            })

        daily_sop = {
            'priorities': {
                'payment_clearance_queue': credit_alerts[:8],
                'overdue_followups_queue': overdue_followups[:8],
                'reorder_due_queue': reorder_candidates[:8],
                'negotiation_deals_queue': closing_leads[:8],
            },
            'guidelines': [
                {
                    'step': 1,
                    'title': 'Payment Clearance & Credit Recovery',
                    'action': 'Contact dealers with blocked credit or utilization > 85% to collect payment before dispatches.',
                    'urgency': 'HIGH' if blocked_dealers > 0 else 'NORMAL',
                    'count': blocked_dealers + near_limit_dealers,
                },
                {
                    'step': 2,
                    'title': 'Inquiry Follow-up Pipeline',
                    'action': 'Reach out to overdue leads and hot prospects to advance proposals to Won.',
                    'urgency': 'HIGH' if len(overdue_followups) > 0 else 'NORMAL',
                    'count': len(overdue_followups),
                },
                {
                    'step': 3,
                    'title': 'Counter Reorders & Stock Replenishment',
                    'action': 'Call counters due for replenishment (30-60 days inactive) to secure fresh bookings.',
                    'urgency': 'NORMAL',
                    'count': reorder_due_dealers,
                },
                {
                    'step': 4,
                    'title': 'Daily Run-Rate Discipline',
                    'action': 'Book enough volume daily to meet your month-end revenue and bag quotas.',
                    'urgency': 'NORMAL',
                    'count': 1,
                }
            ]
        }

        # 4. TARGET PROGRESS & RUN-RATE ENGINE
        st = None
        if target_user:
            st = SalesTarget.objects.filter(
                companyid_id=company_id,
                user_id=target_user.id,
                fiscal_year=fy_label,
                month=month
            ).first()

        tgt_revenue = st.target_revenue if (st and st.target_revenue > 0) else float(target_user.monthlytarget or 500000.0) if target_user else 500000.0
        product_targets = st.product_targets if (st and st.product_targets) else []
        sum_prod_targets = sum(float(pt.get('target_qty') or 0.0) for pt in product_targets)
        if sum_prod_targets > 0:
            tgt_bags = sum_prod_targets
        elif st and st.target_bags > 0:
            tgt_bags = st.target_bags
        else:
            tgt_bags = round(tgt_revenue / 400.0, 0) if tgt_revenue else 1250.0

        tgt_collection = st.target_collection if (st and st.target_collection > 0) else round(tgt_revenue * 0.5, 2)
        tgt_visits = st.target_visits if st else 80
        tgt_new_dealers = st.target_new_dealers if st else 3

        actual_revenue = 0.0
        actual_bags = 0.0
        actual_collection = 0.0
        actual_visits = 0.0
        actual_new_dealers = 0.0

        if target_user:
            u_email = (target_user.email or '').strip()
            so_orders = Order.objects.filter(
                Q(soemail=target_user) | Q(soemail__email__iexact=u_email),
                companyid_id=company_id,
                date__gte=start_dt,
                date__lte=end_dt
            ).exclude(status__in=['Cancelled', 'Rejected'])

            ann_items = Orderitem.objects.filter(
                orderid__in=list(so_orders.values_list('id', flat=True))
            ).annotate(
                dq=get_dispatched_qty_expr(),
                dv=get_dispatched_val_expr()
            )
            actual_bags = float(ann_items.aggregate(s=Sum('dq'))['s'] or 0.0)
            actual_revenue = float(ann_items.aggregate(s=Sum('dv'))['s'] or 0.0)

            c_qs = PaymentReceipt.objects.filter(
                Q(submitted_by=target_user) | Q(submitted_by__email__iexact=u_email),
                companyid_id=company_id,
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                status__in=['VERIFIED', 'APPROVED', 'verified', 'approved']
            )
            actual_collection = float(c_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

            actual_visits = Visit.objects.filter(
                Q(soemail=target_user) | Q(soemail__email__iexact=u_email),
                createdat__gte=start_dt,
                createdat__lte=end_dt
            ).count() + DailyTourPlanStop.objects.filter(
                user=target_user, date__gte=start_date, date__lte=end_date, visited=True
            ).count()

            actual_new_dealers = Dealer.objects.filter(
                companyid_id=company_id,
                createdat__gte=start_dt,
                createdat__lte=end_dt,
                assignedsoemails__icontains=u_email
            ).count()

        days_in_month = (end_date - start_date).days + 1
        days_passed = max(1, min(days_in_month, (today_date - start_date).days + 1))
        days_remaining = max(1, days_in_month - days_passed)

        gap_revenue = max(0.0, tgt_revenue - actual_revenue)
        gap_bags = max(0.0, tgt_bags - actual_bags)
        gap_collection = max(0.0, tgt_collection - actual_collection)

        run_rate_revenue = round(gap_revenue / days_remaining, 2)
        run_rate_bags = round(gap_bags / days_remaining, 1)
        run_rate_collection = round(gap_collection / days_remaining, 2)

        # Enterprise Tiered Incentive Scheme Engine
        rev_ach_pct = round((actual_revenue / tgt_revenue * 100.0), 1) if tgt_revenue > 0 else 0.0
        bag_ach_pct = round((actual_bags / tgt_bags * 100.0), 1) if tgt_bags > 0 else 0.0
        overall_fulfillment_pct = round(max(rev_ach_pct, bag_ach_pct) if tgt_bags > 0 else rev_ach_pct, 1)

        incentive_slabs = st.incentive_slabs if (st and st.incentive_slabs) else [
            {'label': 'Base Tier (80-99%)', 'min_pct': 80, 'max_pct': 99.9, 'rate_per_bag': 3},
            {'label': 'Target Achiever (100-119%)', 'min_pct': 100, 'max_pct': 119.9, 'rate_per_bag': 6},
            {'label': 'Super Achiever (120%+)', 'min_pct': 120, 'max_pct': 999, 'rate_per_bag': 10}
        ]
        min_achievement_pct = float(st.min_achievement_pct_for_incentive if st else 80.0)
        min_collection_pct = float(st.min_collection_pct_for_incentive if st else 70.0)
        incentive_per_bag = float(st.incentive_per_bag if st else 0.0)
        incentive_pct_on_revenue = float(st.incentive_pct_on_revenue if st else 0.0)

        active_slab = None
        base_incentive = 0.0
        for slab in incentive_slabs:
            s_min = float(slab.get('min_pct', 0.0))
            s_max = float(slab.get('max_pct', 999.0))
            if s_min <= overall_fulfillment_pct <= s_max:
                active_slab = slab
                base_incentive = round(actual_bags * float(slab.get('rate_per_bag', 0.0)), 2)
                break

        if base_incentive == 0 and overall_fulfillment_pct >= min_achievement_pct:
            if incentive_per_bag > 0 and actual_bags > 0:
                base_incentive += round(actual_bags * incentive_per_bag, 2)
            if incentive_pct_on_revenue > 0 and actual_revenue > 0:
                base_incentive += round(actual_revenue * (incentive_pct_on_revenue / 100.0), 2)

        gross_incentive = round(base_incentive, 2)
        coll_pct = round((actual_collection / tgt_collection * 100.0), 1) if tgt_collection > 0 else 0.0
        is_collection_cleared = coll_pct >= min_collection_pct
        net_incentive = gross_incentive if (is_collection_cleared or gross_incentive == 0) else round(gross_incentive * 0.5, 2)

        # Milestone & Next Tier Boost
        if overall_fulfillment_pct < 80.0:
            bags_to_next = max(1, round(tgt_bags * 0.8 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 3.0, 2)
            next_tier = {
                'tier_name': 'Base Tier (80%)',
                'target_pct': 80.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': potential_payout,
                'headline': f"Sell {bags_to_next} more bags to qualify for ₹{int(potential_payout):,} incentive!",
            }
        elif overall_fulfillment_pct < 100.0:
            bags_to_next = max(1, round(tgt_bags * 1.0 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 6.0, 2)
            next_tier = {
                'tier_name': 'Target Achiever (100%)',
                'target_pct': 100.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': round(potential_payout - net_incentive, 2),
                'headline': f"Sell {bags_to_next} more bags to unlock Target Tier and earn an extra ₹{int(round(potential_payout - net_incentive, 2)):,}!",
            }
        elif overall_fulfillment_pct < 120.0:
            bags_to_next = max(1, round(tgt_bags * 1.2 - actual_bags))
            potential_payout = round((actual_bags + bags_to_next) * 10.0, 2)
            next_tier = {
                'tier_name': 'Super Achiever (120%+)',
                'target_pct': 120.0,
                'bags_needed': bags_to_next,
                'potential_earnings': potential_payout,
                'extra_cash': round(potential_payout - net_incentive, 2),
                'headline': f"Sell {bags_to_next} more bags to unlock Super Achiever Tier (₹10/bag) and earn an extra ₹{int(round(potential_payout - net_incentive, 2)):,}!",
            }
        else:
            next_tier = {
                'tier_name': 'Super Achiever Pinnacle',
                'target_pct': 120.0,
                'bags_needed': 0,
                'potential_earnings': gross_incentive,
                'extra_cash': 0,
                'headline': "Outstanding! You are in the Top Tier of enterprise performance.",
            }

        target_tracker = {
            'period': {
                'month': month,
                'year': year,
                'fiscal_year': fy_label,
                'days_in_month': days_in_month,
                'days_passed': days_passed,
                'days_remaining': days_remaining,
            },
            'revenue': {
                'target': tgt_revenue,
                'actual': actual_revenue,
                'achieved_pct': rev_ach_pct,
                'gap': gap_revenue,
                'daily_run_rate_needed': run_rate_revenue,
            },
            'bags': {
                'target': tgt_bags,
                'actual': actual_bags,
                'achieved_pct': bag_ach_pct,
                'gap': gap_bags,
                'daily_run_rate_needed': run_rate_bags,
            },
            'collection': {
                'target': tgt_collection,
                'actual': actual_collection,
                'achieved_pct': coll_pct,
                'gap': gap_collection,
                'daily_run_rate_needed': run_rate_collection,
            },
            'visits': {
                'target': tgt_visits,
                'actual': actual_visits,
                'achieved_pct': round((actual_visits / tgt_visits * 100.0), 1) if tgt_visits > 0 else 0.0,
            },
            'new_dealers': {
                'target': tgt_new_dealers,
                'actual': actual_new_dealers,
                'achieved_pct': round((actual_new_dealers / tgt_new_dealers * 100.0), 1) if tgt_new_dealers > 0 else 0.0,
            },
            'incentive': {
                'is_hr_approved': bool(st),
                'live_earned': net_incentive,
                'gross_earned': gross_incentive,
                'active_tier': active_slab.get('label') if active_slab else ('Below Threshold (<80%)' if overall_fulfillment_pct < 80 else 'Base Achiever'),
                'overall_fulfillment_pct': overall_fulfillment_pct,
                'safety_gate_cleared': is_collection_cleared,
                'collection_pct': coll_pct,
                'min_collection_pct': min_collection_pct,
                'next_milestone': next_tier,
                'product_quotas': product_targets,
                'slabs': incentive_slabs,
            }
        }

        # 5. TARGET RECOMMENDATION ENGINE ("IDEA ABOUT SETTING TARGETS")
        three_months_ago = start_dt - timedelta(days=90)
        past_orders = Order.objects.filter(
            companyid_id=company_id,
            date__gte=three_months_ago,
            date__lt=start_dt
        ).exclude(status__in=['Cancelled', 'Rejected'])
        if target_user:
            past_orders = past_orders.filter(
                Q(soemail=target_user) | Q(soemail__email__iexact=target_user.email)
            )

        past_items = Orderitem.objects.filter(
            orderid__in=list(past_orders.values_list('id', flat=True))
        ).annotate(
            dq=get_dispatched_qty_expr(),
            dv=get_dispatched_val_expr()
        )
        past_rev = float(past_items.aggregate(s=Sum('dv'))['s'] or 0.0)
        past_bags = float(past_items.aggregate(s=Sum('dq'))['s'] or 0.0)

        # Dynamic Average Order Value (AOV) computed live from actual company orders in database
        company_aov = float(
            Order.objects.filter(companyid_id=company_id)
            .exclude(status__in=['Cancelled', 'Rejected'])
            .aggregate(a=models.Avg('grandtotal'))['a'] or 30000.0
        )
        # Dynamic average product bag rate computed live from actual dispatched items
        company_avg_item_rate = float(
            Orderitem.objects.filter(orderid__companyid_id=company_id)
            .aggregate(a=models.Avg('price'))['a'] or 400.0
        )

        monthly_avg_rev = round(past_rev / 3.0, 2) if past_rev > 0 else (tgt_revenue or (company_aov * 15))
        monthly_avg_bags = round(past_bags / 3.0, 1) if past_bags > 0 else (tgt_bags or round(monthly_avg_rev / company_avg_item_rate, 0))

        # Dynamic Counter Potential computed from actual active & reorder counters multiplied by real database AOV
        counter_potential_rev = max(
            company_aov * 10.0,
            (active_dealers * company_aov * 1.5) + (reorder_due_dealers * company_aov * 1.0)
        )
        recommended_conservative = round(max(monthly_avg_rev * 1.05, counter_potential_rev * 0.85), -3)
        recommended_balanced = round(max(monthly_avg_rev * 1.15, counter_potential_rev * 1.0), -3)
        recommended_aggressive = round(max(monthly_avg_rev * 1.30, counter_potential_rev * 1.25), -3)

        avg_bag_rate = round(monthly_avg_rev / monthly_avg_bags, 1) if (monthly_avg_bags > 0) else company_avg_item_rate

        target_recommendations = {
            'database_metrics': {
                'company_average_order_value': round(company_aov, 2),
                'company_average_item_rate': round(company_avg_item_rate, 2),
                'active_dealers_count': active_dealers,
                'reorder_due_dealers_count': reorder_due_dealers,
            },
            'historical_3m_avg_revenue': monthly_avg_rev,
            'historical_3m_avg_bags': monthly_avg_bags,
            'territory_dealers_count': total_dealers,
            'active_dealers_count': active_dealers,
            'counter_capacity_potential': counter_potential_rev,
            'active_dealers_count': active_dealers,
            'counter_capacity_potential': counter_potential_rev,
            'plans': {
                'conservative': {
                    'label': 'Conservative (+5%)',
                    'revenue': recommended_conservative,
                    'bags': round(recommended_conservative / avg_bag_rate, 0),
                    'collection': round(tot_outstanding * 0.35 + recommended_conservative * 0.45, 0),
                    'visits': 75,
                    'new_dealers': 2,
                    'description': 'Maintains existing dealer volume with modest growth. Ideal for challenging market conditions.'
                },
                'balanced': {
                    'label': 'Balanced Growth (+15%) - Recommended',
                    'revenue': recommended_balanced,
                    'bags': round(recommended_balanced / avg_bag_rate, 0),
                    'collection': round(tot_outstanding * 0.50 + recommended_balanced * 0.50, 0),
                    'visits': 90,
                    'new_dealers': 3,
                    'description': 'Target standard used by high-performing sales officers. Combines reorders with active counter expansion.'
                },
                'aggressive': {
                    'label': 'High Performance / Stretch (+30%)',
                    'revenue': recommended_aggressive,
                    'bags': round(recommended_aggressive / avg_bag_rate, 0),
                    'collection': round(tot_outstanding * 0.65 + recommended_aggressive * 0.55, 0),
                    'visits': 110,
                    'new_dealers': 5,
                    'description': 'High incentive plan. Requires reactivating dormant dealers and closing top negotiation pipeline leads.'
                }
            },
            'rationale': (
                f"Based on {active_dealers} active dealers in territory, 3-month average of ₹{int(monthly_avg_rev):,}/month, "
                f"and ₹{int(tot_outstanding):,} in receivables. Recommending ₹{int(recommended_balanced):,} target with "
                f"₹{int(tot_outstanding * 0.5 + recommended_balanced * 0.5):,} payment recovery to ensure healthy credit flow."
            )
        }

        response_payload = {
            'is_admin': is_admin,
            'target_officer': target_officer_info,
            'sales_officers': sales_officers_list,
            'inquiries': {
                'total_leads': total_inquiries,
                'won_leads': won_inquiries,
                'pipeline_value': active_pipeline_val,
                'high_priority_count': high_priority_count,
                'overdue_count': len(overdue_followups),
                'stages': stages_breakdown,
                'overdue_followups': overdue_followups,
                'recent': recent_inquiries,
            },
            'dealers': {
                'summary': dealers_summary,
                'list': dealers_data,
            },
            'daily_sop': daily_sop,
            'target_tracker': target_tracker,
            'target_recommendations': target_recommendations,
        }

        return send_success(response_payload, 'CRM Unified Hub data computed successfully')

    @action(detail=False, methods=['post'], url_path='sync-inquiries')
    def sync_inquiries(self, request):
        """
        Batch Synchronize & Import New Inquiries from Web, WhatsApp, Forms or CSV.
        Validates, de-duplicates by phone/email, and auto-assigns to the requesting or specified sales officer.
        """
        company_id = _get_company_id(request)
        inquiries = request.data.get('inquiries', [])
        if isinstance(request.data, list):
            inquiries = request.data
        elif isinstance(inquiries, dict) and not isinstance(request.data.get('inquiries'), list):
            inquiries = [inquiries]

        if not inquiries:
            return send_error('No inquiry items provided', 400)

        created_items = []
        skipped_items = []
        user_id = request.user.id

        with transaction.atomic():
            for item in inquiries:
                name = (item.get('name') or '').strip()
                phone = (item.get('phone') or '').strip()
                email = (item.get('email') or '').strip()
                company_name = (item.get('company_name') or item.get('companyName') or '').strip()

                if not name and not company_name:
                    skipped_items.append({'item': item, 'reason': 'Missing contact name or company name'})
                    continue

                dup_filter = models.Q(is_deleted=False, companyid_id=company_id)
                phone_filter = models.Q(phone=phone) if phone else None
                email_filter = models.Q(email__iexact=email) if email else None

                if phone_filter and email_filter:
                    existing = Lead.objects.filter(dup_filter & (phone_filter | email_filter)).first()
                elif phone_filter:
                    existing = Lead.objects.filter(dup_filter & phone_filter).first()
                elif email_filter:
                    existing = Lead.objects.filter(dup_filter & email_filter).first()
                else:
                    existing = None

                if existing:
                    skipped_items.append({
                        'item': item,
                        'reason': f"Duplicate inquiry already active (ID: {existing.id}, Stage: {existing.status})"
                    })
                    continue

                lead_id = 'c' + uuid.uuid4().hex[:23]
                assigned_to_id = item.get('assigned_to') or item.get('assignedTo') or user_id

                lead = Lead.objects.create(
                    id=lead_id,
                    name=name or company_name,
                    company_name=company_name or None,
                    phone=phone or None,
                    email=email or None,
                    city=item.get('city') or '',
                    state=item.get('state') or '',
                    pincode=item.get('pincode') or '',
                    source=item.get('source') or 'Sync / Web Ingestion',
                    status='NEW',
                    priority=item.get('priority', 'MEDIUM'),
                    value=LeadPipelineService.quantize_decimal(item.get('value', 0.0)),
                    notes=item.get('notes') or 'Synchronized from inquiry ingest source.',
                    companyid_id=company_id,
                    assigned_to_id=assigned_to_id,
                    created_by_id=user_id,
                    updated_by_id=user_id,
                )

                LeadStageHistory.objects.create(
                    id='h' + uuid.uuid4().hex[:23],
                    lead=lead,
                    old_status='NEW',
                    new_status='NEW',
                    changed_by_id=user_id
                )

                created_items.append({
                    'id': lead.id,
                    'name': lead.name,
                    'company_name': lead.company_name,
                    'phone': lead.phone,
                    'email': lead.email,
                    'status': lead.status,
                })

        try:
            from api.views_logs import log_activity_internal
            log_activity_internal(
                user=request.user,
                log_type='ACTION',
                feature='CRM',
                action=f"Synced {len(created_items)} new inquiries (Skipped {len(skipped_items)})",
                details={'created_count': len(created_items), 'skipped_count': len(skipped_items)}
            )
        except Exception:
            pass

        return send_success({
            'created_count': len(created_items),
            'skipped_count': len(skipped_items),
            'created': created_items,
            'skipped': skipped_items,
        }, f"Successfully synchronized {len(created_items)} new inquiries.", 201)

    @action(detail=False, methods=['get'], url_path='dealer-quick-lookup')
    def dealer_quick_lookup(self, request):
        """
        Fast autocomplete and payment clearance inspection for a dealer.
        Used by sales officers on-call or creating an order.
        """
        company_id = _get_company_id(request)
        q = (request.query_params.get('q') or '').strip().lower()
        if not q:
            return send_success([], 'No query')

        dealers = Dealer.objects.filter(
            models.Q(companyid_id=company_id) &
            models.Q(active=True) &
            (models.Q(dealername__icontains=q) | models.Q(dealercode__icontains=q) | models.Q(phone__icontains=q))
        )[:10]

        res = []
        for d in dealers:
            cl = float(d.creditlimit or 0.0)
            out = float(d.outstanding or 0.0)
            headroom = max(0.0, cl - out)
            res.append({
                'id': d.id,
                'code': d.dealercode,
                'name': d.dealername,
                'city': d.city,
                'phone': d.phone,
                'credit_limit': cl,
                'outstanding': out,
                'available_credit': headroom,
                'credit_status': 'BLOCKED' if (out > cl and cl > 0) else ('WARNING' if out >= cl * 0.85 else 'SAFE'),
                'payment_clearance': 'PAYMENT_DUE' if (out > cl and cl > 0) else ('APPROVAL_REQUIRED' if out >= cl * 0.85 else 'CLEARED'),
            })
        return send_success(res, 'Dealers found')
