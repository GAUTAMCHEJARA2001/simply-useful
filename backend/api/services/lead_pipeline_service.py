from django.db import transaction
from django.utils import timezone
from api.models import Lead, LeadStageHistory
from api.services.cache_keys import CRMCacheKeys
from django.core.cache import cache
from decimal import Decimal, ROUND_HALF_UP
import uuid

class LeadPipelineService:
    ALLOWED_TRANSITIONS = {
        'NEW': ['CONTACTED', 'LOST'],
        'CONTACTED': ['PROPOSAL', 'LOST'],
        'PROPOSAL': ['NEGOTIATION', 'LOST'],
        'NEGOTIATION': ['WON', 'LOST'],
        'WON': [],
        'LOST': ['NEW']
    }

    @staticmethod
    def quantize_decimal(value):
        if value is None:
            return Decimal('0.00')
        return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def transition_lead(lead, new_status, user_id, client_version):
        from django.db.models import F
        with transaction.atomic():
            # Pessimistic Locking: grab lock on the row using all_objects.
            # DEV NOTE (SQLite Caveat): SQLite ignores row-level select_for_update() locks.
            # Local SQLite relies on optimistic locking (version column & atomic updates) to preserve integrity.
            # Production PostgreSQL will enforce full pessimistic select_for_update() + optimistic locking protection.
            # DEV NOTE (Future Background Queues): For async assignment/follow-up processors,
            # use select_for_update(skip_locked=True) to bypass locked rows and avoid worker bottlenecks.
            locked_lead = Lead.all_objects.select_for_update().get(pk=lead.id)
            
            old_status = locked_lead.status
            if old_status != new_status:
                allowed = LeadPipelineService.ALLOWED_TRANSITIONS.get(old_status, [])
                if new_status not in allowed:
                    return False, f"Transition from {old_status} to {new_status} is not allowed."

            # Optimistic Locking: update checking version matching
            updated = Lead.objects.filter(pk=locked_lead.id, version=client_version).update(
                status=new_status,
                version=F('version') + 1,
                updatedat=timezone.now(),
                updated_by_id=user_id
            )
            if updated == 0:
                return False, "STALE_WRITE"

            if old_status != new_status:
                LeadStageHistory.objects.create(
                    id='h' + uuid.uuid4().hex[:23],
                    lead_id=locked_lead.id,
                    old_status=old_status,
                    new_status=new_status,
                    changed_by_id=user_id
                )

        lead.refresh_from_db()
        # Signals automatically handle cache invalidation, but we also double invalidate to protect against stale edge cases
        cache.delete(CRMCacheKeys.dashboard(lead.companyid_id))
        return True, "SUCCESS"
