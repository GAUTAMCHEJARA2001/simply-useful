import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useWarehouses = () => {
  return useQuery({
    queryKey: QUERY_KEYS.warehouses,
    queryFn: async () => {
      const res = await inventoryService.getWarehouses();
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useUnits = () => {
  return useQuery({
    queryKey: QUERY_KEYS.units,
    queryFn: async () => {
      const res = await inventoryService.getUnits();
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useUnitMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (unit: any) => unit.id 
      ? api.put(`/masters/units/${unit.id}`, unit)
      : api.post('/masters/units', unit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.units });
      toast({ title: 'Success', description: 'Unit saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/masters/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.units });
      toast({ title: 'Deleted', description: 'Unit removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveUnit: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteUnit: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/masters/settings');
      return (res.data?.data || res.data || null);
    },
    retry: false
  });
};

export const useWarehouseMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (warehouse: any) => warehouse.id 
      ? api.put(`/masters/warehouses/${warehouse.id}`, warehouse)
      : api.post('/masters/warehouses', warehouse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.warehouses });
      toast({ title: 'Success', description: 'Warehouse saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/masters/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.warehouses });
      toast({ title: 'Success', description: 'Warehouse removed successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveWarehouse: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteWarehouse: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
