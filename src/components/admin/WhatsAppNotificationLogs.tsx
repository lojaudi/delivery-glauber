import { Loader2, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppLogs } from '@/hooks/useWhatsAppLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WhatsAppNotificationLogs() {
  const { data: logs, isLoading } = useWhatsAppLogs();

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        Histórico de Notificações WhatsApp
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma notificação enviada ainda
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-background"
            >
              <div className="flex items-start gap-3 min-w-0">
                {log.status === 'sent' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Pedido #{log.order_id}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {log.phone} • {log.instance_name}
                  </p>
                  {log.error_message && (
                    <p className="text-xs text-destructive mt-1 line-clamp-2">
                      {log.error_message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-[10px]">
                  {log.status === 'sent' ? 'Enviado' : 'Erro'}
                </Badge>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
