from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from api.models import BusyParty, BusyLedgerEntry
import json
from datetime import datetime

@api_view(['POST'])
@permission_classes([AllowAny]) # In production this should be secured with a token
def sync_busy_data(request):
    try:
        data = request.data
        parties = data.get('parties', [])
        ledgers = data.get('ledgers', [])
        
        db_alias = getattr(request, 'tenant', None)
        if db_alias:
            db_alias = db_alias.schema_name
        else:
            db_alias = 'default' # Or infer from a header if needed
            
        # We might need to receive a tenant identifier from the script.
        # Let's assume the script sends 'tenant_db' in the payload
        tenant_db = data.get('tenant_db', 'default')
        if tenant_db != 'default':
            db_alias = tenant_db

        # 1. Update Parties
        for p in parties:
            code = p.get('code')
            name = p.get('name')
            alias = p.get('alias')
            BusyParty.objects.using(db_alias).update_or_create(
                code=code,
                defaults={'name': name, 'alias': alias}
            )
            
        # 2. Update Ledgers
        # For simplicity, we can wipe and replace or just ignore duplicates.
        # Wipe and replace is safer for sync since ledgers can change
        party_codes = set([l.get('party_code') for l in ledgers])
        if party_codes:
            BusyLedgerEntry.objects.using(db_alias).filter(party_id__in=party_codes).delete()
            
            bulk_entries = []
            for l in ledgers:
                try:
                    date_obj = datetime.strptime(l.get('date')[:10], '%Y-%m-%d').date()
                except:
                    continue
                    
                bulk_entries.append(BusyLedgerEntry(
                    party_id=l.get('party_code'),
                    date=date_obj,
                    vch_type=l.get('vch_type'),
                    vch_no=l.get('vch_no'),
                    amount=l.get('amount'),
                    short_nar=l.get('short_nar')
                ))
            BusyLedgerEntry.objects.using(db_alias).bulk_create(bulk_entries)
            
        # 3. Auto-link and Calculate Outstanding
        from api.models import Dealer, Distributor
        from django.db.models import Sum

        all_parties = BusyParty.objects.using(db_alias).all()
        for p in all_parties:
            alias = p.alias or ""
            if "," in alias:
                code = alias.split(",")[-1].strip()
                if code.startswith("DLR-"):
                    # Update Dealer
                    dealer = Dealer.objects.using(db_alias).filter(dealercode__iexact=code).first()
                    if dealer:
                        bal = BusyLedgerEntry.objects.using(db_alias).filter(party=p).aggregate(total=Sum('amount'))['total'] or 0
                        dealer.outstanding = bal
                        dealer.save(using=db_alias)
                elif code.startswith("DST-"):
                    # Update Distributor
                    dist = Distributor.objects.using(db_alias).filter(distributorcode__iexact=code).first()
                    if dist:
                        bal = BusyLedgerEntry.objects.using(db_alias).filter(party=p).aggregate(total=Sum('amount'))['total'] or 0
                        dist.outstanding = bal
                        dist.save(using=db_alias)
            
        return Response({'success': True, 'message': f'Synced {len(parties)} parties and {len(ledgers)} ledger entries'})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
def get_party_ledger(request, party_code):
    try:
        db_alias = request.tenant.schema_name if hasattr(request, 'tenant') else 'default'
        
        # party_code might be DLR-xxx or DST-xxx or a direct BusyParty code
        party = None
        if party_code.startswith("DLR-") or party_code.startswith("DST-"):
            # Find the BusyParty where alias contains this code after a comma
            all_parties = BusyParty.objects.using(db_alias).all()
            for p in all_parties:
                if p.alias and "," in p.alias:
                    code = p.alias.split(",")[-1].strip()
                    if code.lower() == party_code.lower():
                        party = p
                        break
        else:
            party = BusyParty.objects.using(db_alias).filter(code=party_code).first()
            
        if not party:
            return Response({'success': False, 'message': 'Ledger not found for this code.'}, status=404)
            
        entries = BusyLedgerEntry.objects.using(db_alias).filter(party=party).order_by('date', 'id')
        
        data = []
        running_balance = 0.0
        for e in entries:
            running_balance += float(e.amount)
            data.append({
                'date': e.date.strftime('%Y-%m-%d'),
                'vch_type': e.vch_type,
                'vch_no': e.vch_no.strip() if e.vch_no else '',
                'amount': float(e.amount),
                'short_nar': e.short_nar,
                'running_balance': running_balance
            })
            
        party = BusyParty.objects.using(db_alias).filter(code=party_code).first()
        party_name = party.name if party else 'Unknown'
        
        return Response({'success': True, 'party_name': party_name, 'ledger': data})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
def search_busy_parties(request):
    try:
        query = request.GET.get('q', '').lower()
        db_alias = request.tenant.schema_name if hasattr(request, 'tenant') else 'default'
        parties = BusyParty.objects.using(db_alias).filter(name__icontains=query)[:20]
        data = [{'code': p.code, 'name': p.name, 'alias': p.alias} for p in parties]
        return Response({'success': True, 'data': data})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)
