import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CustomerAddress {
  id: string;
  customer_phone: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  reference: string | null;
  is_default: boolean;
  created_at: string;
}

export function useCustomerAddresses(phone: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['customer-addresses', phone],
    queryFn: async () => {
      if (!phone || phone.length < 14) return [];
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_phone', phone)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!phone && phone.length >= 14,
  });

  const createAddress = useMutation({
    mutationFn: async (address: Omit<CustomerAddress, 'id' | 'created_at'>) => {
      // If this is the first address, make it default
      const isFirst = addresses.length === 0;
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({ ...address, is_default: isFirst || address.is_default })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', phone] });
      toast({ title: 'Endereço salvo!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar endereço', variant: 'destructive' });
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerAddress> }) => {
      const { error } = await supabase
        .from('customer_addresses')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', phone] });
      toast({ title: 'Endereço atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', phone] });
      toast({ title: 'Endereço removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_phone', phone);
      
      // Then set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', phone] });
    },
  });

  return {
    addresses,
    isLoading,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}
