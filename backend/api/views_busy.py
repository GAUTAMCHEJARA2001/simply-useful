from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from api.models import BusyParty, BusyLedgerEntry
import json
from datetime import datetime

@api_view(['POST'])
@permission_classes([AllowAny])
def sync_busy_data(request):
    """
    High-performance bulk sync for Busy accounting data.
    Uses bulk_create, bulk_update, and single-query SQL aggregation
    to sync thousands of parties and ledger entries in <1 second without worker timeouts.
    """
    try:
        data = request.data or {}
        parties_data = data.get('parties', [])
        ledgers_data = data.get('ledgers', [])

        from django.db import transaction
        from django.db.models import Sum
        from api.models import Dealer, Distributor

        with transaction.atomic():
            # 1. BULK UPSERT PARTIES WITH AUTO-LINKING (2 queries total instead of N queries)
            if parties_data:
                existing_parties = {p.code: p for p in BusyParty.objects.all()}
                
                # Fetch all Dealers and Distributors to auto-match by name
                dealers_dict = {d.dealername.strip().lower(): d for d in Dealer.objects.all()}
                dists_dict = {dst.distributorname.strip().lower(): dst for dst in Distributor.objects.all() if dst.distributorname}
                
                to_create = []
                to_update = []
                for p_dict in parties_data:
                    code = p_dict.get('code')
                    if not code:
                        continue
                    name = p_dict.get('name', '').strip()
                    alias = p_dict.get('alias', '').strip()
                    
                    # Try to see if alias already has a mapped code
                    matched_code = None
                    if alias and "," in alias:
                        last_part = alias.split(",")[-1].strip().lower()
                        if last_part.startswith("dlr-") or last_part.startswith("dst-") or last_part.startswith("d-") or last_part.startswith("ds-"):
                            matched_code = last_part.upper()
                    
                    # If not matched, try matching by name
                    if not matched_code:
                        name_lower = name.lower()
                        if name_lower in dealers_dict:
                            dlr_code = dealers_dict[name_lower].dealercode
                            if dlr_code:
                                matched_code = dlr_code.upper()
                        elif name_lower in dists_dict:
                            dst_code = dists_dict[name_lower].distributorcode
                            if dst_code:
                                matched_code = dst_code.upper()
                        else:
                            # Substring match
                            for d_name, d_obj in dealers_dict.items():
                                if name_lower in d_name or d_name in name_lower:
                                    if d_obj.dealercode:
                                        matched_code = d_obj.dealercode.upper()
                                        break
                            if not matched_code:
                                for dst_name, dst_obj in dists_dict.items():
                                    if name_lower in dst_name or dst_name in name_lower:
                                        if dst_obj.distributorcode:
                                            matched_code = dst_obj.distributorcode.upper()
                                            break
                                        
                    # Append code to alias if matched
                    full_alias = alias
                    if matched_code:
                        parts = [x.strip() for x in alias.split(",") if x.strip()]
                        if matched_code not in [x.upper() for x in parts]:
                            parts.append(matched_code)
                        full_alias = ", ".join(parts)
                        
                    if code in existing_parties:
                        obj = existing_parties[code]
                        if obj.name != name or obj.alias != full_alias:
                            obj.name = name
                            obj.alias = full_alias
                            to_update.append(obj)
                    else:
                        to_create.append(BusyParty(code=code, name=name, alias=full_alias))
                        
                if to_create:
                    BusyParty.objects.bulk_create(to_create, batch_size=1000)
                if to_update:
                    BusyParty.objects.bulk_update(to_update, ['name', 'alias'], batch_size=1000)
                
                # Update last_sync for all parties that were synced
                if parties_data:
                    from django.utils import timezone
                    party_codes = [p.get('code') for p in parties_data if p.get('code')]
                    if party_codes:
                        BusyParty.objects.filter(code__in=party_codes).update(last_sync=timezone.now())

            # 2. BULK REPLACE LEDGER ENTRIES FOR AFFECTED PARTIES (2 queries total)
            if ledgers_data:
                party_codes = {l.get('party_code') for l in ledgers_data if l.get('party_code')}
                if party_codes:
                    BusyLedgerEntry.objects.filter(party_id__in=party_codes).delete()
                    bulk_entries = []
                    for l in ledgers_data:
                        try:
                            date_str = str(l.get('date', ''))[:10]
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                        except Exception:
                            continue
                        bulk_entries.append(BusyLedgerEntry(
                            party_id=l.get('party_code'),
                            date=date_obj,
                            vch_type=l.get('vch_type', 0),
                            vch_no=str(l.get('vch_no', ''))[:50],
                            amount=l.get('amount', 0),
                            short_nar=str(l.get('short_nar', ''))[:255]
                        ))
                    if bulk_entries:
                        BusyLedgerEntry.objects.bulk_create(bulk_entries, batch_size=2000)

            # 3. FAST BALANCES AGGREGATION (1 SQL GROUP BY query instead of N queries)
            balances = dict(
                BusyLedgerEntry.objects.values('party_id')
                .annotate(total=Sum('amount'))
                .values_list('party_id', 'total')
            )
            all_parties = BusyParty.objects.all()
            dealer_balance_map = {}
            dist_balance_map = {}

            for p in all_parties:
                alias = p.alias or ""
                if alias:
                    code = alias.split(",")[-1].strip().upper()
                    bal = balances.get(p.code, 0) or 0
                    if code.startswith("DLR-") or code.startswith("D-"):
                        dealer_balance_map[code] = bal
                    elif code.startswith("DST-") or code.startswith("DS-"):
                        dist_balance_map[code] = bal

            # Update Dealers in bulk
            if dealer_balance_map:
                dealers = list(Dealer.objects.filter(dealercode__in=dealer_balance_map.keys()))
                dealers_to_update = []
                for d in dealers:
                    new_bal = dealer_balance_map.get(d.dealercode.upper(), 0)
                    if d.outstanding != new_bal:
                        d.outstanding = new_bal
                        dealers_to_update.append(d)
                if dealers_to_update:
                    Dealer.objects.bulk_update(dealers_to_update, ['outstanding'], batch_size=500)

            # Update Distributors in bulk
            if dist_balance_map:
                dists = list(Distributor.objects.filter(distributorcode__in=dist_balance_map.keys()))
                dists_to_update = []
                for d in dists:
                    new_bal = dist_balance_map.get(d.distributorcode.upper(), 0)
                    if d.outstanding != new_bal:
                        d.outstanding = new_bal
                        dists_to_update.append(d)
                if dists_to_update:
                    Distributor.objects.bulk_update(dists_to_update, ['outstanding'], batch_size=500)

        return Response({
            'success': True,
            'message': f'Synced successfully ({len(parties_data)} parties, {len(ledgers_data)} ledger entries).'
        })
    except Exception as e:
        import traceback
        print('[BUSY SYNC ERROR]', traceback.format_exc())
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
def get_party_ledger(request, party_code):
    try:
        # party_code might be DLR-xxx or DST-xxx or a direct BusyParty code
        party = None
        party_code_str = str(party_code).strip()
        if not party_code_str.isdigit():
            # Find the BusyParty where alias contains this code (case-insensitive) after a comma
            all_parties = BusyParty.objects.all()
            for p in all_parties:
                if p.alias:
                    parts = [x.strip().lower() for x in p.alias.split(",")]
                    if party_code_str.lower() in parts:
                        party = p
                        break
        else:
            party = BusyParty.objects.filter(code=int(party_code_str)).first()
            
        if not party:
            return Response({'success': False, 'message': 'Ledger not found for this code.'}, status=404)
            
        entries = BusyLedgerEntry.objects.filter(party=party).order_by('date', 'id')
        
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
            
        party = BusyParty.objects.filter(code=party_code).first()
        party_name = party.name if party else 'Unknown'
        
        return Response({'success': True, 'party_name': party_name, 'ledger': data})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
