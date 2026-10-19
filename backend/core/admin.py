from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from datetime import timedelta
from core.models import Company, TenantUserMapping, User, Warehouse, Broadcast


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
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


@admin.register(TenantUserMapping)
class TenantUserMappingAdmin(admin.ModelAdmin):
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
