import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connections

cursor = connections['default'].cursor()

# Check which schemas have a Lead table
cursor.execute("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename")
rows = cursor.fetchall()

schemas = {}
for schema, table in rows:
    if schema not in schemas:
        schemas[schema] = []
    schemas[schema].append(table)

for schema in sorted(schemas.keys()):
    print(f"\n=== Schema: {schema} ({len(schemas[schema])} tables) ===")
    for t in sorted(schemas[schema]):
        print(f"  {t}")

# Specifically check Lead
print("\n\n=== Lead table locations ===")
cursor.execute("SELECT schemaname FROM pg_tables WHERE tablename = 'Lead'")
print([r[0] for r in cursor.fetchall()])

# Check LeadFollowUp  
cursor.execute("SELECT schemaname FROM pg_tables WHERE tablename = 'LeadFollowUp'")
print("LeadFollowUp:", [r[0] for r in cursor.fetchall()])

# Check LeadStageHistory
cursor.execute("SELECT schemaname FROM pg_tables WHERE tablename = 'LeadStageHistory'")
print("LeadStageHistory:", [r[0] for r in cursor.fetchall()])
