import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WarehouseContextType {
  activeWarehouseId: string | null;
  activeWarehouseName: string | null;
  setActiveWarehouse: (id: string | null, name: string | null) => void;
}

const WarehouseContext = createContext<WarehouseContextType | null>(null);

export const useWarehouse = () => {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error('useWarehouse must be used within WarehouseProvider');
  return ctx;
};

export const WarehouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeWarehouseId, setActiveWarehouseIdState] = useState<string | null>(() => {
    return localStorage.getItem('activeWarehouseId');
  });
  const [activeWarehouseName, setActiveWarehouseNameState] = useState<string | null>(() => {
    return localStorage.getItem('activeWarehouseName');
  });

  const setActiveWarehouse = useCallback((id: string | null, name: string | null) => {
    setActiveWarehouseIdState(id);
    setActiveWarehouseNameState(name);
    if (id) {
      localStorage.setItem('activeWarehouseId', id);
    } else {
      localStorage.removeItem('activeWarehouseId');
    }
    if (name) {
      localStorage.setItem('activeWarehouseName', name);
    } else {
      localStorage.removeItem('activeWarehouseName');
    }
  }, []);

  // Initialize from user's authorized warehouses if not set
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
        if (!activeWarehouseId) {
          setActiveWarehouse('GLOBAL', 'Global Data');
        }
        return;
      }

      if (user.authorizedWarehouses && user.authorizedWarehouses.length > 0) {
        // Check if current active warehouse is valid for this user
        let currentValid = user.authorizedWarehouses.find(w => String(w.id) === String(activeWarehouseId));
        
        // If no valid active warehouse, default to the first one
        if (!currentValid) {
          const defaultWh = user.authorizedWarehouses[0];
          setActiveWarehouse(defaultWh.id, defaultWh.name);
        }
      } else {
        // If user has no specific warehouses assigned (e.g. Sales Officer only assigned products),
        // fallback to GLOBAL so they can see their assigned products across all warehouses.
        if (!activeWarehouseId) {
          setActiveWarehouse('GLOBAL', 'Global Data');
        }
      }
    }
  }, [user, activeWarehouseId, setActiveWarehouse]);

  // If user logs out, clear warehouse state
  useEffect(() => {
    if (!user) {
      setActiveWarehouse(null, null);
    }
  }, [user, setActiveWarehouse]);

  return (
    <WarehouseContext.Provider value={{ activeWarehouseId, activeWarehouseName, setActiveWarehouse }}>
      {children}
    </WarehouseContext.Provider>
  );
};
