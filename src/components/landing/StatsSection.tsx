import { useEffect, useRef, useState } from 'react';
import { Users, ShoppingBag, Award, Headphones } from 'lucide-react';

interface StatsSectionProps {
  primaryColor: string;
  stats?: {
    restaurants?: number;
    orders?: number;
    satisfaction?: number;
    support?: string;
  };
}

function AnimatedNumber({ target, suffix = '', prefix = '', duration = 2000 }: { target: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
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
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

export function StatsSection({ primaryColor, stats }: StatsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
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

  const defaultStats = [
    {
      icon: Users,
      value: stats?.restaurants || 500,
      suffix: '+',
      label: 'Restaurantes Ativos',
      description: 'Confiam em nossa plataforma',
    },
    {
      icon: ShoppingBag,
      value: stats?.orders || 100000,
      suffix: '+',
      label: 'Pedidos Processados',
      description: 'Todos os meses',
    },
    {
      icon: Award,
      value: stats?.satisfaction || 99,
      suffix: '%',
      label: 'Taxa de Satisfação',
      description: 'Avaliação dos clientes',
    },
    {
      icon: Headphones,
      value: 24,
      suffix: '/7',
      label: 'Suporte Disponível',
      description: 'Sempre prontos para ajudar',
    },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(${primaryColor}) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Números que Impressionam
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de estabelecimentos que já transformaram suas vendas
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {defaultStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`group relative bg-background rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Hover glow */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
                />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
                  >
                    <Icon 
                      className="h-7 w-7 transition-colors" 
                      style={{ color: `hsl(${primaryColor})` }}
                    />
                  </div>

                  {/* Value */}
                  <div 
                    className="text-4xl font-bold mb-1"
                    style={{ color: `hsl(${primaryColor})` }}
                  >
                    <AnimatedNumber 
                      target={stat.value} 
                      suffix={stat.suffix}
                      duration={2000 + index * 300}
                    />
                  </div>

                  {/* Label */}
                  <h3 className="font-semibold text-foreground mb-1">{stat.label}</h3>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