def search_busy_parties(request):
    try:
        from api.models import Dealer, Distributor
        from api.views import _get_company_id
        
        query = request.GET.get('q', '').strip()
        user = request.user
        company_id = _get_company_id(request)
        is_admin = user.is_authenticated and user.role in ['ADMIN', 'SUPERADMIN']
        
        dealers = Dealer.objects.filter(active=True, dealername__icontains=query)
        distributors = Distributor.objects.filter(active=True, distributorname__icontains=query)
        
        if not is_admin:
            # Sales officers only see their own assigned customers
            dealers = dealers.filter(assignedsoemail=user.email)
            distributors = distributors.filter(assignedsoemail=user.email)
            
        data = []
        for d in dealers[:20]:
            data.append({
                'code': d.dealercode or '', 
                'name': d.dealername, 
                'alias': 'Dealer',
                'gst_number': d.gst_number,
                'address': d.address,
                'phone': d.phone,
                'email': d.email,
                'contact_person': d.contact_person
            })
        for d in distributors[:20]:
            data.append({
                'code': d.distributorcode or '', 
                'name': d.distributorname, 
                'alias': 'Distributor',
                'gst_number': d.gst_number,
                'address': d.address,
                'phone': d.phone,
                'email': d.email,
                'contact_person': d.contact_person
            })
            
        # Limit to 20 overall
        data = data[:20]
        
        return Response({'success': True, 'data': data})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['POST'])
