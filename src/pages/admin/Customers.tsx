import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useCustomers } from '@/hooks/useCustomers';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useCampaignSender } from '@/hooks/useCampaignSender';
import { useStoreConfig } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Trash2, MessageCircle, Users, Loader2, ImagePlus, X,
  ChevronLeft, ChevronRight, Send, Clock, Calendar,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function Customers() {
  const { customers, isLoading, deleteCustomers } = useCustomers();
  const { restaurantId } = useRestaurant();
  const { data: store } = useStoreConfig();
  const { user } = useAuth();
  const { toast } = useToast();
  const { state: senderState, startSending, cancelSending } = useCampaignSender();

  // State
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [campaignImagePreview, setCampaignImagePreview] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtered & paginated
  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const lower = search.toLowerCase();
    return customers.filter(c => c.customer_name.toLowerCase().includes(lower));
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomers.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast({ title: 'Clientes excluídos com sucesso' });
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCampaignImage(file);
      setCampaignImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setCampaignImage(null);
    setCampaignImagePreview(null);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSendCampaign = async () => {
    if (!campaignMessage.trim() || selectedIds.size === 0 || !restaurantId || !user) return;

    setIsSaving(true);
    try {
      // Upload image if provided
      let imageUrl: string | null = null;
      if (campaignImage) {
        const ext = campaignImage.name.split('.').pop();
        const path = `campaigns/${restaurantId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('store-assets')
          .upload(path, campaignImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const scheduledAt = isScheduled && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const selectedCustomers = customers.filter(c => selectedIds.has(c.id));

      // Create campaign
      const { data: campaign, error: campError } = await supabase
        .from('campaigns')
        .insert({
          restaurant_id: restaurantId,
          message: campaignMessage,
          image_url: imageUrl,
          status: scheduledAt ? 'scheduled' : 'pending',
          total_recipients: selectedCustomers.length,
          scheduled_at: scheduledAt,
          created_by: user.id,
        })
        .select()
        .single();

      if (campError) throw campError;

      // Insert recipients
      const recipients = selectedCustomers.map(c => ({
        campaign_id: campaign.id,
        customer_id: c.id,
        customer_phone: c.customer_phone,
        customer_name: c.customer_name,
      }));

      const { data: insertedRecipients, error: recError } = await supabase
        .from('campaign_recipients')
        .insert(recipients)
        .select();

      if (recError) throw recError;

      if (scheduledAt) {
        toast({ title: 'Campanha agendada!', description: `Envio programado para ${new Date(scheduledAt).toLocaleString('pt-BR')}` });
      } else {
        // Start sending immediately
        const recipientData = (insertedRecipients || []).map(r => ({
          id: r.id,
          phone: r.customer_phone,
          name: r.customer_name,
        }));
        startSending(campaign.id, recipientData, campaignMessage, imageUrl, store?.evolution_instance_name || '');
        toast({ title: 'Envio iniciado!', description: 'Você pode navegar por outras páginas sem perder o progresso.' });
      }

      setShowCampaignModal(false);
      setCampaignMessage('');
      setCampaignImage(null);
      setCampaignImagePreview(null);
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
    } catch (err: any) {
      toast({ title: 'Erro ao criar campanha', description: err?.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Clientes">
      <div className="space-y-4">
        {/* Sending progress bar (persists across navigation) */}
        {senderState.isRunning && (
          <Card className="border-primary">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium">Enviando campanha...</span>
                </div>
                <Button variant="ghost" size="sm" onClick={cancelSending}>Cancelar</Button>
              </div>
              <Progress value={(senderState.progress / senderState.total) * 100} />
              <p className="text-xs text-muted-foreground">
                {senderState.progress}/{senderState.total} — ✅ {senderState.sent} enviados · ❌ {senderState.failed} falhas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} clientes cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Badge variant="secondary">{selectedIds.size} selecionados</Badge>
                <Button variant="outline" size="sm" onClick={() => setShowCampaignModal(true)}>
                  <MessageCircle className="h-4 w-4 mr-1" /> Campanha
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente encontrado</p>
                <p className="text-xs mt-1">Os clientes aparecerão automaticamente ao receberem pedidos.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-right">Total gasto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={() => toggleSelect(customer.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.customer_phone}</TableCell>
                      <TableCell className="text-center">{customer.total_orders}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.total_spent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} cliente(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os dados dos clientes selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Modal */}
      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Nova Campanha
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Enviar para <strong>{selectedIds.size}</strong> cliente(s) selecionado(s)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                placeholder="Digite a mensagem da campanha... Use {nome} para inserir o nome do cliente."
                value={campaignMessage}
                onChange={e => setCampaignMessage(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Use <code>{'{nome}'}</code> para personalizar com o nome do cliente.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Imagem (opcional)</label>
              {campaignImagePreview ? (
                <div className="relative inline-block">
                  <img src={campaignImagePreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Anexar imagem</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            {/* Scheduled */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={(v) => setIsScheduled(!!v)}
                />
                <label htmlFor="schedule" className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Agendar envio
                </label>
              </div>
              {isScheduled && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSendCampaign}
              disabled={!campaignMessage.trim() || isSaving || (isScheduled && (!scheduledDate || !scheduledTime))}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : isScheduled ? (
                <Clock className="h-4 w-4 mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              {isScheduled ? 'Agendar' : 'Enviar agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
