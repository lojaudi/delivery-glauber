import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Mail, Phone, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface CommunicationLog {
  id: string;
  restaurant_id: string;
  type: 'whatsapp' | 'email' | 'manual';
  message: string;
  sent_at: string;
  sent_by: string;
}

interface CommunicationHistoryProps {
  restaurantId: string;
}

const typeConfig = {
  whatsapp: { label: 'WhatsApp', icon: Phone, variant: 'default' as const, color: 'text-green-600' },
  email: { label: 'E-mail', icon: Mail, variant: 'secondary' as const, color: 'text-blue-600' },
  manual: { label: 'Manual', icon: MessageSquare, variant: 'outline' as const, color: 'text-gray-600' },
};

export function CommunicationHistory({ restaurantId }: CommunicationHistoryProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['communication-logs', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as CommunicationLog[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('communication_logs')
        .insert({
          restaurant_id: restaurantId,
          type: 'manual',
          message,
          sent_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-logs', restaurantId] });
      setNote('');
      setShowAddNote(false);
      toast({ title: 'Nota adicionada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar nota', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNote.mutate(note.trim());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Histórico de Comunicações
            </CardTitle>
            <CardDescription>
              Registro de mensagens enviadas ao restaurante
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddNote(!showAddNote)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Nota
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddNote && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
            <Textarea
              placeholder="Adicione uma nota sobre contato manual..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAddNote(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={addNote.isPending}>
                {addNote.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs && logs.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs.map((log) => {
                const config = typeConfig[log.type];
                const Icon = config.icon;
                
                return (
                  <div key={log.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={config.variant} className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma comunicação registrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}