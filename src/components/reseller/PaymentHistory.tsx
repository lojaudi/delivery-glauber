import { SubscriptionPayment } from '@/types/reseller';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentBadge } from './SubscriptionBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentHistoryProps {
  payments: SubscriptionPayment[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum pagamento registrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Método</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>
                R$ {payment.amount.toFixed(2)}
              </TableCell>
              <TableCell>
                <PaymentBadge status={payment.status} />
              </TableCell>
              <TableCell>
                {payment.payment_date 
                  ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {payment.payment_method || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
