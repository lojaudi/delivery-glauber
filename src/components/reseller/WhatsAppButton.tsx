import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface WhatsAppButtonProps {
  restaurantId: string;
  phone: string | null;
  ownerName: string | null;
  restaurantName: string;
  paymentLink: string;
  monthlyFee: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WhatsAppButton({
  restaurantId,
  phone,
  ownerName,
  restaurantName,
  paymentLink,
  monthlyFee,
  variant = 'default',
  size = 'default',
  className,
}: WhatsAppButtonProps) {
  const [isLogging, setIsLogging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    
    // Adiciona código do país se necessário
    if (numbers.length === 11) {
      return `55${numbers}`;
    } else if (numbers.length === 10) {
      return `55${numbers}`;
    }
    return numbers;
  };

  const generateMessage = () => {
    const name = ownerName || 'cliente';
    return `Olá${name !== 'cliente' ? ` ${name}` : ''}! 👋

Segue o link para ativar sua assinatura do sistema *${restaurantName}*:

💳 *Link de Pagamento:*
${paymentLink}

💰 *Valor:* ${formatCurrency(monthlyFee)}/mês

Após a confirmação do pagamento, seu acesso será liberado automaticamente.

Qualquer dúvida, estou à disposição! 🙂`;
  };

  const handleClick = async () => {
    const message = generateMessage();
    const formattedPhone = phone ? formatPhone(phone) : '';
    
    // Abrir WhatsApp
    const whatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // Registrar no histórico
    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('communication_logs')
          .insert({
            restaurant_id: restaurantId,
            type: 'whatsapp',
            message: `Link de pagamento enviado via WhatsApp${phone ? ` para ${phone}` : ''}`,
            sent_by: user.id,
          });
        
        queryClient.invalidateQueries({ queryKey: ['communication-logs', restaurantId] });
      }
    } catch (error) {
      console.error('Erro ao registrar comunicação:', error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLogging}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      {isLogging ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </>
      )}
    </Button>
  );
}