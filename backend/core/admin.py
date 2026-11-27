from django import forms
from django.contrib import admin, messages
from django.db import models
from django.db.models import Q
from django.shortcuts import redirect, render
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from datetime import timedelta
import json
import uuid
import bcrypt
from core.models import Company, TenantUserMapping, User, Warehouse, Broadcast

admin.site.site_header = "Simply Useful • Platform Admin"
admin.site.site_title = "Simply Useful Admin"
admin.site.index_title = "Platform Command Center"

_orig_each_context = admin.site.each_context


def _su_each_context(request):
    ctx = _orig_each_context(request)
    if request.path.rstrip('/') == '/admin':
        try:
            now = timezone.now()
            total = Company.objects.count()
            active = Company.objects.filter(active=True).filter(Q(valid_until__isnull=True) | Q(valid_until__gt=now)).count()
            superadmins = TenantUserMapping.objects.filter(role='SUPERADMIN', active=True).count()
            ctx['su_stats'] = {
                'total_companies': total,
                'active_companies': active,
                'inactive_or_expired': max(0, total - active),
                'superadmin_count': superadmins,
            }
        except Exception:
            ctx['su_stats'] = {}
    return ctx


admin.site.each_context = _su_each_context


class CompanyAdminForm(forms.ModelForm):
    class Meta:
        model = Company
        fields = '__all__'
        widgets = {
            'name': forms.TextInput(attrs={'placeholder': 'Company / Organization Name'}),
            'skuprefix': forms.TextInput(attrs={'placeholder': 'e.g. KCPL'}),
            'schemaname': forms.TextInput(attrs={'readonly': 'readonly'}),
            'stockmethod': forms.Select(choices=[
                ('FIFO', 'FIFO (First In, First Out)'),
                ('LIFO', 'LIFO (Last In, First Out)'),
                ('AVG', 'Weighted Average'),
            ]),
            'settings_json': forms.Textarea(attrs={'rows': 4}),
        }


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    form = CompanyAdminForm
    list_display = (
        'name',
        'skuprefix',
        'schemaname_display',
        'superadmin_email',
        'active',
        'subscription_status_badge',
        'activated_at',
        'valid_until',
        'createdat',
    )
    list_editable = ('active',)
    list_filter = ('active', 'schemaname', 'stockmethod', 'createdat')
    search_fields = ('name', 'skuprefix', 'schemaname', 'id')
    readonly_fields = ('id', 'createdat', 'updatedat', 'subscription_status_badge')
    ordering = ('-createdat',)

    fieldsets = (
        ('Organization Identity', {
            'fields': ('id', 'name', 'skuprefix', 'schemaname', 'stockmethod')
        }),
        ('Subscription & Access Control (Offline Billing)', {
            'description': 'Control whether this tenant can access the platform and set expiration dates for offline payments.',
            'fields': ('active', 'subscription_status_badge', 'activated_at', 'valid_until')
        }),
        ('Settings & Metadata', {
            'classes': ('collapse',),
            'fields': ('settings_json', 'createdat', 'updatedat')
        }),
    )

    actions = [
        'activate_companies',
        'suspend_companies',
        'extend_30_days',
        'extend_90_days',
        'extend_365_days',
    ]

    def superadmin_email(self, obj):
        mapping = TenantUserMapping.objects.filter(companyid=obj.id, role='SUPERADMIN').first()
        if mapping:
            return mapping.email
        from core.models import User
        user = User.objects.filter(companyid=obj.id, role='SUPERADMIN').first()
        return user.email if user else '-'
    superadmin_email.short_description = 'Superadmin / Owner'

    def schemaname_display(self, obj):
        schema = obj.schemaname or 'public'
        color = '#10b981' if schema != 'public' else '#6b7280'
        return format_html(
            '<span style="font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: {}; color: white;">{}</span>',
            color,
            schema
        )
    schemaname_display.short_description = 'DB Schema'

    def subscription_status_badge(self, obj):
        now = timezone.now()
        if not obj.active:
            return mark_safe(
                '<span style="background: #ef4444; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">🔴 SUSPENDED</span>'
            )
        if obj.valid_until:
            if now > obj.valid_until:
                diff = now - obj.valid_until
                days_ago = diff.days
                return format_html(
                    '<span style="background: #dc2626; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">⚠️ EXPIRED ({}d ago)</span>',
                    days_ago
                )
            else:
                remaining = obj.valid_until - now
                days_left = remaining.days
                color = '#10b981' if days_left > 7 else '#f59e0b'
                return format_html(
                    '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">🟢 ACTIVE ({}d left)</span>',
                    color,
                    days_left
                )
        return mark_safe(
            '<span style="background: #3b82f6; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">♾️ ACTIVE (No Expiry)</span>'
        )
    subscription_status_badge.short_description = 'Subscription Status'

    @admin.action(description='🟢 Activate selected companies')
    def activate_companies(self, request, queryset):
        updated = queryset.update(active=True, activated_at=timezone.now())
        self.message_user(request, f"Activated {updated} company workspace(s).")

    @admin.action(description='🔴 Suspend selected companies (Block access)')
    def suspend_companies(self, request, queryset):
        updated = queryset.update(active=False)
        self.message_user(request, f"Suspended {updated} company workspace(s). Users will be blocked from logging in.")

    @admin.action(description='⏳ Extend subscription by 30 Days (+1 Month)')
    def extend_30_days(self, request, queryset):
        now = timezone.now()
        count = 0
        for comp in queryset:
            base_date = comp.valid_until if comp.valid_until and comp.valid_until > now else now
            comp.valid_until = base_date + timedelta(days=30)
            comp.active = True
            comp.save(update_fields=['valid_until', 'active'])
            count += 1
        self.message_user(request, f"Extended subscription for {count} company(s) by 30 days.")

    @admin.action(description='⏳ Extend subscription by 90 Days (+3 Months)')
    def extend_90_days(self, request, queryset):
        now = timezone.now()
        count = 0
        for comp in queryset:
            base_date = comp.valid_until if comp.valid_until and comp.valid_until > now else now
            comp.valid_until = base_date + timedelta(days=90)
            comp.active = True
            comp.save(update_fields=['valid_until', 'active'])
            count += 1
        self.message_user(request, f"Extended subscription for {count} company(s) by 90 days.")

    @admin.action(description='⏳ Extend subscription by 365 Days (+1 Year)')
    def extend_365_days(self, request, queryset):
        now = timezone.now()
        count = 0
        for comp in queryset:
            base_date = comp.valid_until if comp.valid_until and comp.valid_until > now else now
            comp.valid_until = base_date + timedelta(days=365)
            comp.active = True
            comp.save(update_fields=['valid_until', 'active'])
            count += 1
        self.message_user(request, f"Extended subscription for {count} company(s) by 365 days.")

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('onboard/', self.admin_site.admin_view(self.onboard_company_view), name='core_company_onboard'),
        ]
        return custom_urls + urls

    def onboard_company_view(self, request):
        from api.models import Userwarehouseaccess
        from api.tenant_manager import (
            generate_tenant_schema_name, provision_tenant_schema,
            set_tenant_search_path, reset_search_path, seed_tenant_default_master_data,
        )

        context = {
            **self.admin_site.each_context(request),
            'title': 'Onboard New Company',
            'opts': self.model._meta,
            'form_data': {},
        }

        if request.method == 'POST':
            company_name = (request.POST.get('company_name') or '').strip()
            admin_email = (request.POST.get('admin_email') or '').strip().lower()
            admin_password = request.POST.get('admin_password') or ''
            admin_name = (request.POST.get('admin_name') or '').strip() or f"{company_name} Admin"
            sku_prefix = (request.POST.get('sku_prefix') or '').strip().upper()
            warehouse_name = (request.POST.get('warehouse_name') or 'MAIN WAREHOUSE').strip().upper()
            stock_method = (request.POST.get('stock_method') or 'FIFO').strip().upper()
            phone = (request.POST.get('phone') or '').strip()
            gst = (request.POST.get('gst') or '').strip()
            address = (request.POST.get('address') or '').strip()
            try:
                valid_days = max(1, int(request.POST.get('valid_days') or 30))
            except ValueError:
                valid_days = 30

            context['form_data'] = request.POST

            if not company_name:
                messages.error(request, 'Company Name is required.')
                return render(request, 'admin/core/company/onboard_company.html', context)
            if not admin_email:
                messages.error(request, 'Owner Login Email is required.')
                return render(request, 'admin/core/company/onboard_company.html', context)
            if len(admin_password) < 6:
                messages.error(request, 'Owner Password must be at least 6 characters.')
                return render(request, 'admin/core/company/onboard_company.html', context)

            if not sku_prefix:
                sku_prefix = ''.join(c for c in company_name.upper() if c.isalnum())[:4] or 'CO'

            reset_search_path()
            if TenantUserMapping.objects.filter(email=admin_email).exists() or User.objects.filter(email=admin_email).exists():
                messages.error(request, f"An account with email '{admin_email}' already exists.")
                return render(request, 'admin/core/company/onboard_company.html', context)
            if Company.objects.filter(name__iexact=company_name).exists():
                messages.error(request, f"A company named '{company_name}' already exists.")
                return render(request, 'admin/core/company/onboard_company.html', context)

            try:
                company_id = f"cmp_{uuid.uuid4().hex[:16]}"
                schema_name = generate_tenant_schema_name(company_name, company_id)

                prov = provision_tenant_schema(schema_name)
                if not prov.get('success'):
                    messages.error(request, f"Schema provisioning failed: {prov.get('message', 'Unknown error')}")
                    return render(request, 'admin/core/company/onboard_company.html', context)

                reset_search_path()
                now = timezone.now()
                settings_dict = {
                    'company_name': company_name,
                    'company_phone': phone,
                    'company_gst': gst,
                    'company_address': address,
                }
                company = Company.objects.create(
                    id=company_id,
                    name=company_name,
                    skuprefix=sku_prefix,
                    stockmethod=stock_method,
                    schemaname=schema_name,
                    active=True,
                    activated_at=now,
                    valid_until=now + timedelta(days=valid_days),
                    settings_json=json.dumps(settings_dict),
                )

                set_tenant_search_path(schema_name)
                next_wh_id = (Warehouse.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
                warehouse = Warehouse.objects.create(
                    id=next_wh_id,
                    companyid_id=company.id,
                    name=warehouse_name,
                    location=f"{company_name} Primary Facility",
                    active=True,
                )

                hashed_pw = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
                user = User.objects.create(
                    id=f"usr_{uuid.uuid4().hex[:16]}",
                    email=admin_email,
                    name=admin_name,
                    hashedpassword=hashed_pw,
                    role='SUPERADMIN',
                    companyid_id=company.id,
                    active=True,
                )
                Userwarehouseaccess.objects.create(userid=user, warehouseid=warehouse)
                seed_tenant_default_master_data(schema_name, company)

                reset_search_path()
                TenantUserMapping.objects.create(
                    email=admin_email,
                    companyid=company.id,
                    schemaname=schema_name,
                    role='SUPERADMIN',
                    active=True,
                )

                messages.success(
                    request,
                    f"Company '{company_name}' onboarded! Schema: {schema_name} • Superadmin: {admin_email}",
                )
                return redirect('admin:core_company_changelist')
            except Exception as exc:
                reset_search_path()
                messages.error(request, f"Onboarding failed: {exc}")

        return render(request, 'admin/core/company/onboard_company.html', context)


@admin.register(TenantUserMapping)
class TenantUserMappingAdmin(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': forms.TextInput()},
    }
    list_display = (
        'email',
        'company_name_display',
        'schemaname_badge',
        'role',
        'active',
        'createdat',
    )
    list_filter = ('active', 'schemaname')
    search_fields = ('email', 'companyid', 'schemaname')
    ordering = ('-createdat',)

    def get_queryset(self, request):
        """
        Only show SUPERADMIN main accounts of tenant companies.
        Sub-users (sales, production, staff) are internal credentials of tenant companies
        and must never be disclosed in the master administration panel.
        """
        qs = super().get_queryset(request)
        return qs.filter(role='SUPERADMIN')

    def company_name_display(self, obj):
        try:
            comp = Company.objects.filter(id=obj.companyid).first()
            if comp:
                return f"{comp.name} ({comp.skuprefix})"
        except Exception:
            pass
        return obj.companyid
    company_name_display.short_description = 'Company / Organization'

    def schemaname_badge(self, obj):
        schema = obj.schemaname or 'public'
        color = '#10b981' if schema != 'public' else '#6b7280'
        return format_html(
            '<span style="font-family: monospace; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: {}; color: white;">{}</span>',
            color,
            schema
        )
    schemaname_badge.short_description = 'DB Schema'


@admin.register(Broadcast)
class BroadcastAdmin(admin.ModelAdmin):
    list_display = ('id', 'message_snippet', 'target_role', 'author', 'company', 'active', 'created_at')
    list_filter = ('active', 'target_role', 'created_at')
    search_fields = ('message', 'author')

    def message_snippet(self, obj):
        msg = obj.message or ''
        return (msg[:60] + '...') if len(msg) > 60 else msg
    message_snippet.short_description = 'Message'
