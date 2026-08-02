import uuid
import logging
from decimal import Decimal
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response

from api.models import Lead, LeadFollowUp, LeadStageHistory, Dealer
from api.serializers import LeadSerializer, LeadFollowUpSerializer, LeadStageHistorySerializer
from api.permissions import IsLeadOwnerOrAdmin
from api.services.lead_pipeline_service import LeadPipelineService
from api.services.cache_keys import CRMCacheKeys
from api.views import send_success, send_error, _get_company_id, _get_request_warehouse_ids, _fy_date_filter

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
        with transaction.atomic():
            lead = Lead.all_objects.select_related('assigned_to', 'companyid').select_for_update().get(pk=pk)
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
            existing_dealer = Dealer.objects.select_for_update().filter(companyid=lead.companyid, dealername=lead.company_name or lead.name).first()
            if existing_dealer:
                return send_error(f"A dealer named '{existing_dealer.dealername}' already exists in your company records.", 400)
            dealer_id = 'c' + uuid.uuid4().hex[:23]
            dealer = Dealer.objects.create(id=dealer_id, dealercode=f'DLR-{uuid.uuid4().hex[:6].upper()}', dealername=lead.company_name or lead.name, city='Default City', assignedsoemail=lead.assigned_to.email, distributorname='Select Distributor', creditlimit=LeadPipelineService.quantize_decimal(50000.0), outstanding=LeadPipelineService.quantize_decimal(0.0), active=True, companyid=lead.companyid, converted_lead=lead)
            old_status = lead.status
            lead.status = 'WON'
            lead.updated_by_id = request.user.id
            lead.updatedat = timezone.now()
            lead.version += 1
            lead.save()
            LeadStageHistory.objects.create(id='h' + uuid.uuid4().hex[:23], lead=lead, old_status=old_status, new_status='WON', changed_by_id=request.user.id)
            LeadFollowUp.objects.create(id='f' + uuid.uuid4().hex[:23], lead=lead, type='MEETING', notes=f'Converted lead to active Dealer record: {dealer.dealername} ({dealer.dealercode}).', created_by_id=request.user.id)
        return send_success({'leadId': lead.id, 'dealerId': dealer.id, 'dealerCode': dealer.dealercode}, 'Lead converted to active Dealer successfully')

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
