#!/usr/bin/env python
"""
Create a new Company (Tenant), Default Warehouse(s), and Superadmin account
in the Single Tenant-Based Database (db_master).

Usage examples:
  python create_company.py --name "Kamla Ceramics" --email "admin@kamla.com" --password "admin123" --warehouses "SURAT,AHMEDABAD"
  python create_company.py --name "Acme Corp" --email "admin@acme.com" --sku-prefix "ACM"
"""

import os
import sys
import argparse
import uuid
import bcrypt
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Company, Warehouse, User, Userwarehouseaccess

def create_tenant_company(name, email, password, sku_prefix=None, warehouse_names="MAIN WAREHOUSE"):
    now = timezone.now()
    
    # 1. Check if Company already exists with same name
    existing_company = Company.objects.filter(name__iexact=name.strip()).first()
    if existing_company:
        print(f"[-] Company '{name}' already exists (ID: {existing_company.id}).")
        company = existing_company
    else:
        prefix = sku_prefix or name.strip().upper()[:3]
        company_id = f"cmp_{uuid.uuid4().hex[:16]}"
        company = Company.objects.create(
            id=company_id,
            name=name.strip(),
            skuprefix=prefix,
            stockmethod="FIFO",
            active=True
        )
        print(f"[+] Created Company: '{company.name}' (ID: {company.id}, SKU Prefix: {company.skuprefix})")

    # 2. Create Warehouses
    wh_list = [w.strip() for w in warehouse_names.split(',') if w.strip()]
    if not wh_list:
        wh_list = ["MAIN WAREHOUSE"]

    created_warehouses = []
    for wh_name in wh_list:
        wh = Warehouse.objects.filter(companyid=company, name__iexact=wh_name).first()
        if not wh:
            # Generate next available ID
            next_id = (Warehouse.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
            wh = Warehouse.objects.create(
                id=next_id,
                companyid=company,
                name=wh_name.upper(),
                location=f"{wh_name.upper()} Distribution Center",
                active=True
            )
            print(f"  [+] Created Warehouse: '{wh.name}' (ID: {wh.id})")
        else:
            print(f"  [-] Warehouse '{wh.name}' already exists for company.")
        created_warehouses.append(wh)

    # 3. Create Superadmin User for this Company
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User.objects.filter(email=email.strip().lower()).first()
    if user:
        user.name = f"{name.strip()} Admin"
        user.hashedpassword = hashed_pw
        user.role = "SUPERADMIN"
        user.companyid = company
        user.active = True
        user.save()
        print(f"[+] Updated existing user '{user.email}' as SUPERADMIN for '{company.name}'")
    else:
        user_id = f"usr_{uuid.uuid4().hex[:16]}"
        user = User.objects.create(
            id=user_id,
            name=f"{name.strip()} Admin",
            email=email.strip().lower(),
            hashedpassword=hashed_pw,
            role="SUPERADMIN",
            companyid=company,
            active=True
        )
        print(f"[+] Created SUPERADMIN User: '{user.email}' (ID: {user.id})")

    # 4. Grant Warehouse Access to Superadmin
    for wh in created_warehouses:
        access, created = Userwarehouseaccess.objects.get_or_create(
            userid=user,
            warehouseid=wh
        )
        if created:
            print(f"  [+] Granted access to Warehouse '{wh.name}' for user '{user.email}'")

    print("\n==================================================")
    print("=== NEW COMPANY TENANT CREATED SUCCESSFULLY ===")
    print("==================================================")
    print(f"Company ID     : {company.id}")
    print(f"Company Name   : {company.name}")
    print(f"SKU Prefix     : {company.skuprefix}")
    print(f"Warehouses     : {', '.join(w.name for w in created_warehouses)}")
    print(f"Login Email    : {user.email}")
    print(f"Login Password : {password}")
    print("==================================================\n")
    return company

def main():
    parser = argparse.ArgumentParser(description="Create a new Company (Tenant) in db_master.")
    parser.add_argument("--name", "-n", default="Kamla Ceramics", help="Company name")
    parser.add_argument("--email", "-e", default="admin@kamla.com", help="Superadmin email for login")
    parser.add_argument("--password", "-p", default="admin123", help="Superadmin password for login")
    parser.add_argument("--sku-prefix", "-s", default=None, help="Product SKU code prefix (e.g., KML)")
    parser.add_argument("--warehouses", "-w", default="SURAT,AHMEDABAD", help="Comma-separated warehouse names")

    args = parser.parse_args()
    create_tenant_company(
        name=args.name,
        email=args.email,
        password=args.password,
        sku_prefix=args.sku_prefix,
        warehouse_names=args.warehouses
    )

if __name__ == "__main__":
    main()
