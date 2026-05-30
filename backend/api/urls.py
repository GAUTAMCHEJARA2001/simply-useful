from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    auth_login, auth_register, auth_permissions, UserViewSet, ProductViewSet,
    CategoryViewSet, BrandViewSet, UnitViewSet, WarehouseViewSet, RegionViewSet,
    MarketViewSet, master_settings, DealerViewSet, DistributorViewSet, OrderViewSet,
    VisitViewSet, ExpenseViewSet, BOMViewSet, SupplierViewSet, LabourViewSet,
    
    # Reports
    report_dashboard_kpis, report_sales_summary, report_low_stock, report_daily,
    report_current_stock, report_aggregate_stock, report_global_inventory, report_stock_ledger,
    
    # Transactions
    transaction_purchases, transaction_purchase_detail, transaction_sales,
    transaction_sales_detail, transaction_approvals, transaction_approval_detail,
    transaction_approve, transaction_reject, transaction_productions,
    transaction_production_materials, transaction_adjustments, transaction_adjustments_detail,
    transaction_attendance, transaction_attendance_detail, transaction_returns,
    transaction_purchase_orders, transaction_purchase_order_items, transaction_purchase_order_detail,
    
    # Health & Metrics
    system_health, system_metrics
)

router = DefaultRouter(trailing_slash=False)
router.register('users', UserViewSet, basename='users')
router.register('products', ProductViewSet, basename='products')
router.register('masters/categories', CategoryViewSet, basename='masters-categories')
router.register('masters/brands', BrandViewSet, basename='masters-brands')
router.register('masters/warehouses', WarehouseViewSet, basename='masters-warehouses')
router.register('masters/units', UnitViewSet, basename='masters-units')
router.register('masters/regions', RegionViewSet, basename='masters-regions')
router.register('masters/markets', MarketViewSet, basename='masters-markets')
router.register('masters/suppliers', SupplierViewSet, basename='masters-suppliers')
router.register('masters/labours', LabourViewSet, basename='masters-labours')
router.register('dealers', DealerViewSet, basename='dealers')
router.register('distributors', DistributorViewSet, basename='distributors')
router.register('sales', OrderViewSet, basename='sales')
router.register('visits', VisitViewSet, basename='visits')
router.register('expenses', ExpenseViewSet, basename='expenses')
router.register('bom', BOMViewSet, basename='bom')

urlpatterns = [
    # Auth
    path('auth/login', auth_login, name='auth-login'),
    path('auth/register', auth_register, name='auth-register'),
    path('auth/permissions', auth_permissions, name='auth-permissions'),
    
    # Master custom settings
    path('masters/settings', master_settings, name='master-settings'),
    path('masters/products', ProductViewSet.as_view({'get': 'list'}), name='master-products'),
    
    # Reports
    path('reports/dashboard-kpis', report_dashboard_kpis, name='report-dashboard-kpis'),
    path('reports/sales-summary', report_sales_summary, name='report-sales-summary'),
    path('reports/low-stock', report_low_stock, name='report-low-stock'),
    path('reports/daily', report_daily, name='report-daily'),
    path('reports/current-stock', report_current_stock, name='report-current-stock'),
    path('reports/stock-ledger/<str:pk>', report_stock_ledger, name='report-stock-ledger'),
    path('reports/aggregate-stock', report_aggregate_stock, name='report-aggregate-stock'),
    path('reports/global-inventory', report_global_inventory, name='report-global-inventory'),
    
    # Transactions
    path('transactions/purchases', transaction_purchases, name='tx-purchases'),
    path('transactions/purchases/<str:pk>', transaction_purchase_detail, name='tx-purchase-detail'),
    path('transactions/sales', transaction_sales, name='tx-sales'),
    path('transactions/sales/<str:pk>', transaction_sales_detail, name='tx-sales-detail'),
    path('transactions/approvals', transaction_approvals, name='tx-approvals'),
    path('transactions/approvals/<str:pk>', transaction_approval_detail, name='tx-approval-detail'),
    path('transactions/approvals/<str:pk>/approve', transaction_approve, name='tx-approve'),
    path('transactions/approvals/<str:pk>/reject', transaction_reject, name='tx-reject'),
    path('transactions/productions', transaction_productions, name='tx-productions'),
    path('transactions/productions/<str:pk>/materials', transaction_production_materials, name='tx-production-materials'),
    path('transactions/adjustments', transaction_adjustments, name='tx-adjustments'),
    path('transactions/adjustments/<str:pk>', transaction_adjustments_detail, name='tx-adjustment-detail'),
    path('transactions/attendance', transaction_attendance, name='tx-attendance'),
    path('transactions/attendance/<str:pk>', transaction_attendance_detail, name='tx-attendance-detail'),
    path('transactions/returns', transaction_returns, name='tx-returns'),
    path('transactions/purchase-orders', transaction_purchase_orders, name='tx-purchase-orders'),
    path('transactions/purchase-orders/<str:pk>', transaction_purchase_order_detail, name='tx-purchase-order-detail'),
    path('transactions/purchase-orders/<str:pk>/items', transaction_purchase_order_items, name='tx-purchase-order-items'),
    
    # System Health
    path('health', system_health, name='system-health'),
    path('metrics', system_metrics, name='system-metrics'),
    
    # Router endpoints
    path('', include(router.urls)),
]
