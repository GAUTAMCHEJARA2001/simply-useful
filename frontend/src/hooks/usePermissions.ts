import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export const usePermissions = () => {
    const { user } = useAuth();
    const { permissions, settings } = useData();

    const can = useCallback((feature: string) => {
        if (!user) return false;

        // Prioritize freshly fetched role permissions from settings API if available
        const effectivePerms = (settings?.role_permissions && Array.isArray(settings.role_permissions) && settings.role_permissions.length > 0)
            ? settings.role_permissions
            : permissions;

        const perm = effectivePerms.find((p: any) => 
            (p.role || '').toUpperCase() === (user.role || '').toUpperCase() && 
            p.feature === feature
        );

        // If no permission record exists for this role/feature, default to standard role fallback
        if (!perm) {
            const role = (user.role || '').toUpperCase();
            if (role === 'SUPERADMIN' || role === 'ADMIN') return true;
            
            const salesFeatures = ['view_sales_dashboard', 'create_order', 'view_own_orders', 'track_visits', 'manage_expenses'];
            if (role.startsWith('SALES') && salesFeatures.includes(feature)) return true;

            const inventoryFeatures = ['view_inventory_dashboard'];
            if ((role.startsWith('INVENTORY') || role === 'PRODUCTION') && inventoryFeatures.includes(feature)) return true;
            
            // HR role specific
            const hrFeatures = ['view_inventory_dashboard', 'view_hr_dashboard', 'manage_hr'];
            if (role === 'HR' && hrFeatures.includes(feature)) return true;

            // Warehouse Manager specific
            const workerFeatures = ['view_inventory_dashboard', 'access_settings'];
            if (role === 'WAREHOUSE_MANAGER' && workerFeatures.includes(feature)) return true;

            return false;
        }

        return Boolean(perm.isEnabled);
    }, [user, permissions, settings?.role_permissions]);

    return { can };
};