def import_busy_ledger(request):
    try:
        from api.views import _read_uploaded_csv
        from django.db import transaction
        from django.db.models import Sum, Max
        from api.models import Dealer, Distributor
        
        party_code = request.GET.get('party_code') or request.data.get('party_code')
        if not party_code:
            return Response({'success': False, 'message': 'Party Code is required.'}, status=400)
            
        party = None
        party_code_str = str(party_code).strip()
        if not party_code_str.isdigit():
            all_parties = BusyParty.objects.all()
            for p in all_parties:
                if p.alias:
                    parts = [x.strip().lower() for x in p.alias.split(",")]
                    if party_code_str.lower() in parts:
                        party = p
                        break
        else:
            party = BusyParty.objects.filter(code=int(party_code_str)).first()
            
        if not party:
            # Try to auto-create matching Dealer or Distributor
            dealer = None
            dist = None
            if party_code_str.upper().startswith("DLR-") or party_code_str.upper().startswith("D-"):
                dealer = Dealer.objects.filter(dealercode__iexact=party_code_str).first()
            elif party_code_str.upper().startswith("DST-") or party_code_str.upper().startswith("DS-"):
                dist = Distributor.objects.filter(distributorcode__iexact=party_code_str).first()
            else:
                dealer = Dealer.objects.filter(dealercode__iexact=party_code_str).first()
                if not dealer:
                    dist = Distributor.objects.filter(distributorcode__iexact=party_code_str).first()
                    
            if dealer or dist:
                max_code = BusyParty.objects.aggregate(Max('code'))['code__max'] or 1000
                new_code = max_code + 1
                name = dealer.dealerName if dealer else dist.distributorName
                alias = f"{name}, {party_code_str.upper()}"
                party = BusyParty.objects.create(
                    code=new_code,
                    name=name,
                    alias=alias
                )
            else:
                return Response({'success': False, 'message': f'No dealer or distributor found with code: {party_code_str}'}, status=404)

        rows, err_resp = _read_uploaded_csv(request)
        if err_resp:
            # Read_uploaded_csv returns a standard HttpResponse when error. Let's extract message if possible.
            msg = getattr(err_resp, 'content', b'').decode('utf-8')
            try:
                msg_json = json.loads(msg)
                msg = msg_json.get('message', msg)
            except:
                pass
            return Response({'success': False, 'message': msg or 'Invalid file upload.'}, status=400)

        if not rows:
            return Response({'success': False, 'message': 'The uploaded file is empty.'}, status=400)

        # Map headers
        headers = list(rows[0].keys())
        
        date_col = next((h for h in headers if any(k in h.lower() for k in ['date', 'dt', 'when'])), None)
        vch_no_col = next((h for h in headers if any(k in h.lower() for k in ['vch_no', 'vch_num', 'voucher', 'vchno', 'vch no'])), None)
        if not vch_no_col:
            vch_no_col = next((h for h in headers if any(k in h.lower() for k in ['no', 'number'])), None)
            
        vch_type_col = next((h for h in headers if any(k in h.lower() for k in ['type', 'vchtype', 'vch_type'])), None)
        
        debit_col = next((h for h in headers if any(k in h.lower() for k in ['debit', 'dr'])), None)
        credit_col = next((h for h in headers if any(k in h.lower() for k in ['credit', 'cr'])), None)
        amount_col = next((h for h in headers if any(k in h.lower() for k in ['amount', 'amt', 'value', 'val'])), None)
        nar_col = next((h for h in headers if any(k in h.lower() for k in ['narration', 'short_nar', 'remarks', 'desc', 'description', 'nar'])), None)

        if not date_col:
            return Response({'success': False, 'message': 'Could not find a "Date" column in the sheet. Please make sure the sheet has a column labeled "Date".'}, status=400)

        def parse_date(val):
            val = str(val).strip()
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%d.%m.%Y'):
                try:
                    return datetime.strptime(val, fmt).date()
                except ValueError:
                    continue
            try:
                return datetime.strptime(val[:10], '%Y-%m-%d').date()
            except:
                pass
            return None

        def clean_number(val):
            if not val:
                return 0.0
            try:
                return float(str(val).replace(',', '').replace(' ', '').replace('₹', '').strip())
            except:
                return 0.0

        bulk_entries = []
        for row in rows:
            date_val = parse_date(row.get(date_col))
            if not date_val:
                continue
                
            # Parse amount
            amount = 0.0
            if debit_col or credit_col:
                debit_val = clean_number(row.get(debit_col))
                credit_val = clean_number(row.get(credit_col))
                amount = debit_val - credit_val
            elif amount_col:
                amount = clean_number(row.get(amount_col))
                
            # Parse voucher type
            vch_str = str(row.get(vch_type_col) or '').lower()
            vch_type = 0
            if any(k in vch_str for k in ['sale', 'invoice', 'inv']):
                vch_type = 1
            elif any(k in vch_str for k in ['receipt', 'rcpt']):
                vch_type = 2
            elif any(k in vch_str for k in ['payment', 'pay']):
                vch_type = 3
            elif any(k in vch_str for k in ['journal', 'jv']):
                vch_type = 4
            elif 'debit' in vch_str:
                vch_type = 5
            elif 'credit' in vch_str:
                vch_type = 6
                
            vch_no = str(row.get(vch_no_col) or '')[:50]
            short_nar = str(row.get(nar_col) or '')[:255]
            
            bulk_entries.append(BusyLedgerEntry(
                party=party,
                date=date_val,
                vch_type=vch_type,
                vch_no=vch_no,
                amount=amount,
                short_nar=short_nar
            ))

        with transaction.atomic():
            # Delete existing ledger entries for this party
            BusyLedgerEntry.objects.filter(party=party).delete()
            # Bulk create
            if bulk_entries:
                BusyLedgerEntry.objects.bulk_create(bulk_entries, batch_size=1000)
            
            # Recalculate outstanding balance
            total_bal = BusyLedgerEntry.objects.filter(party=party).aggregate(total=Sum('amount'))['total'] or 0
            
            # Update dealer/distributor model
            if party_code_str.upper().startswith("DLR-") or party_code_str.upper().startswith("D-"):
                Dealer.objects.filter(dealercode__iexact=party_code_str).update(outstanding=total_bal)
            elif party_code_str.upper().startswith("DST-") or party_code_str.upper().startswith("DS-"):
                Distributor.objects.filter(distributorcode__iexact=party_code_str).update(outstanding=total_bal)

            # Auto-complete any pending ledger requests for this party
            from api.models import LedgerRequest
            from django.utils import timezone
            LedgerRequest.objects.filter(
                party_code__iexact=party_code_str, 
                status='PENDING'
            ).update(status='COMPLETED', completed_at=timezone.now())

        return Response({
            'success': True,
            'message': f'Successfully imported {len(bulk_entries)} ledger entries for {party.name}. Updated outstanding balance to ₹{total_bal:,.2f}.'
        })
    except Exception as e:
        import traceback
        print('[LEDGER IMPORT ERROR]', traceback.format_exc())
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
def get_sync_status(request):
    try:
        from api.models import BusyParty, BusyLedgerEntry
        from django.utils import timezone
        
        parties_count = BusyParty.objects.count()
        ledgers_count = BusyLedgerEntry.objects.count()
        
        latest_party = BusyParty.objects.order_by('-last_sync').first()
        last_sync = latest_party.last_sync if latest_party else None
        
        is_connected = False
        if last_sync:
            # If active within last 1 hour, mark active
            time_diff = timezone.now() - last_sync
            if time_diff.total_seconds() < 3600:
                is_connected = True
                
        last_sync_iso = last_sync.isoformat() if last_sync else None
        
        return Response({
            'success': True,
            'is_connected': is_connected,
            'last_sync': last_sync_iso,
            'parties_count': parties_count,
            'ledgers_count': ledgers_count
        })
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET', 'POST'])
def ledger_requests_view(request):
    from api.models import LedgerRequest
    from django.utils import timezone
    
    if request.method == 'POST':
        try:
            party_code = request.data.get('party_code')
            party_name = request.data.get('party_name', 'Unknown Party')
            doc_type = request.data.get('document_type', 'LEDGER')
            other_doc = request.data.get('other_document_name')
            from_date = request.data.get('from_date')
            to_date = request.data.get('to_date')
            remarks = request.data.get('remarks')
            
            if not party_code:
                return Response({'success': False, 'message': 'Party code is required'}, status=400)
            
            # Resolve real DB User from JWTUser
            from core.models import User as DBUser
            real_user = None
            if request.user and request.user.is_authenticated:
                real_user = DBUser.objects.filter(id=request.user.id).first()
                if not real_user:
                    real_user = DBUser.objects.filter(email=getattr(request.user, 'email', '')).first()
                
            req = LedgerRequest.objects.create(
                party_code=party_code,
                party_name=party_name,
                requested_by=real_user,
                status='PENDING',
                document_type=doc_type,
                other_document_name=other_doc,
                from_date=from_date if from_date else None,
                to_date=to_date if to_date else None,
                remarks=remarks
            )
            return Response({'success': True, 'message': 'Document request submitted', 'id': req.id})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
            
    elif request.method == 'GET':
        try:
            status_filter = request.GET.get('status', 'PENDING')
            party_code = request.GET.get('party_code')
            
            qs = LedgerRequest.objects.all().order_by('-requested_at')
            if request.user.is_authenticated and request.user.role not in ['ADMIN', 'SUPERADMIN']:
                qs = qs.filter(requested_by_id=request.user.id)
                
            if status_filter:
                qs = qs.filter(status=status_filter)
            if party_code:
                qs = qs.filter(party_code=party_code)
                
            data = []
            for r in qs:
                data.append({
                    'id': r.id,
                    'party_code': r.party_code,
                    'party_name': r.party_name,
                    'requested_by_name': r.requested_by.name if r.requested_by else "",
                    'requested_by_email': r.requested_by.email if r.requested_by else "",
                    'status': r.status,
                    'document_type': r.document_type,
                    'other_document_name': r.other_document_name,
                    'from_date': r.from_date.isoformat() if r.from_date else None,
                    'to_date': r.to_date.isoformat() if r.to_date else None,
                    'remarks': r.remarks,
                    'requested_at': r.requested_at.isoformat() if r.requested_at else None,
                    'completed_at': r.completed_at.isoformat() if r.completed_at else None,
                    'file_url': r.file_url,
                    'file_name': r.file_name,
                })
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['POST'])
def fulfill_ledger_request(request, req_id):
    """Mark a document request as fulfilled by the Admin, with optional file upload."""
    from api.models import LedgerRequest
    from django.utils import timezone
    
    try:
        lr = LedgerRequest.objects.filter(id=req_id).first()
        if not lr:
            return Response({'success': False, 'message': 'Request not found'}, status=404)
        
        uploaded_file = request.FILES.get('file')
        file_url = None
        file_name = None
        
        if uploaded_file:
            file_name = uploaded_file.name
            try:
                import cloudinary.uploader
                # Determine resource_type based on file extension
                ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else ''
                if ext in ('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'):
                    resource_type = 'image'
                elif ext in ('pdf',):
                    resource_type = 'image'  # Cloudinary treats PDF as image
                else:
                    resource_type = 'raw'  # Excel, CSV, etc.
                
                result = cloudinary.uploader.upload(
                    uploaded_file,
                    folder='ledger_requests',
                    resource_type=resource_type,
                    public_id=f'req_{req_id}_{file_name.rsplit(".", 1)[0]}',
                    overwrite=True
                )
                file_url = result.get('secure_url') or result.get('url')
            except Exception as upload_err:
                return Response({'success': False, 'message': f'File upload failed: {str(upload_err)}'}, status=500)
        
        lr.status = 'COMPLETED'
        lr.completed_at = timezone.now()
        if file_url:
            lr.file_url = file_url
        if file_name:
            lr.file_name = file_name
        lr.save()
        
        return Response({'success': True, 'message': 'Request fulfilled successfully', 'file_url': file_url})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)
