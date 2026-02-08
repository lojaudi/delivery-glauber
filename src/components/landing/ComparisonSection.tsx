import { Check, X, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ComparisonSectionProps {
  primaryColor: string;
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

export function ComparisonSection({ primaryColor }: ComparisonSectionProps) {
  const { ref, isInView } = useInView();

  const ifoodFeatures = [
    { text: 'Taxa de 27% por pedido', bad: true },
    { text: 'Mensalidade a partir de R$100', bad: true },
    { text: 'Cliente é do iFood', bad: true },
    { text: 'Concorrência direta no app', bad: true },
    { text: 'Sem controle de preços', bad: true },
    { text: 'Cancelamentos sem justificativa', bad: true },
  ];

  const ourFeatures = [
    { text: '0% de taxa por pedido', bad: false },
    { text: 'Mensalidade fixa acessível', bad: false },
    { text: 'Cliente é seu', bad: false },
    { text: 'Sua marca em destaque', bad: false },
    { text: 'Total controle de preços', bad: false },
    { text: 'Gestão completa de pedidos', bad: false },
  ];

  // Cálculo de economia
  const pedidosMes = 500;
  const ticketMedio = 45;
  const taxaIfood = 0.27;
  const faturamento = pedidosMes * ticketMedio;
  const custoIfood = faturamento * taxaIfood;
  const nossoPlano = 99.90;
  const economia = custoIfood - nossoPlano;

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Por que trocar o iFood?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Veja a diferença entre pagar taxas absurdas e ter seu próprio sistema
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* iFood Column */}
          <div className={`relative transition-all duration-700 delay-100 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 border-2 border-red-200 dark:border-red-900 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Marketplaces</h3>
                  <p className="text-sm text-muted-foreground">iFood, Rappi, etc.</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                {ifoodFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-foreground/80">{feature.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 p-4 rounded-xl bg-red-100 dark:bg-red-900/30">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Custo mensal estimado*</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  R$ {custoIfood.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  *Com {pedidosMes} pedidos de R$ {ticketMedio} (média)
                </p>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className={`flex items-center justify-center transition-all duration-700 delay-200 ${isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-background border-4 border-border flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-muted-foreground">VS</span>
              </div>
              <div 
                className="absolute -inset-4 rounded-full opacity-20 blur-xl animate-pulse"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
              />
            </div>
          </div>

          {/* Our System Column */}
          <div className={`relative transition-all duration-700 delay-300 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div 
              className="rounded-2xl p-6 border-2 h-full"
              style={{ 
                backgroundColor: `hsl(${primaryColor} / 0.05)`,
                borderColor: `hsl(${primaryColor} / 0.3)`
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${primaryColor})` }}
                >
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: `hsl(${primaryColor})` }}>Nosso Sistema</h3>
                  <p className="text-sm text-muted-foreground">Cardápio Digital Próprio</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                {ourFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `hsl(${primaryColor} / 0.2)` }}
                    >
                      <Check className="h-4 w-4" style={{ color: `hsl(${primaryColor})` }} />
                    </div>
                    <span className="text-foreground/80">{feature.text}</span>
                  </li>
                ))}
              </ul>

              <div 
                className="mt-6 p-4 rounded-xl"
                style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
              >
                <p className="text-sm font-medium" style={{ color: `hsl(${primaryColor})` }}>Custo mensal</p>
                <p className="text-2xl font-bold" style={{ color: `hsl(${primaryColor})` }}>
                  R$ {nossoPlano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Plano profissional completo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Banner */}
        <div className={`mt-12 max-w-3xl mx-auto transition-all duration-700 delay-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div 
            className="rounded-2xl p-8 text-center text-white relative overflow-hidden"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
            <div className="relative z-10">
              <p className="text-lg opacity-90 mb-2">Economia mensal de até</p>
              <p className="text-5xl md:text-6xl font-bold mb-2">
                R$ {economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm opacity-75">
                Baseado em {pedidosMes} pedidos/mês com ticket médio de R$ {ticketMedio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
