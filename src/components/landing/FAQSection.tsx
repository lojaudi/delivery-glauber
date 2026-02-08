import { useState, useEffect, useRef } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  primaryColor: string;
  faqs?: FAQItem[];
}

const defaultFAQs: FAQItem[] = [
  {
    id: '1',
    question: 'Quanto tempo leva para configurar o sistema?',
    answer: 'Em menos de 24 horas seu cardápio digital estará funcionando! Nossa equipe te ajuda a cadastrar os produtos e configurar tudo. É muito simples e rápido.',
  },
  {
    id: '2',
    question: 'Preciso ter conhecimento técnico?',
    answer: 'Não! O sistema foi feito para ser super intuitivo. Se você sabe usar WhatsApp, vai conseguir usar nosso sistema sem problemas. E qualquer dúvida, nosso suporte está disponível.',
  },
  {
    id: '3',
    question: 'Como meus clientes vão fazer pedidos?',
    answer: 'Eles acessam um link ou QR Code, escolhem os produtos no cardápio digital e finalizam o pedido. Você recebe tudo organizado no painel e pode enviar para a cozinha automaticamente.',
  },
  {
    id: '4',
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim! Não temos fidelidade. Você pode cancelar quando quiser, sem multas ou taxas adicionais. Acreditamos que você vai ficar porque vai gostar do serviço.',
  },
  {
    id: '5',
    question: 'O sistema funciona offline?',
    answer: 'O sistema precisa de internet para funcionar. Mas não se preocupe, funciona em qualquer conexão, até 3G. E se a internet cair momentaneamente, os pedidos ficam salvos.',
  },
  {
    id: '6',
    question: 'Aceita pagamento online?',
    answer: 'Sim! Integramos com as principais formas de pagamento: Pix, cartão de crédito e débito. Você também pode aceitar dinheiro na entrega, claro.',
  },
];

export function FAQSection({ primaryColor, faqs = defaultFAQs }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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

  const displayFAQs = faqs.length > 0 ? faqs : defaultFAQs;

  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
          >
            <HelpCircle className="h-5 w-5" style={{ color: `hsl(${primaryColor})` }} />
            <span className="font-medium" style={{ color: `hsl(${primaryColor})` }}>FAQ</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tire suas dúvidas sobre o sistema
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {displayFAQs.map((faq, index) => (
            <div
              key={faq.id}
              className={`mb-4 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left bg-background rounded-xl border border-border p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-foreground pr-8">{faq.question}</h3>
                  <ChevronDown 
                    className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    style={{ color: `hsl(${primaryColor})` }}
                  />
                </div>
                
                <div 
                  className={`grid transition-all duration-300 ${
                    openIndex === index ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
