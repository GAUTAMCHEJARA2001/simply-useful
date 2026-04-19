import React from 'react';
import { RecipesTab } from './InventoryManagement/components/RecipesTab';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const BOMManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Strict check for SUPERADMIN
  if (user?.role !== 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BOM Management</h1>
          <p className="text-muted-foreground mt-1">Manage Bill of Materials and manufacturing recipes (Super Admin Only)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <RecipesTab onRefresh={() => {}} />
      </div>
    </div>
  );
};

export default BOMManagement;
