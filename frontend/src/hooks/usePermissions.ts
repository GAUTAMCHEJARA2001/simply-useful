import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export const usePermissions = () => {
    const { user } = useAuth();
    const { permissions } = useData();

    const can = useCallback((feature: string) => {
        if (!user) return false;

        // SuperAdmin always has access unless explicitly disabled (unlikely)
        // or we can just say if it's superadmin and no specific record exists, allow it.

        const perm = permissions.find(p => 
            (p.role || '').toUpperCase() === (user.role || '').toUpperCase() && 
            p.feature === feature
        );

        // If no permission record exists for this role/feature, default to false
        // unless it's a SUPERADMIN, which we might want to default to true for safety.
        if (!perm) {
            const role = (user.role || '').toUpperCase();
            if (role === 'SUPERADMIN') return true;
            
            const salesFeatures = ['view_sales_dashboard', 'create_order', 'view_own_orders', 'track_visits', 'manage_expenses'];
            if (role.startsWith('SALES') && salesFeatures.includes(feature)) return true;

            const inventoryFeatures = ['view_inventory_dashboard'];
            if (role.startsWith('INVENTORY') && inventoryFeatures.includes(feature)) return true;
            
            // Warehouse Manager specific
            const workerFeatures = ['view_inventory_dashboard', 'access_settings'];
            if (role === 'WAREHOUSE_MANAGER' && workerFeatures.includes(feature)) return true;

            return false;
        }

        return perm.is_enabled;
    }, [user, permissions]);

    return { can };
};
