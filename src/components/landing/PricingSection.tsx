import { Check, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description?: string;
  monthly_fee: number;
  setup_fee?: number;
  trial_days: number;
  features: string[];
  is_popular?: boolean;
  is_active: boolean;
}

interface PricingSectionProps {
  primaryColor: string;
  plans: Plan[];
  onSelectPlan: (plan: Plan) => void;
}

export function PricingSection({ primaryColor, plans, onSelectPlan }: PricingSectionProps) {
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

  const activePlans = plans.filter(p => p.is_active);

  return (
    <section ref={ref} id="pricing" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
          >
            <Sparkles className="h-5 w-5" style={{ color: `hsl(${primaryColor})` }} />
            <span className="font-medium" style={{ color: `hsl(${primaryColor})` }}>Planos</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sem taxas por pedido. Mensalidade fixa. Cancele quando quiser.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {activePlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative group transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Popular badge */}
              {plan.is_popular && (
                <div 
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-lg z-10 flex items-center gap-1.5"
                  style={{ backgroundColor: `hsl(${primaryColor})` }}
                >
                  <Star className="h-4 w-4 fill-current" />
                  Mais Popular
                </div>
              )}

              <div 
                className={`h-full bg-background rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.is_popular 
                    ? 'scale-105 shadow-lg' 
                    : 'hover:-translate-y-2'
                }`}
                style={{ 
                  borderColor: plan.is_popular ? `hsl(${primaryColor})` : 'hsl(var(--border))'
                }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-medium text-muted-foreground">R$</span>
                    <span 
                      className="text-5xl font-bold"
                      style={{ color: plan.is_popular ? `hsl(${primaryColor})` : undefined }}
                    >
                      {plan.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  {plan.setup_fee && plan.setup_fee > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      + R$ {plan.setup_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de setup
                    </p>
                  )}
                  {plan.trial_days > 0 && (
                    <p 
                      className="text-sm font-medium mt-2"
                      style={{ color: `hsl(${primaryColor})` }}
                    >
                      {plan.trial_days} dias grátis para testar
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
                      >
                        <Check 
                          className="h-3 w-3" 
                          style={{ color: `hsl(${primaryColor})` }}
                        />
                      </div>
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full py-6 text-base font-semibold rounded-xl transition-all hover:scale-105"
                  style={plan.is_popular ? {
                    backgroundColor: `hsl(${primaryColor})`,
                  } : undefined}
                  variant={plan.is_popular ? 'default' : 'outline'}
                  onClick={() => onSelectPlan(plan)}
                >
                  {plan.trial_days > 0 ? 'Começar Teste Grátis' : 'Contratar Agora'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-green-500/10 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Garantia de 7 dias ou seu dinheiro de volta</span>
          </div>
        </div>
      </div>
    </section>
  );
}
