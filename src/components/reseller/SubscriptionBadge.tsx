import { Badge } from '@/components/ui/badge';
import { SubscriptionStatus, PaymentStatus } from '@/types/reseller';

interface SubscriptionBadgeProps {
  status: SubscriptionStatus;
}

interface PaymentBadgeProps {
  status: PaymentStatus;
}

const subscriptionConfig = {
  trial: { label: 'Teste', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  active: { label: 'Ativo', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  suspended: { label: 'Suspenso', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

const paymentConfig = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  paid: { label: 'Pago', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  overdue: { label: 'Atrasado', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

export function SubscriptionBadge({ status }: SubscriptionBadgeProps) {
  const config = subscriptionConfig[status];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: PaymentBadgeProps) {
  const config = paymentConfig[status];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
