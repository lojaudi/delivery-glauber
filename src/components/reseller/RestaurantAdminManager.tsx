import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, Users, Crown, UserCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  useRestaurantAdmins, 
  useDeleteRestaurantAdmin 
} from '@/hooks/useReseller';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AdminWithEmail {
  id: string;
  user_id: string;
  restaurant_id: string;
  is_owner: boolean;
  created_at: string;
  email?: string;
}

interface RestaurantAdminManagerProps {
  restaurantId: string;
  restaurantName: string;
}

export function RestaurantAdminManager({ restaurantId, restaurantName }: RestaurantAdminManagerProps) {
  const { data: admins, isLoading } = useRestaurantAdmins(restaurantId);
  const deleteAdmin = useDeleteRestaurantAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [adminsWithEmail, setAdminsWithEmail] = useState<AdminWithEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{ id: string; userId: string; email?: string } | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch emails for admins
  useEffect(() => {
    const fetchEmails = async () => {
      if (!admins || admins.length === 0) {
        setAdminsWithEmail([]);
        return;
      }

      setLoadingEmails(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-admin-emails', {
          body: { userIds: admins.map(a => a.user_id) },
        });

        if (error) throw error;

        const emailMap: Record<string, string> = data?.emails || {};
        
        setAdminsWithEmail(admins.map(admin => ({
          ...admin,
          email: emailMap[admin.user_id] || undefined,
        })));
      } catch (error) {
        console.error('Error fetching admin emails:', error);
        // Fallback to admins without emails
        setAdminsWithEmail(admins.map(admin => ({ ...admin })));
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, [admins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Erro',
        description: 'E-mail e senha são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call edge function to create admin user
      const { data, error } = await supabase.functions.invoke('create-restaurant-admin', {
        body: {
          email: email.trim(),
          password,
          restaurantId,
          isOwner,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Administrador criado!',
        description: `Acesso criado para ${email}`,
      });

      // Reset form and close modal
      setEmail('');
      setPassword('');
      setIsOwner(false);
      setModalOpen(false);
      
      // Refresh admins list
      queryClient.invalidateQueries({ queryKey: ['restaurant-admins', restaurantId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar administrador',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;

    try {
      await deleteAdmin.mutateAsync({ 
        id: adminToDelete.id, 
        restaurantId 
      });
      toast({ title: 'Administrador removido' });
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Administradores
              </CardTitle>
              <CardDescription>
                Gerencie quem pode acessar o painel do restaurante
              </CardDescription>
            </div>
            <Button onClick={() => setModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {adminsWithEmail.length === 0 && !loadingEmails ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum administrador cadastrado</p>
              <p className="text-sm">Crie um administrador para permitir o acesso ao painel.</p>
            </div>
          ) : loadingEmails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {adminsWithEmail.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      {admin.is_owner ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : (
                        <UserCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="font-medium text-sm">{admin.email || 'Email não disponível'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {admin.is_owner ? 'Proprietário' : 'Administrador'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={admin.is_owner ? 'default' : 'secondary'}>
                      {admin.is_owner ? 'Owner' : 'Admin'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAdminToDelete({ id: admin.id, userId: admin.user_id, email: admin.email });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Admin Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Administrador</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">Restaurante: {restaurantName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                O usuário será criado e terá acesso ao painel deste restaurante.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail de acesso</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurante.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anote a senha para enviar ao administrador
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="isOwner" className="font-medium">Proprietário</Label>
                <p className="text-xs text-muted-foreground">
                  Proprietários têm acesso total
                </p>
              </div>
              <input
                type="checkbox"
                id="isOwner"
                checked={isOwner}
                onChange={(e) => setIsOwner(e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Administrador
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá acesso ao painel do restaurante.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAdmin.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
