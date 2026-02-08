import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckoutParams {
  resellerId: string;
  planId: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
}

interface CheckoutResponse {
  success: boolean;
  leadId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  totalAmount: number;
  planName: string;
}

export function useLandingCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CheckoutParams): Promise<CheckoutResponse> => {
      console.log('Creating checkout with params:', params);
      
      const { data, error } = await supabase.functions.invoke('mercadopago-landing-checkout', {
        body: params
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Erro ao criar checkout');
      }
      
      if (data.error) {
        console.error('Checkout error:', data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Checkout criado!',
        description: `Redirecionando para pagamento do plano ${data.planName}...`,
      });
      
      // Redirect to Mercado Pago checkout
      if (data.initPoint) {
        window.location.href = data.initPoint;
      }
    },
    onError: (error: Error) => {
      console.error('Checkout mutation error:', error);
      toast({
        title: 'Erro ao criar checkout',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}
