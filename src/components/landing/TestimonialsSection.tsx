import { Star, Quote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Testimonial {
  id: string;
  name: string;
  business: string;
  photo?: string;
  text: string;
  rating: number;
}

interface TestimonialsSectionProps {
  primaryColor: string;
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    business: 'Hamburgueria do Carlos',
    text: 'Economizei mais de R$ 5.000 por mês só em taxas! O sistema é muito fácil de usar e meus clientes adoram.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Maria Santos',
    business: 'Pizzaria Bella Napoli',
    text: 'Finalmente tenho controle total dos meus pedidos. O painel da cozinha organizou completamente nossa operação.',
    rating: 5,
  },
  {
    id: '3',
    name: 'João Oliveira',
    business: 'Restaurante Sabor Caseiro',
    text: 'A gestão de mesas é perfeita! Consigo acompanhar tudo em tempo real. Recomendo demais!',
    rating: 5,
  },
  {
    id: '4',
    name: 'Ana Costa',
    business: 'Doceria da Ana',
    text: 'Meus clientes pedem direto pelo WhatsApp agora. Aumentei minhas vendas em 40% no primeiro mês!',
    rating: 5,
  },
];

export function TestimonialsSection({ primaryColor, testimonials = defaultTestimonials }: TestimonialsSectionProps) {
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

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Histórias reais de quem transformou seu negócio com nossa plataforma
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {displayTestimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`group relative bg-background rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Quote icon */}
              <div 
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
              >
                <Quote className="h-5 w-5 text-white" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/80 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ 
                    backgroundColor: testimonial.photo 
                      ? 'transparent' 
                      : `hsl(${primaryColor})`,
                    backgroundImage: testimonial.photo ? `url(${testimonial.photo})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!testimonial.photo && testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
