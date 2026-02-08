import { Clock, ChefHat, Bike, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStatusTrackerProps {
  status: string;
}

const steps = [
  { 
    id: 'pending', 
    label: 'Aguardando', 
    description: 'Aguardando confirmação do restaurante',
    icon: Clock 
  },
  { 
    id: 'preparing', 
    label: 'Preparando', 
    description: 'Seu pedido está sendo preparado',
    icon: ChefHat 
  },
  { 
    id: 'delivery', 
    label: 'A Caminho', 
    description: 'Saiu para entrega',
    icon: Bike 
  },
  { 
    id: 'completed', 
    label: 'Entregue', 
    description: 'Pedido entregue com sucesso',
    icon: CheckCircle2 
  },
];

export function OrderStatusTracker({ status }: OrderStatusTrackerProps) {
  const currentIndex = steps.findIndex(s => s.id === status);
  const isCompleted = status === 'completed';

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = step.id === status;
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-start gap-4">
            {/* Icon and connector line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCurrent 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : isActive 
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 h-8 transition-all duration-300",
                    index < currentIndex 
                      ? "bg-primary" 
                      : "bg-muted"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 pb-4">
              <div className="flex items-center justify-between">
                <h4
                  className={cn(
                    "font-semibold",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </h4>
                {isCurrent && (
                  <span className="text-xs text-muted-foreground">agora</span>
                )}
              </div>
              <p
                className={cn(
                  "text-sm",
                  isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                )}
              >
                {step.description}
              </p>
              {isCurrent && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    isCompleted ? "bg-primary" : "bg-green-500 animate-pulse"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    isCompleted ? "text-primary" : "text-green-600"
                  )}>
                    {isCompleted ? 'Finalizado' : 'Em andamento'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
