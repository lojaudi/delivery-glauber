import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateSubscriptionParams {
  restaurantId: string;
  payerEmail: string;
  resellerId: string;
}

interface CancelSubscriptionParams {
  restaurantId: string;
  resellerId: string;
}

export function useCreateMPSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      const { data, error } = await supabase.functions.invoke('mercadopago-create-subscription', {
        body: params
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-details'] });
      toast({
        title: 'Assinatura criada!',
        description: 'Link de pagamento gerado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}

export function useCancelMPSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CancelSubscriptionParams) => {
      const { data, error } = await supabase.functions.invoke('mercadopago-cancel-subscription', {
        body: params
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-details'] });
      toast({
        title: 'Assinatura cancelada',
        description: 'A assinatura foi cancelada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}
