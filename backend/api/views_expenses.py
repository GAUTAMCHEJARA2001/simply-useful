from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from api.models import Expense
from api.serializers import ExpenseSerializer
from api.services.expense_service import ExpenseService
from api.response import send_success, send_error
from api.request_context import get_company_id
from api.filters import fy_date_filter

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Dedicated ViewSet for Employee Expenses and Reimbursement Claims.
    Delegates all core state transitions and business validations to ExpenseService.
    Imports only from dedicated response, request_context, and filter utilities.
    """
    permission_classes = [IsAuthenticated]
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        company_id = get_company_id(self.request)
        return ExpenseService.get_expenses_for_user(self.request.user, company_id=company_id)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        qs = fy_date_filter(request, qs, date_field='date')
        all_expenses = ExpenseSerializer(qs, many=True).data
        return send_success(all_expenses, 'Expenses fetched successfully')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        company_id = get_company_id(request)

        photo_data = data.get('photo')
        if photo_data and str(photo_data).startswith('data:image'):
            import cloudinary.uploader
            try:
                upload_res = cloudinary.uploader.upload(photo_data, folder='expense-receipts')
                data['photo'] = upload_res.get('secure_url')
            except Exception as e:
                print('[EXPENSE UPLOAD] Cloudinary upload warning:', e)

        try:
            expense = ExpenseService.submit_expense(request.user, data, company_id=company_id)
            return send_success(ExpenseSerializer(expense).data, 'Expense claim submitted', 201)
        except ValueError as ve:
            return send_error(str(ve), 400)
        except Exception as e:
            return send_error(f'Failed to submit expense: {str(e)}', 500)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        company_id = get_company_id(request)
        if company_id:
            data['companyId'] = company_id
        if request.user.email and (not data.get('soEmail')):
            data['soEmail'] = instance.soemail_id or request.user.email
        data['status'] = data.get('status') or 'PENDING'
        serializer = ExpenseSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return send_success(serializer.data, 'Expense updated successfully')

    @action(detail=True, methods=['put'], url_path='status')
    def update_status(self, request, pk=None):
        status_val = request.data.get('status')
        reject_reason = request.data.get('rejectReason') or request.data.get('reject_reason')
        if not status_val:
            return send_error('Status field is required', 400)
        try:
            expense = ExpenseService.review_expense_status(
                reviewer=request.user,
                expense_id=pk,
                new_status=status_val,
                reject_reason=reject_reason
            )
            return send_success(ExpenseSerializer(expense).data, f'Expense status updated to {status_val}')
        except ValueError as ve:
            return send_error(str(ve), 400)
        except Exception as e:
            return send_error(f'Failed to update expense status: {str(e)}', 500)
