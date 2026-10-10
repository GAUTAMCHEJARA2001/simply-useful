import uuid
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from api.models import Expense
from core.models import User
from api.serializers import ExpenseSerializer
from api.views_logs import log_activity_internal

class ExpenseService:
    """
    Service Layer encapsulating all business logic for Employee Expenses & Claims.
    Handles verification, status transitions, role permission validation, and activity logging.
    """

    VALID_CATEGORIES = {'Travel', 'Food', 'Accommodation', 'Fuel', 'Phone', 'Other'}
    VALID_STATUSES = {'PENDING', 'APPROVED', 'REJECTED', 'PAID'}
    ALLOWED_REVIEW_ROLES = {'ADMIN', 'SUPERADMIN', 'HR', 'DIRECTOR', 'VP'}

    @classmethod
    def get_expenses_for_user(cls, user: User, company_id: Optional[str] = None):
        """
        Retrieves expenses scoped by company and filtered by role.
        Sales Officers can only inspect their own expenses, while HR/Admins see all.
        """
        qs = Expense.objects.filter(companyid_id=company_id) if company_id else Expense.objects.all()
        user_role = (getattr(user, 'role', '') or '').upper()
        SALES_ROLES = {'SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER', 'SO', 'FIELD_OFFICER'}
        
        if user_role in SALES_ROLES and getattr(user, 'email', None):
            qs = qs.filter(soemail=user.email)
            
        return qs.order_by('-date')

    @classmethod
    @transaction.atomic
    def submit_expense(cls, user: User, data: Dict[str, Any], company_id: Optional[str] = None) -> Expense:
        """
        Validates and registers a new expense claim.
        Enforces positive amount, valid category, and auto-logs the action.
        """
        amount = float(data.get('amount') or 0.0)
        if amount <= 0:
            raise ValueError('Expense amount must be strictly greater than zero.')

        raw_category = str(data.get('category') or '').strip()
        # Normalizes to 'Other' if empty or invalid category
        category = raw_category if raw_category in cls.VALID_CATEGORIES else 'Other'

        payload = data.copy()
        if not payload.get('id'):
            payload['id'] = 'c' + uuid.uuid4().hex[:23]

        if company_id:
            payload['companyId'] = company_id
        if getattr(user, 'email', None):
            payload['soEmail'] = user.email

        payload['category'] = category
        payload['status'] = 'PENDING'
        if not payload.get('date'):
            payload['date'] = timezone.now().isoformat()

        serializer = ExpenseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()

        # Audit log the submission (clean ASCII message)
        try:
            log_activity_internal(
                user=user,
                log_type='ACTION',
                feature='Expenses',
                action=f"Submitted Expense Claim for Rs. {amount:.2f} ({category})",
                details={'expense_id': expense.id, 'amount': amount, 'category': category}
            )
        except Exception:
            pass

        return expense

    @classmethod
    @transaction.atomic
    def review_expense_status(cls, reviewer: User, expense_id: str, new_status: str, reject_reason: Optional[str] = None) -> Expense:
        """
        Approves or rejects an expense claim with reason tracking, role validation, and security audit log.
        """
        reviewer_role = (getattr(reviewer, 'role', '') or '').upper()
        if reviewer_role not in cls.ALLOWED_REVIEW_ROLES and not getattr(reviewer, 'is_superuser', False):
            raise ValueError("You do not have permission to review expenses.")

        clean_status = str(new_status).strip().upper()
        if clean_status not in cls.VALID_STATUSES:
            raise ValueError(f"Invalid expense status '{new_status}'. Must be one of {cls.VALID_STATUSES}")

        expense = Expense.objects.get(id=expense_id)
        prev_status = expense.status

        expense.status = clean_status
        if clean_status == 'REJECTED':
            if not reject_reason or not str(reject_reason).strip():
                raise ValueError("A reject reason is mandatory when rejecting an expense claim.")
            expense.rejectreason = str(reject_reason).strip()
        else:
            if reject_reason is not None:
                expense.rejectreason = reject_reason

        expense.save(update_fields=['status', 'rejectreason'])

        # Audit log
        try:
            log_activity_internal(
                user=reviewer,
                log_type='ACTION',
                feature='Expenses',
                action=f"Changed Expense {expense.id} status from {prev_status} to {clean_status}",
                details={'expense_id': expense.id, 'old_status': prev_status, 'new_status': clean_status, 'reason': reject_reason}
            )
        except Exception:
            pass

        return expense
