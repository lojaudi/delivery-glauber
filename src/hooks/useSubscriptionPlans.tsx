import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPlan } from '@/types/reseller';
import { useCurrentReseller } from './useReseller';

// Hook para listar planos do revendedor
export function useSubscriptionPlans() {
  const { data: reseller } = useCurrentReseller();
  
  return useQuery({
    queryKey: ['subscription-plans', reseller?.id],
    queryFn: async () => {
      if (!reseller?.id) return [];
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('reseller_id', reseller.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
    enabled: !!reseller?.id,
  });
}

// Hook para criar plano
export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { data: reseller } = useCurrentReseller();
  
  return useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at' | 'reseller_id'>) => {
      if (!reseller?.id) throw new Error('Reseller not found');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          ...plan,
          reseller_id: reseller.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });
}

// Hook para atualizar plano
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });
}

// Hook para deletar plano
export function useDeletePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
  });
}
