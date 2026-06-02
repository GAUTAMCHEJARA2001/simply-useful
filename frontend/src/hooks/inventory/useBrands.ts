import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { Brand } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useBrands = () => {
  return useQuery({
    queryKey: QUERY_KEYS.brands,
    queryFn: async () => {
      const res = await inventoryService.getBrands();
      // Handle the nested structure { success: true, data: [...] }
      const data = res.data?.data || res.data || [];
      return data as Brand[];
    },
  });
};

export const useBrandMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (brand: Partial<Brand>) => inventoryService.saveBrand(brand),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.brands });
      toast({ title: 'Success', description: 'Brand saved successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save brand', 
        variant: 'destructive' 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.removeBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.brands });
      toast({ title: 'Deleted', description: 'Brand removed successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete brand', 
        variant: 'destructive' 
      });
    }
  });

  return {
    saveBrand: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteBrand: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
