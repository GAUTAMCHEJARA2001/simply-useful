import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, MapPin, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface BottomNavProps {
  onMenuClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 min-h-[4rem] bg-card border-t border-border flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <NavLink
        to="/sales"
        end
        className={({ isActive }) => cn(
          "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground",
          isActive && "text-primary"
        )}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </NavLink>

      <NavLink
        to="/sales/orders"
        className={({ isActive }) => cn(
          "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground",
          isActive && "text-primary"
        )}
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-[10px] font-medium">Orders</span>
      </NavLink>

      <NavLink
        to="/sales/visits"
        className={({ isActive }) => cn(
          "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground",
          isActive && "text-primary"
        )}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[10px] font-medium">Visits</span>
      </NavLink>

      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground active:text-primary"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </div>
  );
};

export default BottomNav;
