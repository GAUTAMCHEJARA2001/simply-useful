import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { inventoryService } from '@/api/services/inventory.service';

export const WarehouseSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { activeWarehouseId, setActiveWarehouse } = useWarehouse();
  const location = useLocation();
  const [warehouses, setWarehouses] = useState<{ id: string | number; name: string }[]>([]);

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

  const handleWarehouseChange = (value: string) => {
    if (value === 'GLOBAL') {
      setActiveWarehouse('GLOBAL', 'Global Data');
      window.location.reload();
      return;
    }
    const selected = warehouses.find(w => String(w.id) === String(value));
    if (selected) {
      setActiveWarehouse(String(selected.id), selected.name);
    }
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 mr-4">
      <div className="bg-primary/10 p-2 rounded-full hidden sm:flex">
        <Building2 className="w-4 h-4 text-primary" />
      </div>
      <Select value={activeWarehouseId || undefined} onValueChange={handleWarehouseChange}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Select Warehouse" />
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
