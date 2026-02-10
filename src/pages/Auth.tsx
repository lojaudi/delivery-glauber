import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Eye, EyeOff, Loader2, Mail, Lock, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Confirmação de senha é obrigatória' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Determine base paths based on slug
  const menuPath = slug ? `/r/${slug}` : '/';
  const adminPath = slug ? `/r/${slug}/admin` : null;

  // Function to check roles and redirect accordingly
  const checkRolesAndRedirect = async (userId: string) => {
    try {
      // Check if user is a reseller
      const { data: resellerData, error: resellerError } = await supabase
        .from('resellers')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (resellerError) {
        console.error('Error checking reseller:', resellerError);
      }

      if (resellerData) {
        setIsLoading(false);
        navigate('/reseller');
        return;
      }

      // Check if user is a restaurant admin
      const { data: adminData, error: adminError } = await supabase
        .from('restaurant_admins')
        .select('restaurant_id, restaurants(slug)')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminError) {
        console.error('Error checking restaurant admin:', adminError);
      }

      if (adminData) {
        // Get the restaurant slug for this admin
        const restaurantSlug = (adminData.restaurants as any)?.slug;
        
        // If we're on a specific restaurant's auth page, redirect to that restaurant's admin
        if (slug) {
          setIsLoading(false);
          navigate(`/r/${slug}/admin`);
        } else if (restaurantSlug) {
          // Otherwise redirect to their restaurant's admin
          setIsLoading(false);
          navigate(`/r/${restaurantSlug}/admin`);
        } else {
          setIsLoading(false);
          toast({
            title: 'Erro',
            description: 'Restaurante não encontrado.',
            variant: 'destructive',
          });
        }
        return;
      }

      // Default: no access, show error
      setIsLoading(false);
      toast({
        title: 'Acesso negado',
        description: 'Sua conta não possui permissão para acessar o sistema.',
        variant: 'destructive',
      });
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsLoading(false);
      if (slug) {
        navigate(`/r/${slug}/admin`);
      }
    }
  };

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Se tem slug na URL, significa que o restaurante existe, vai direto pro login
      // Não precisa verificar se existe revendedor
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkRolesAndRedirect(session.user.id);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        // Use setTimeout to defer Supabase calls and prevent deadlock
        setTimeout(() => {
          checkRolesAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, slug]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailValidation = z.string().email().safeParse(formData.email);
      if (!emailValidation.success) {
        toast({
          title: 'Email inválido',
          description: 'Digite um email válido',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const redirectUrl = slug 
        ? `${window.location.origin}/r/${slug}/auth`
        : `${window.location.origin}/auth`;

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir a senha.',
        });
        setMode('login');
      }
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);

    try {
      const validation = signupSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: 'Dados inválidos',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast({
          title: 'Erro ao criar conta',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Send branded welcome email via Resend
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-auth-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            subject: 'Bem-vindo! Sua conta foi criada',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; text-align: center;">Bem-vindo! 🎉</h1>
                <p style="color: #555; font-size: 16px;">Sua conta foi criada com sucesso.</p>
                <p style="color: #555; font-size: 16px;">Agora você pode acessar o painel administrativo para gerenciar seu restaurante.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/auth" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 16px;">Acessar Painel</a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center;">Se você não criou esta conta, ignore este email.</p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }

      toast({
        title: 'Conta criada!',
        description: 'Sua conta foi criada com sucesso. Você já pode fazer login.',
      });
      setMode('login');
      setFormData({ email: formData.email, password: '', confirmPassword: '' });
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      return handleForgotPassword(e);
    }

    if (mode === 'signup') {
      return handleSignup();
    }

    setIsLoading(true);

    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: 'Dados inválidos',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Erro ao entrar',
            description: 'Email ou senha incorretos',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao entrar',
            description: error.message,
            variant: 'destructive',
          });
        }
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
      
      // Don't reset loading here - let the onAuthStateChange handle navigation
      // The loading will naturally end when the page navigates
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar no Painel';
      case 'signup': return 'Criar Conta';
      case 'forgot': return 'Recuperar Senha';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Acesse sua conta para gerenciar o sistema';
      case 'signup': return 'Preencha os dados para criar sua conta';
      case 'forgot': return 'Digite seu email para receber o link de recuperação';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'signup': return 'Criar Conta';
      case 'forgot': return 'Enviar Link';
    }
  };

  return (
    <>
      <Helmet>
        <title>{getTitle()} - Painel Admin</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-3xl shadow-card p-8">
            {(mode === 'forgot' || mode === 'signup') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormData({ email: formData.email, password: '', confirmPassword: '' });
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            )}

            <h1 className="text-2xl font-bold text-center text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              {getSubtitle()}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-muted/50 border-0 rounded-xl"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-0 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-0 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline text-sm"
                  >
                    Criar conta
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-primary hover:underline text-sm"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button
                type="submit"
                size="xl"
                className="w-full rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aguarde...
                  </>
                ) : (
                  getButtonText()
                )}
              </Button>
            </form>

            {mode === 'login' && (
              <p className="text-center text-muted-foreground text-xs mt-6">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                >
                  Crie uma agora
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="text-center text-muted-foreground text-xs mt-6">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                >
                  Faça login
                </button>
              </p>
            )}
          </div>

          {/* Back to menu */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate(menuPath)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Voltar ao cardápio
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
