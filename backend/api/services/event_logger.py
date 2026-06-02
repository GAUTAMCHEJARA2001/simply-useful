from django.db import connection
from django.utils import timezone
import datetime

def log_operational_event(entity_type, entity_id, old_state, new_state, user_email, company_id=None):
    """
    Writes an immutable event entry to the OperationalEventLedger.
    Computes exact duration_seconds spent in the old_state.
    """
    # SQLite UTC standard timestamp formatting
    today_str = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
    
    with connection.cursor() as cursor:
        duration_seconds = 0.0
        
        # Check last transition event for this specific entity
        cursor.execute("""
            SELECT timestamp FROM OperationalEventLedger 
            WHERE entity_type = %s AND entity_id = %s 
            ORDER BY timestamp DESC LIMIT 1
        """, (entity_type, entity_id))
        row = cursor.fetchone()
        
        if row:
            try:
                last_time = datetime.datetime.strptime(row[0], '%Y-%m-%d %H:%M:%S')
                curr_time = datetime.datetime.now()
                duration_seconds = (curr_time - last_time).total_seconds()
            except:
                pass
        else:
            # If no previous event log, calculate duration based on database creation timestamp
            if entity_type == 'Order':
                cursor.execute("SELECT createdAt FROM `Order` WHERE id = %s", (entity_id,))
                cre_row = cursor.fetchone()
                if cre_row and cre_row[0]:
                    try:
                        val = cre_row[0]
                        if hasattr(val, 'timestamp'):
                            duration_seconds = (timezone.now() - val).total_seconds()
                        else:
                            last_time = datetime.datetime.strptime(str(val).split('.')[0].replace('T', ' ').replace('Z', ''), '%Y-%m-%d %H:%M:%S')
                            curr_time = datetime.datetime.now()
                            duration_seconds = (curr_time - last_time).total_seconds()
                    except:
                        pass
            elif entity_type == 'Lead':
                cursor.execute("SELECT createdAt FROM Lead WHERE id = %s", (entity_id,))
                cre_row = cursor.fetchone()
                if cre_row and cre_row[0]:
                    try:
                        val = cre_row[0]
                        if hasattr(val, 'timestamp'):
                            duration_seconds = (timezone.now() - val).total_seconds()
                        else:
                            last_time = datetime.datetime.strptime(str(val).split('.')[0].replace('T', ' ').replace('Z', ''), '%Y-%m-%d %H:%M:%S')
                            curr_time = datetime.datetime.now()
                            duration_seconds = (curr_time - last_time).total_seconds()
                    except:
                        pass
                        
        event_id = f"evt_{entity_type.lower()}_{entity_id}_{timezone.now().timestamp()}"
        cursor.execute("""
            INSERT INTO OperationalEventLedger (id, entity_type, entity_id, old_state, new_state, timestamp, user_email, duration_seconds, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (event_id, entity_type, entity_id, old_state or 'None', new_state, today_str, user_email or 'system', max(duration_seconds, 0.0), company_id))
        
    return True
