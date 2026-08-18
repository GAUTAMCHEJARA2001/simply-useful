import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/api/apiService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import DataTable from '@/components/DataTable';

const EstimateList: React.FC = () => {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const res = await apiService.estimates.getAll();
      if (res.data?.success === false) {
        throw new Error(res.data.message);
      }
      setEstimates(res.data || []);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to fetch estimates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;
    try {
      await apiService.estimates.delete(id);
      toast({ title: 'Success', description: 'Estimate deleted' });
      fetchEstimates();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete estimate', variant: 'destructive' });
    }
  };

  const filteredEstimates = estimates.filter(est => 
    (est.partyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (est.estimateId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Date',
      accessor: (row: any) => new Date(row.date || row.createdAt).toLocaleDateString(),
    },
    {
      header: 'Estimate ID',
      accessor: (row: any) => row.estimateId || 'N/A',
    },
    {
      header: 'Party Name',
      accessor: (row: any) => row.partyName || 'Walk-in',
    },
    {
      header: 'Amount',
      accessor: (row: any) => `₹${(row.grandTotal || 0).toLocaleString()}`,
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/sales/estimate/${row.id}`)}>
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 mt-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Estimates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and edit your saved quotation estimates.</p>
        </div>
        <Button onClick={() => navigate('/sales/estimate')} className="h-10">
          <Plus className="w-4 h-4 mr-2" /> New Estimate
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by party name or estimate ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <DataTable 
            data={filteredEstimates}
            columns={columns}
            loading={loading}
            emptyMessage="No estimates found."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimateList;
