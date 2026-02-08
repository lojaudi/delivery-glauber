import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Star, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  primaryColor: string;
  whatsappLink: string;
  onCtaClick: () => void;
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

export function HeroSection({ title, subtitle, primaryColor, whatsappLink, onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `linear-gradient(135deg, hsl(${primaryColor}) 0%, hsl(${primaryColor} / 0.3) 50%, transparent 100%)`,
        }}
      />
      
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ backgroundColor: `hsl(${primaryColor})` }}
        />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ backgroundColor: `hsl(${primaryColor})`, animationDelay: '1s' }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm font-medium" style={{ color: `hsl(${primaryColor})` }}>
                <Star className="h-4 w-4 fill-current" />
                <span>4.9/5 avaliação</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>0% de taxas</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {title}
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl">
              {subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
                onClick={onCtaClick}
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 rounded-xl hover:scale-105 transition-all"
                onClick={() => window.open(whatsappLink, '_blank')}
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: `hsl(${primaryColor})` }}>
                  <AnimatedCounter target={500} suffix="+" />
                </div>
                <p className="text-sm text-muted-foreground">Restaurantes</p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: `hsl(${primaryColor})` }}>
                  <AnimatedCounter target={50} prefix="R$" suffix="M+" />
                </div>
                <p className="text-sm text-muted-foreground">Em Vendas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: `hsl(${primaryColor})` }}>
                  <AnimatedCounter target={99} suffix="%" />
                </div>
                <p className="text-sm text-muted-foreground">Satisfação</p>
              </div>
            </div>
          </div>

          {/* Right Content - Phone Mockups */}
          <div className="relative hidden lg:flex justify-center items-center">
            <div className="relative">
              {/* Main Phone */}
              <div className="relative z-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-2 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                <div className="bg-background rounded-[2.5rem] overflow-hidden w-72 h-[580px]">
                  {/* Phone Screen Content */}
                  <div className="h-full flex flex-col">
                    {/* Status Bar */}
                    <div className="h-12 flex items-center justify-center bg-muted/50 rounded-t-[2.5rem]">
                      <div className="w-24 h-6 bg-gray-900 rounded-full" />
                    </div>
                    
                    {/* App Content */}
                    <div className="flex-1 p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full" style={{ backgroundColor: `hsl(${primaryColor} / 0.2)` }} />
                        <div>
                          <div className="h-4 w-32 rounded bg-foreground/20" />
                          <div className="h-3 w-20 rounded bg-muted-foreground/20 mt-1" />
                        </div>
                      </div>
                      
                      {/* Categories */}
                      <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i} 
                            className="h-8 px-4 rounded-full flex items-center justify-center text-xs font-medium"
                            style={{ 
                              backgroundColor: i === 1 ? `hsl(${primaryColor})` : 'hsl(var(--muted))',
                              color: i === 1 ? 'white' : 'inherit'
                            }}
                          >
                            {['Lanches', 'Pizzas', 'Bebidas'][i - 1]}
                          </div>
                        ))}
                      </div>
                      
                      {/* Products */}
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-200 to-orange-300" />
                            <div className="flex-1">
                              <div className="h-4 w-24 rounded bg-foreground/20" />
                              <div className="h-3 w-16 rounded bg-muted-foreground/20 mt-1" />
                              <div className="h-5 w-16 rounded mt-2" style={{ backgroundColor: `hsl(${primaryColor} / 0.2)` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Bottom Nav */}
                    <div className="h-16 border-t border-border flex items-center justify-around px-6">
                      {[ShoppingBag, Users].map((Icon, i) => (
                        <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Phone */}
              <div className="absolute -right-16 top-20 z-10 bg-gradient-to-br from-gray-800 to-gray-700 rounded-[2.5rem] p-2 shadow-xl transform rotate-6 scale-75 opacity-60">
                <div className="bg-background rounded-[2rem] overflow-hidden w-56 h-[400px]">
                  <div className="h-full bg-gradient-to-br from-muted to-muted/50" />
                </div>
              </div>

              {/* Floating Elements */}
              <div 
                className="absolute -left-8 top-16 z-30 p-4 rounded-2xl shadow-lg animate-bounce bg-background"
                style={{ animationDuration: '3s' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(${primaryColor})` }}>
                    <ShoppingBag className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Novo Pedido!</p>
                    <p className="text-xs text-muted-foreground">R$ 87,90</p>
                  </div>
                </div>
              </div>

              <div 
                className="absolute -right-4 bottom-32 z-30 p-4 rounded-2xl shadow-lg animate-bounce bg-background"
                style={{ animationDuration: '4s', animationDelay: '1s' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-background" />
                    ))}
                  </div>
                  <p className="text-xs font-medium">+12 hoje</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
