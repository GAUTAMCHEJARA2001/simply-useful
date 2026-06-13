import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const WarehouseSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { activeWarehouseId, setActiveWarehouse } = useWarehouse();
  const location = useLocation();

  if (!user || !user.authorizedWarehouses || user.authorizedWarehouses.length === 0) {
    if (user?.role !== 'SUPERADMIN') return null;
  }

  // Only show on inventory management pages for all users
  if (!location.pathname.startsWith('/inventory')) {
    return null;
  }

  const handleWarehouseChange = (value: string) => {
    if (value === 'GLOBAL') {
      setActiveWarehouse('GLOBAL', 'Global Data');
      window.location.reload();
      return;
    }
    const selected = user?.authorizedWarehouses?.find(w => String(w.id) === String(value));
    if (selected) {
      setActiveWarehouse(selected.id, selected.name);
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
          {user?.authorizedWarehouses?.map((wh) => (
            <SelectItem key={wh.id} value={String(wh.id)}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
