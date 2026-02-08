import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ChefHat, 
  Settings, 
  ShoppingBag, 
  Tag, 
  Clock, 
  Ticket, 
  LogOut,
  Loader2,
  Menu,
  X,
  Store,
  LayoutDashboard,
  Users,
  ClipboardList,
  PlusCircle,
  ExternalLink,
  Eye,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

// Function to generate nav groups with dynamic paths
const getNavGroups = (basePath: string, menuPath: string) => [
  {
    label: 'Operações',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: basePath },
      { id: 'pdv', label: 'PDV', icon: Store, path: `${basePath}/pdv` },
      { id: 'kitchen', label: 'Cozinha', icon: ChefHat, path: `${menuPath}/kitchen`, external: true },
      { id: 'waiters', label: 'Garçons', icon: Users, path: `${basePath}/waiters` },
      { id: 'waiter-access', label: 'Acesso Garçons', icon: Users, path: `${menuPath}/waiter`, external: true },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { id: 'orders', label: 'Pedidos', icon: ClipboardList, path: `${basePath}/orders` },
      { id: 'products', label: 'Produtos', icon: ShoppingBag, path: `${basePath}/products` },
      { id: 'categories', label: 'Categorias', icon: Tag, path: `${basePath}/categories` },
      { id: 'addons', label: 'Acréscimos', icon: PlusCircle, path: `${basePath}/addons` },
      { id: 'coupons', label: 'Cupons', icon: Ticket, path: `${basePath}/coupons` },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'delivery-zones', label: 'Taxas de Entrega', icon: MapPin, path: `${basePath}/delivery-zones` },
      { id: 'hours', label: 'Horários', icon: Clock, path: `${basePath}/hours` },
      { id: 'settings', label: 'Configurações', icon: Settings, path: `${basePath}/settings` },
    ]
  },
  {
    label: 'Visualizar',
    items: [
      { id: 'menu', label: 'Ver Cardápio', icon: Eye, path: menuPath, external: true },
    ]
  }
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading, isAdmin, refreshRole, signOut } = useAuth();
  const { toast } = useToast();
  const { data: store } = useStoreConfig();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine base paths based on slug
  const basePath = slug ? `/r/${slug}/admin` : '/admin';
  const menuPath = slug ? `/r/${slug}` : '/';
  const authPath = slug ? `/r/${slug}/auth` : '/auth';
  
  // Generate nav groups with correct paths
  const navGroups = getNavGroups(basePath, menuPath);

  // Apply dynamic theme based on store colors
  useTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(authPath);
    }
  }, [user, isLoading, navigate, authPath]);


  const handleSignOut = async () => {
    await signOut();
    navigate(authPath);
  };

  // Check if current path matches item path (considering both exact and prefix match for dashboard)
  const isActivePath = (itemPath: string) => {
    if (itemPath === basePath) {
      // Dashboard: exact match only
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(itemPath);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <>
        <Helmet>
          <title>Acesso negado - {store?.name || 'Admin'}</title>
        </Helmet>

        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Acesso negado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua conta ainda não tem permissão de administrador. Se você acabou de receber a permissão,
                atualize abaixo.
              </p>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={async () => {
                    await refreshRole();
                    toast({
                      title: 'Permissões atualizadas',
                      description: 'Se você for admin, o painel vai liberar automaticamente.',
                    });
                  }}
                >
                  Atualizar permissões
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  Sair e entrar novamente
                </Button>
                <Button variant="ghost" onClick={() => navigate(menuPath)}>
                  Voltar ao cardápio
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{title || 'Admin'} - {store?.name || 'Delivery'}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
                  {store?.logo_url ? (
                    <img 
                      src={store.logo_url} 
                      alt={`Logo ${store?.name || 'Admin'}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🍔</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{store?.name || 'Admin'}</p>
                  <Badge variant={store?.is_open ? 'open' : 'closed'} className="text-xs">
                    {store?.is_open ? 'Aberto' : 'Fechado'}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = isActivePath(item.path);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.external) {
                              window.open(item.path, '_blank');
                            } else {
                              navigate(item.path);
                            }
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.external && <ExternalLink className="h-3.5 w-3.5 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 flex items-center gap-3 bg-card px-4 py-3 border-b border-border lg:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-foreground truncate">{title || 'Admin'}</h1>
          </header>

          {/* Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}