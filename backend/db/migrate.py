import os
import sys
import psycopg2
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hissaby.migrate")

from core.config import settings

DIRECT_URL = settings.DIRECT_URL or os.getenv("DIRECT_URL", "")

def run_migrations():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if not os.path.exists(schema_path):
        logger.error(f"Schema file not found at {schema_path}")
        sys.exit(1)
        
    logger.info("Reading schema.sql...")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    logger.info(f"Connecting to Neon DB via direct endpoint...")
    try:
        conn = psycopg2.connect(DIRECT_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        logger.info("Executing schema migration...")
        cur.execute(schema_sql)
        
        # Verify created tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cur.fetchall()]
        logger.info(f"Migration completed successfully! {len(tables)} tables verified in Neon DB:")
        for t in tables:
            logger.info(f"  ✓ {t}")
            
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
