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

      // Stay on the exact current page and sub-path / query parameters so the user is not redirected
      navigate(`${location.pathname}${location.search}`, { replace: true });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center shrink-0">
      <Select value={activeWarehouseId || undefined} onValueChange={handleWarehouseChange} disabled={switching}>
        <SelectTrigger className="w-[110px] sm:w-[160px] bg-background text-[11px] sm:text-xs font-semibold h-8 px-2 sm:px-3 border-border/80 shadow-2xs">
          <SelectValue placeholder={switching ? '…' : 'Warehouse'} />
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
