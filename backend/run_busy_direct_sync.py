import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import pypyodbc
from django.db import transaction
from django.db.models import Sum, Max
from api.models import BusyParty, BusyLedgerEntry, Dealer, Distributor

def run_sync():
    db_path = r"C:\BusyWin\DATA\COMP0010\db12026.bds"
    pwd = "ILoveMyINDIA"

    print("=========================================")
    print("      BUSY WIN DIRECT LEDGER SYNC        ")
    print("=========================================")
    print(f"Connecting to database: {db_path}...")

    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found at: {db_path}")
        return

    try:
        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};PWD={pwd};"
        conn = pypyodbc.connect(conn_str)
        cursor = conn.cursor()
        print("Connected successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to connect: {e}")
        return

    try:
        # 1. Fetch Sundry Debtors (parentgrp = 116)
        print("\n[Step 1] Fetching Sundry Debtors from BUSY...")
        cursor.execute("SELECT code, name, [alias] FROM Master1 WHERE mastertype = 2 AND parentgrp = 116")
        busy_debtors = cursor.fetchall()
        print(f"Found {len(busy_debtors)} debtors in BUSY.")

        busy_dict = {r[1].strip().lower(): r for r in busy_debtors}
        busy_alias_dict = {}
        for r in busy_debtors:
            if r[2]:
                for part in r[2].split(','):
                    part_clean = part.strip().lower()
                    if part_clean:
                        busy_alias_dict[part_clean] = r

        # 2. Match with Django Dealers and Distributors
        print("\n[Step 2] Matching Dealers and Distributors...")
        dealers = list(Dealer.objects.all())
        distributors = list(Distributor.objects.all())

        party_code_mappings = {} # django_party_code -> busy_code
        busy_to_django_party = {} # busy_code -> (django_model_obj, type_str)

        for d in dealers:
            name_clean = d.dealername.strip().lower()
            code_clean = d.dealercode.strip().lower()
            
            # Match strategy: exact name -> code in alias -> substring name
            match = busy_dict.get(name_clean)
            if not match:
                match = busy_alias_dict.get(code_clean)
            if not match:
                for b_name in busy_dict:
                    if name_clean in b_name or b_name in name_clean:
                        match = busy_dict[b_name]
                        break
            if match:
                party_code_mappings[d.dealercode] = match[0]
                busy_to_django_party[match[0]] = (d, 'dealer')

        for dst in distributors:
            name_clean = dst.distributorname.strip().lower()
            code_clean = (dst.distributorcode or '').strip().lower()
            
            match = busy_dict.get(name_clean)
            if not match:
                if code_clean:
                    match = busy_alias_dict.get(code_clean)
            if not match:
                for b_name in busy_dict:
                    if name_clean in b_name or b_name in name_clean:
                        match = busy_dict[b_name]
                        break
            if match:
                party_code_mappings[dst.distributorcode] = match[0]
                busy_to_django_party[match[0]] = (dst, 'distributor')

        print(f"Matched {len(busy_to_django_party)} parties out of {len(dealers) + len(distributors)} total in Django.")

        # 3. Create or update BusyParty entries in Django
        print("\n[Step 3] Updating BusyParty records...")
        with transaction.atomic():
            to_create_parties = []
            to_update_parties = []
            existing_busy_parties = {p.code: p for p in BusyParty.objects.all()}

            for code, name, alias in busy_debtors:
                # Add Django link in alias if matched
                django_link = ""
                if code in busy_to_django_party:
                    obj, t_str = busy_to_django_party[code]
                    code_val = obj.dealercode if t_str == 'dealer' else obj.distributorcode
                    if code_val:
                        django_link = f", {code_val.upper()}"

                full_alias = f"{alias or ''}{django_link}".strip().strip(',')
                
                if code in existing_busy_parties:
                    obj = existing_busy_parties[code]
                    if obj.name != name or obj.alias != full_alias:
                        obj.name = name
                        obj.alias = full_alias
                        to_update_parties.append(obj)
                else:
                    to_create_parties.append(BusyParty(code=code, name=name, alias=full_alias))

            if to_create_parties:
                BusyParty.objects.bulk_create(to_create_parties, batch_size=1000)
                print(f"Created {len(to_create_parties)} new BusyParty entries.")
            if to_update_parties:
                BusyParty.objects.bulk_update(to_update_parties, ['name', 'alias'], batch_size=1000)
                print(f"Updated {len(to_update_parties)} existing BusyParty entries.")

        # 4. Fetch and Insert Ledger Transactions
        print("\n[Step 4] Fetching transactions from BUSY and uploading to database...")
        matched_busy_codes = list(busy_to_django_party.keys())
        if not matched_busy_codes:
            print("No matched parties to sync transactions for.")
            return

        # Fetch transactions direct from Tran2
        busy_codes_str = ",".join(map(str, matched_busy_codes))
        cursor.execute(f"""
            SELECT vchcode, vchtype, date, vchno, mastercode1, value1, shortnar
            FROM Tran2
            WHERE mastercode1 IN ({busy_codes_str}) AND rectype = 1
        """)
        rows = cursor.fetchall()
        print(f"Found {len(rows)} transactions in BUSY for matched parties.")

        # Mapping of vchtype to standard types:
        # Sales: 9, Sales Return: 3, Purchase: 2, Purchase Return: 10, Receipt: 14, Payment: 19
        vch_type_map = {
            9: 1,  # Sales
            3: 2,  # Sales Return
            2: 2,  # Purchase (Receipt for credit/debit context)
            10: 2, # Purchase Return
            14: 2, # Receipt
            19: 3, # Payment
        }

        bulk_entries = []
        party_balances = {} # busy_code -> total_balance

        for r in rows:
            vch_code, vch_type, dt, vch_no, busy_code, val1, short_nar = r
            if not dt:
                continue

            # Amount is negated because Debit is stored as negative in BUSY and Credit is positive
            amount = -float(val1 or 0)

            # Accumulate balance
            party_balances[busy_code] = party_balances.get(busy_code, 0.0) + amount

            bulk_entries.append(BusyLedgerEntry(
                party_id=busy_code,
                date=dt.date() if isinstance(dt, datetime) else dt,
                vch_type=vch_type_map.get(vch_type, 0),
                vch_no=str(vch_no or '').strip(),
                amount=amount,
                short_nar=str(short_nar or '').strip()
            ))

        # Replace ledger entries and update balances
        with transaction.atomic():
            # Delete old entries
            BusyLedgerEntry.objects.filter(party_id__in=matched_busy_codes).delete()
            # Bulk insert new entries
            if bulk_entries:
                BusyLedgerEntry.objects.bulk_create(bulk_entries, batch_size=2000)
                print(f"Successfully loaded {len(bulk_entries)} transaction rows into the database.")

            # Update Dealer and Distributor balances
            dealers_to_update = []
            dists_to_update = []

            for busy_code, bal in party_balances.items():
                if busy_code not in busy_to_django_party:
                    continue
                obj, t_str = busy_to_django_party[busy_code]
                if t_str == 'dealer':
                    obj.outstanding = Decimal(str(round(bal, 2)))
                    dealers_to_update.append(obj)
                elif t_str == 'distributor':
                    obj.outstanding = Decimal(str(round(bal, 2)))
                    dists_to_update.append(obj)

            if dealers_to_update:
                Dealer.objects.bulk_update(dealers_to_update, ['outstanding'], batch_size=500)
            if dists_to_update:
                Distributor.objects.bulk_update(dists_to_update, ['outstanding'], batch_size=500)

            print(f"Updated outstanding balances for {len(dealers_to_update)} Dealers.")
            print(f"Updated outstanding balances for {len(dists_to_update)} Distributors.")

        print("\n=========================================")
        print("          SYNC COMPLETE SUCCESSFULLY!     ")
        print("=========================================")

    except Exception as e:
        import traceback
        print(f"\n[ERROR] Sync failed: {e}")
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    run_sync()
