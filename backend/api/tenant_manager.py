import re
import uuid
import logging
from django.db import connection
from core.models import TenantUserMapping, Company

logger = logging.getLogger('tenant_manager')

# System tables that should only exist in the shared public schema
SHARED_PUBLIC_TABLES = {
    'django_migrations',
    'django_content_type',
    'django_session',
    'django_admin_log',
    'TenantUserMapping',
    'Company',
}

def generate_tenant_schema_name(company_name: str, company_id: str = None) -> str:
    """
    Generate a clean, sanitized PostgreSQL schema name for a tenant.
    Example: 'Apex Hardware Ltd' -> 'tenant_apex_hardware_a1b2'
    """
    clean_name = re.sub(r'[^a-z0-9_]', '', (company_name or '').lower().replace(' ', '_').replace('-', '_'))[:20].strip('_')
    if not clean_name:
        clean_name = 'company'
    
    unique_suffix = (company_id or uuid.uuid4().hex)[:6].lower()
    return f"tenant_{clean_name}_{unique_suffix}"


def provision_tenant_schema(schema_name: str) -> dict:
    """
    Provisions a dedicated PostgreSQL schema for a new company.
    Clones all operational tables from public using (LIKE public.table INCLUDING ALL)
    so every company gets its own independent physical tables, indexes, and constraints.
    """
    if not schema_name or schema_name == 'public':
        return {'success': False, 'message': 'Cannot provision public schema as tenant', 'cloned': 0}

    # Sanitize schema_name to prevent SQL injection
    if not re.match(r'^[a-z0-9_]+$', schema_name):
        return {'success': False, 'message': f'Invalid schema name: {schema_name}', 'cloned': 0}

    cloned_tables = []
    errors = []

    with connection.cursor() as cursor:
        try:
            # 1. Create schema
            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
            logger.info(f"[TENANT] Created schema: {schema_name}")

            # 2. Query operational tables from public
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_type = 'BASE TABLE'
            """)
            all_tables = [r[0] for r in cursor.fetchall()]

            # 3. Clone each operational table
            for table in all_tables:
                if table in SHARED_PUBLIC_TABLES:
                    continue
                try:
                    cursor.execute(f'CREATE TABLE IF NOT EXISTS "{schema_name}"."{table}" (LIKE public."{table}" INCLUDING ALL)')
                    cloned_tables.append(table)
                except Exception as table_err:
                    errors.append(f"{table}: {str(table_err)}")
                    logger.warning(f"[TENANT] Failed cloning table {table} to {schema_name}: {table_err}")

            logger.info(f"[TENANT] Successfully provisioned {len(cloned_tables)} isolated tables in {schema_name}")
            return {
                'success': True,
                'schema_name': schema_name,
                'cloned_count': len(cloned_tables),
                'errors': errors
            }
        except Exception as e:
            logger.error(f"[TENANT] Failed to provision schema {schema_name}: {e}")
            return {
                'success': False,
                'schema_name': schema_name,
                'message': str(e),
                'cloned_count': len(cloned_tables),
                'errors': errors
            }


def set_tenant_search_path(schema_name: str = None):
    """
    Sets the active PostgreSQL search_path for the current connection.
    If schema_name is provided, search_path is set to "{schema_name}, public".
    Otherwise, defaults to "public".
    """
    target = 'public'
    if schema_name and schema_name != 'public':
        # Verify schema_name is safe alphanumeric/underscore
        clean_schema = re.sub(r'[^a-z0-9_]', '', schema_name.lower())
        if clean_schema:
            target = f'"{clean_schema}", public'

    try:
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path = {target}')
    except Exception as e:
        logger.error(f"[TENANT] Failed to set search_path to {target}: {e}")


def reset_search_path():
    """Resets the search_path to public."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SET search_path = public')
    except Exception as e:
        logger.error(f"[TENANT] Failed to reset search_path: {e}")


def get_tenant_schema_for_user(email: str) -> tuple:
    """
    Look up which company and schema an email belongs to.
    Returns: (schema_name, company_id, role, active)
    """
    if not email:
        return ('public', None, None, False)

    email_clean = str(email).strip().lower()
    
    # 1. Check TenantUserMapping
    mapping = TenantUserMapping.objects.filter(email__iexact=email_clean).first()
    if mapping:
        return (mapping.schemaname, mapping.companyid, mapping.role, mapping.active)

    # 2. Fallback check for legacy Kamla users in public schema
    from core.models import User
    legacy_user = User.objects.filter(email__iexact=email_clean).first()
    if legacy_user:
        company_id = legacy_user.companyid_id if hasattr(legacy_user, 'companyid_id') else (legacy_user.companyid.id if legacy_user.companyid else 'cmpwp1h8v0000sscdshw8thbl')
        return ('public', company_id, legacy_user.role, legacy_user.active)

    # 3. Dynamic lookup across active tenant schemas for internal company staff
    from core.models import Company
    from django.db import connection, transaction
    tenant_schemas = list(Company.objects.filter(active=True, schemaname__isnull=False).exclude(schemaname__in=['public', '']).values_list('schemaname', 'id'))
    for schema, comp_id in tenant_schemas:
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute(f'SELECT "role", "active" FROM "{schema}"."User" WHERE LOWER(email) = %s LIMIT 1', [email_clean])
                    row = cursor.fetchone()
                    if row:
                        return (schema, comp_id, row[0], row[1])
        except Exception:
            continue

    return (None, None, None, None)


def seed_tenant_default_master_data(schema_name: str, company):
    """
    Seeds essential initial master data (Units, Categories, Brand) into the tenant schema.
    Provides new organizations with an immediate, production-ready operational baseline.
    """
    from api.models import Unit, Category, Brand
    set_tenant_search_path(schema_name)
    try:
        # 1. Standard Units of Measure
        standard_units = ['PCS', 'BOX', 'SQFT', 'KG', 'BAG', 'MTR', 'LTR']
        for u in standard_units:
            Unit.objects.get_or_create(
                name=u,
                companyid_id=company.id,
                defaults={'active': True}
            )

        # 2. Base Product Categories
        standard_categories = ['Finished Goods', 'Raw Material', 'Packaging Material', 'General']
        for cat in standard_categories:
            Category.objects.get_or_create(
                name=cat,
                companyid_id=company.id,
                defaults={'active': True}
            )

        # 3. Default Brand matching Organization Name
        Brand.objects.get_or_create(
            name=company.name,
            companyid_id=company.id,
            defaults={'active': True}
        )
        logger.info(f"[TENANT] Seeded default master data (Units, Categories, Brand) for {schema_name}")
    except Exception as e:
        logger.warning(f"[TENANT] Failed seeding default master data for {schema_name}: {e}")

