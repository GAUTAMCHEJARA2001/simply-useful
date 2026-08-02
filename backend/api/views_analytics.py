import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.views import _get_company_id, send_success

@api_view(['POST'])
def trigger_analytics_etl(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.analytics_etl import compile_analytical_warehouse
        company_id = _get_company_id(request)
        compile_analytical_warehouse(company_id)
        return send_success(None, 'Analytical Star Schema compiled successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'ETL compilation failed: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_kpis(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.semantic_metrics import get_governed_kpis
        company_id = _get_company_id(request)
        kpis = get_governed_kpis(company_id)
        return send_success(kpis, 'Governed KPIs retrieved successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to compute KPIs: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_predictions(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.predictions import get_predictions_dashboard
        company_id = _get_company_id(request)
        data = get_predictions_dashboard(company_id)
        return send_success(data, 'Predictive forecasts computed successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to calculate forecasts: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_alerts(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from django.db import connection
        company_id = _get_company_id(request)
        alerts = []
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, type, severity, entity_type, entity_id, metric_value, threshold, 
                       status, assigned_to, created_at, resolved_at, resolution_note 
                FROM AnalyticsAlert
                WHERE status IN ('Open', 'Acknowledged')
                ORDER BY 
                  CASE severity 
                    WHEN 'CRITICAL' THEN 1 
                    WHEN 'WARNING' THEN 2 
                    ELSE 3 
                  END ASC,
                  created_at DESC
            """)
            rows = cursor.fetchall()
            for r in rows:
                alerts.append({'id': r[0], 'type': r[1], 'severity': r[2], 'entity_type': r[3], 'entity_id': r[4], 'metric_value': r[5], 'threshold': r[6], 'status': r[7], 'assigned_to': r[8], 'created_at': r[9], 'resolved_at': r[10], 'resolution_note': r[11]})
        return send_success(alerts, 'Exception alerts retrieved successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to retrieve alerts: {str(e)}'}, status=500)

@api_view(['POST'])
def action_analytics_alert(request, pk):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    status = request.data.get('status')
    note = request.data.get('resolution_note') or ''
    if status not in ['Open', 'Acknowledged', 'Resolved']:
        return Response({'success': False, 'message': 'Invalid alert status'}, status=400)
    try:
        from django.db import connection
        today_str = datetime.date.today().strftime('%Y-%m-%d')
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM AnalyticsAlert WHERE id = %s', (pk,))
            if not cursor.fetchone():
                return Response({'success': False, 'message': 'Alert not found'}, status=404)
            if status == 'Resolved':
                cursor.execute("""
                    UPDATE AnalyticsAlert 
                    SET status = %s, resolved_at = %s, resolution_note = %s
                    WHERE id = %s
                """, (status, today_str, note, pk))
            else:
                cursor.execute("""
                    UPDATE AnalyticsAlert 
                    SET status = %s, resolution_note = %s
                    WHERE id = %s
                """, (status, note, pk))
        return send_success(None, 'Operational alert updated successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to update alert: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_cfo_liquidity(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.cfo_liquidity import get_cfo_liquidity_dashboard
        company_id = _get_company_id(request)
        data = get_cfo_liquidity_dashboard(company_id)
        return send_success(data, 'CFO liquidity metrics computed successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to compute CFO metrics: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_bottlenecks(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.bottlenecks import get_operational_bottlenecks
        company_id = _get_company_id(request)
        data = get_operational_bottlenecks(company_id)
        return send_success(data, 'Process bottleneck analysis computed successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to compute bottleneck metrics: {str(e)}'}, status=500)

@api_view(['GET'])
def get_analytics_data_quality(request):
    if request.user.role not in ['SUPERADMIN', 'ADMIN']:
        return Response({'success': False, 'message': 'Forbidden: Admin or SuperAdmin access only'}, status=403)
    try:
        from api.services.data_quality import get_data_quality_report
        company_id = _get_company_id(request)
        data = get_data_quality_report(company_id)
        return send_success(data, 'Data quality metrics compiled successfully')
    except Exception as e:
        return Response({'success': False, 'message': f'Failed to compile data quality: {str(e)}'}, status=500)
