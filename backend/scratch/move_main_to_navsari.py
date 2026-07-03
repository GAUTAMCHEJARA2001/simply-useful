import os, psycopg2
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL", "postgresql://simply_useful_postgres_user:tlVAfpUo5RfutansLCGjMNGrrivh7si9@dpg-d8p1osgjs32c738an3ug-a.singapore-postgres.render.com/simply_useful_postgres")
url = urlparse(db_url)
conn = psycopg2.connect(
    host=url.hostname, port=url.port or 5432,
    dbname=url.path.lstrip("/"), user=url.username,
    password=url.password, sslmode="require"
)
conn.autocommit = False
cur = conn.cursor()

try:
    # 1. Show current counts
    cur.execute('SELECT COUNT(*) FROM wh_main."Product"')
    main_products = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM wh_main."Category"')
    main_cats = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM wh_main."Brand"')
    main_brands = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM wh_main."Unit"')
    main_units = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM wh_navsari_factory."Product"')
    nav_products = cur.fetchone()[0]
    print(f"[wh_main] Products:{main_products}  Categories:{main_cats}  Brands:{main_brands}  Units:{main_units}")
    print(f"[wh_navsari_factory] Products already:{nav_products}")

    if main_products == 0:
        print("ERROR: wh_main has 0 products. Nothing to move.")
        conn.close()
        exit(1)

    # 2. Copy Units
    print("Copying Units...")
    cur.execute('''
        INSERT INTO wh_navsari_factory."Unit" (id, name, active, "companyId")
        SELECT m.id, m.name, m.active, m."companyId"
        FROM wh_main."Unit" m
        WHERE NOT EXISTS (
            SELECT 1 FROM wh_navsari_factory."Unit" n
            WHERE n.name = m.name AND n."companyId" = m."companyId"
        )
        ON CONFLICT (id) DO NOTHING
    ''')
    print(f"  Inserted {cur.rowcount} new units")

    # 3. Copy Brands
    print("Copying Brands...")
    cur.execute('''
        INSERT INTO wh_navsari_factory."Brand" (id, name, active, "companyId")
        SELECT m.id, m.name, m.active, m."companyId"
        FROM wh_main."Brand" m
        WHERE NOT EXISTS (
            SELECT 1 FROM wh_navsari_factory."Brand" n
            WHERE n.name = m.name AND n."companyId" = m."companyId"
        )
        ON CONFLICT (id) DO NOTHING
    ''')
    print(f"  Inserted {cur.rowcount} new brands")

    # 4. Copy ALL root categories - use a temp mapping table so we can remap IDs
    print("Copying root Categories...")
    cur.execute('''
        INSERT INTO wh_navsari_factory."Category" (id, name, active, "companyId", "parentId")
        SELECT m.id, m.name, m.active, m."companyId", NULL
        FROM wh_main."Category" m
        WHERE m."parentId" IS NULL
        ON CONFLICT (id) DO NOTHING
    ''')
    print(f"  Inserted {cur.rowcount} root categories by ID")

    # 5. Copy ALL subcategories using the main schema's parentId (remapped to navsari equivalent)
    print("Copying Subcategories...")
    cur.execute('''
        INSERT INTO wh_navsari_factory."Category" (id, name, active, "companyId", "parentId")
        SELECT m.id, m.name, m.active, m."companyId",
            COALESCE(
                (SELECT n.id FROM wh_navsari_factory."Category" n WHERE n.id = m."parentId"),
                (SELECT n.id FROM wh_navsari_factory."Category" n JOIN wh_main."Category" mp ON mp.id = m."parentId" WHERE n.name = mp.name AND n."companyId" = mp."companyId" LIMIT 1)
            ) as "parentId"
        FROM wh_main."Category" m
        WHERE m."parentId" IS NOT NULL
        ON CONFLICT (id) DO NOTHING
    ''')
    print(f"  Inserted {cur.rowcount} subcategories by ID")

    # 6. Verify all main categories are now in navsari
    cur.execute('''
        SELECT COUNT(*) FROM wh_main."Category" m
        WHERE NOT EXISTS (SELECT 1 FROM wh_navsari_factory."Category" n WHERE n.id = m.id)
    ''')
    missing_cats = cur.fetchone()[0]
    print(f"  Categories still missing in navsari: {missing_cats}")
    if missing_cats > 0:
        cur.execute('''
            SELECT m.id, m.name FROM wh_main."Category" m
            WHERE NOT EXISTS (SELECT 1 FROM wh_navsari_factory."Category" n WHERE n.id = m.id)
        ''')
        for row in cur.fetchall():
            print(f"    MISSING: id={row[0]} name={row[1]}")

    # 7. Copy Products - map brand/unit/category by ID directly (they now all exist in navsari by same ID)
    print("Copying Products...")
    cur.execute('''
        INSERT INTO wh_navsari_factory."Product" (
            id, "productCode", name, "bagSize",
            "brandId", "unitId", rate, gst, active, "companyId",
            "categoryId", "openingStock", "minimumStock", "createdAt", "updatedAt"
        )
        SELECT 
            m.id, m."productCode", m.name, m."bagSize",
            m."brandId", m."unitId",
            m.rate, m.gst, m.active, m."companyId",
            m."categoryId",
            m."openingStock", m."minimumStock", m."createdAt", m."updatedAt"
        FROM wh_main."Product" m
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            "productCode" = EXCLUDED."productCode",
            rate = EXCLUDED.rate,
            gst = EXCLUDED.gst,
            "brandId" = EXCLUDED."brandId",
            "unitId" = EXCLUDED."unitId",
            "categoryId" = EXCLUDED."categoryId",
            "bagSize" = EXCLUDED."bagSize",
            "openingStock" = EXCLUDED."openingStock",
            "minimumStock" = EXCLUDED."minimumStock"
    ''')
    print(f"  Copied/Updated {cur.rowcount} products")

    # 8. Verify
    cur.execute('SELECT COUNT(*) FROM wh_navsari_factory."Product"')
    nav_after = cur.fetchone()[0]
    print(f"[VERIFY] wh_navsari_factory now has {nav_after} products (wh_main had {main_products})")

    if nav_after < main_products:
        raise Exception(f"Mismatch! Expected at least {main_products} in navsari, got {nav_after}. Aborting.")

    # 9. Clear wh_main
    print("Clearing wh_main...")
    cur.execute('DELETE FROM wh_main."Product"')
    print(f"  Deleted {cur.rowcount} products")
    cur.execute('DELETE FROM wh_main."Brand"')
    print(f"  Deleted {cur.rowcount} brands")
    cur.execute('DELETE FROM wh_main."Unit"')
    print(f"  Deleted {cur.rowcount} units")
    cur.execute('DELETE FROM wh_main."Category" WHERE "parentId" IS NOT NULL')
    print(f"  Deleted {cur.rowcount} subcategories")
    cur.execute('DELETE FROM wh_main."Category" WHERE "parentId" IS NULL')
    print(f"  Deleted {cur.rowcount} root categories")

    conn.commit()
    print("")
    print("SUCCESS: All product data moved from wh_main to wh_navsari_factory. wh_main is now clean!")

except Exception as e:
    conn.rollback()
    print(f"")
    print(f"ERROR: {e}")
    print("Rolled back. No data changed.")
finally:
    conn.close()
