import { AlertTriangle, XCircle, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { useRestaurantBySlug } from '@/hooks/useRestaurant';

export default function RestaurantSuspended() {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant } = useRestaurantBySlug(slug);

  const isCancelled = restaurant?.subscription_status === 'cancelled';
  const Icon = isCancelled ? XCircle : AlertTriangle;
  const title = isCancelled ? 'Estabelecimento Encerrado' : 'Estabelecimento Temporariamente Indisponível';
  const description = isCancelled 
    ? 'Este estabelecimento encerrou suas atividades na plataforma.'
    : 'Este cardápio está temporariamente fora do ar devido a pendências no pagamento.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isCancelled ? 'bg-muted' : 'bg-destructive/10'
          }`}>
            <Icon className={`h-8 w-8 ${isCancelled ? 'text-muted-foreground' : 'text-destructive'}`} />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCancelled && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Se você é o proprietário, entre em contato com o suporte para regularizar sua situação.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Contato
                </Button>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Suporte
                </Button>
              </div>
            </div>
          )}
          <Button variant="ghost" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
