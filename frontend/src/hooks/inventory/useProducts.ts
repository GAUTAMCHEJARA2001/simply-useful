import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useProducts = (params?: { search?: string }) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, params],
    queryFn: async () => {
      const res = await inventoryService.getProductsMaster();
      const data = res.data?.data || res.data || [];
      
      // Basic client-side search if needed, though usually handled by API
      if (params?.search) {
        const s = params.search.toLowerCase();
        return (data as Product[]).filter(p => 
          p.productName?.toLowerCase().includes(s) || 
          p.productCode?.toLowerCase().includes(s) ||
          p.sku?.toLowerCase().includes(s) ||
          p.name?.toLowerCase().includes(s)
        );
      }
      
      return data as Product[];
    },
  });
};

export const useProductMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (product: Partial<Product>) => {
      if (product.id) {
        return inventoryService.update(product.id, product);
      }
      return inventoryService.create(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      toast({ title: 'Success', description: 'Product saved successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save product', 
        variant: 'destructive' 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      toast({ title: 'Deleted', description: 'Product removed successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete product', 
        variant: 'destructive' 
      });
    }
  });

  return {
    saveProduct: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
