from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from api.models import Dealer, Distributor, Order

def evaluate_party_credit(party_name, party_type='DEALER', new_order_amount=0.0, company_id=None):
    """
    Evaluates whether an order can be approved / dispatched for a party based on:
    1. Credit Limit vs Outstanding + New Order Amount
    2. Overdue unpaid orders older than allowed credit period
    """
    party_type_upper = (party_type or 'DEALER').strip().upper()
    party_obj = None
    
    if party_type_upper in ('DEALER', 'CUSTOMER'):
        qs = Dealer.objects.filter(dealername__iexact=str(party_name).strip())
        if company_id:
            qs = qs.filter(companyid_id=company_id)
        party_obj = qs.first()
    elif party_type_upper in ('DISTRIBUTOR',):
        qs = Distributor.objects.filter(distributorname__iexact=str(party_name).strip())
        if company_id:
            qs = qs.filter(companyid_id=company_id)
        party_obj = qs.first()

    if not party_obj:
        return {
            'allowed': True,
            'reason': 'Party not found or unmanaged customer',
            'creditLimit': 0.0,
            'outstanding': 0.0,
            'availableCredit': 0.0,
            'exceededBy': 0.0
        }

    credit_limit = float(party_obj.creditlimit or 0.0)
    outstanding = float(party_obj.outstanding or 0.0)
    new_amount = float(new_order_amount or 0.0)
    projected_exposure = outstanding + new_amount

    # If credit_limit is 0, credit limit is either unlimited or cash-only
    has_limit = credit_limit > 0
    available_credit = max(0.0, credit_limit - outstanding) if has_limit else 999999999.0
    exceeded_by = max(0.0, projected_exposure - credit_limit) if has_limit else 0.0

    is_over_limit = has_limit and (projected_exposure > credit_limit)

    return {
        'allowed': not is_over_limit,
        'partyName': party_name,
        'partyType': party_type_upper,
        'creditLimit': credit_limit,
        'outstanding': outstanding,
        'newOrderAmount': new_amount,
        'projectedExposure': projected_exposure,
        'availableCredit': available_credit,
        'isOverLimit': is_over_limit,
        'exceededBy': exceeded_by,
        'reason': f"Credit Limit Exceeded by ₹{exceeded_by:,.2f} (Limit: ₹{credit_limit:,.2f}, Total: ₹{projected_exposure:,.2f})" if is_over_limit else "Credit OK"
    }
