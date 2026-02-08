import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  LayoutDashboard, 
  Store, 
  CreditCard, 
  Settings,
  LogOut,
  Loader2,
  Menu,
  X,
  Building2,
  TrendingUp,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentReseller, useIsReseller } from '@/hooks/useReseller';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ResellerLayoutProps {
  children: ReactNode;
  title?: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/reseller' },
  { id: 'restaurants', label: 'Restaurantes', icon: Store, path: '/reseller/restaurants' },
  { id: 'subscriptions', label: 'Mensalidades', icon: CreditCard, path: '/reseller/subscriptions' },
  { id: 'reports', label: 'Relatórios', icon: TrendingUp, path: '/reseller/reports' },
  { id: 'settings', label: 'Configurações', icon: Settings, path: '/reseller/settings' },
  { id: 'guide', label: 'Guia Mercado Pago', icon: BookOpen, path: '/reseller/guia-mercadopago' },
  { id: 'docs', label: 'Documentação', icon: BookOpen, path: '/docs' },
];

export function ResellerLayout({ children, title }: ResellerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: isReseller, isLoading: resellerLoading } = useIsReseller();
  const { data: reseller } = useCurrentReseller();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply dynamic theme (reseller colors)
  useTheme();

  const isLoading = authLoading || resellerLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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

  if (!isReseller) {
    return (
      <>
        <Helmet>
          <title>Acesso negado - Painel Revendedor</title>
        </Helmet>

        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Acesso negado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua conta não tem permissão de revendedor. Entre em contato com o suporte para se tornar um revendedor.
              </p>

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleSignOut}>
                  Sair
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Voltar ao início
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
        <title>{title || 'Painel Revendedor'}</title>
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
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">
                    {reseller?.company_name || reseller?.name || 'Revendedor'}
                  </p>
                  <p className="text-xs text-muted-foreground">Painel Revendedor</p>
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
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
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
                  </button>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {reseller?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {reseller?.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Revendedor</p>
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
            <h1 className="font-bold text-foreground truncate">{title || 'Painel Revendedor'}</h1>
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
