import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { inventoryService } from '@/api/services/inventory.service';
import { useQueryClient } from '@tanstack/react-query';

export const WarehouseSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { activeWarehouseId, setActiveWarehouse } = useWarehouse();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [warehouses, setWarehouses] = useState<{ id: string | number; name: string }[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      inventoryService.getWarehouses()
        .then((res) => {
          if (res.data && res.data.success) {
            setWarehouses(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Failed to load warehouses in switcher:", err);
        });
    } else if (user?.authorizedWarehouses) {
      setWarehouses(user.authorizedWarehouses);
    }
  }, [user]);

  if (!user) return null;

  if (user.role !== 'SUPERADMIN' && warehouses.length === 0) {
    return null;
  }

  // Only show on inventory management, dealers, and distributors pages for all users
  const allowedPaths = ['/inventory', '/admin/dealers', '/admin/distributors'];
  if (!allowedPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  const handleWarehouseChange = async (value: string) => {
    if (switching) return;
    setSwitching(true);

    try {
      if (value === 'GLOBAL') {
        setActiveWarehouse('GLOBAL', 'Global Data');
      } else {
        const selected = warehouses.find(w => String(w.id) === String(value));
        if (selected) {
          setActiveWarehouse(String(selected.id), selected.name);
        }
      }

      // Clear all cached queries so fresh data is fetched for the new warehouse
      await queryClient.invalidateQueries();

      // Navigate to the same page base (strip sub-paths to force component remount)
      const basePath = allowedPaths.find(p => location.pathname.startsWith(p)) || location.pathname;
      navigate(basePath, { replace: true });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mr-0 sm:mr-4 shrink-0">
      <div className="bg-primary/10 p-2 rounded-full hidden sm:flex">
        <Building2 className={`w-4 h-4 text-primary ${switching ? 'animate-spin' : ''}`} />
      </div>
      <Select value={activeWarehouseId || undefined} onValueChange={handleWarehouseChange} disabled={switching}>
        <SelectTrigger className="w-[120px] sm:w-[180px] bg-background text-xs sm:text-sm h-8 sm:h-10">
          <SelectValue placeholder={switching ? 'Switching…' : 'Warehouse'} />
        </SelectTrigger>
        <SelectContent>
          {user?.role === 'SUPERADMIN' && (
            <SelectItem value="GLOBAL" className="font-bold text-primary">
              🌍 Global Data
            </SelectItem>
          )}
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={String(wh.id)}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
