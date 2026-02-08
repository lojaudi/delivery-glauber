import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useStoreConfig } from '@/hooks/useStore';

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall, isIOS, showIOSInstructions } = usePWAInstall();
  const { data: store } = useStoreConfig();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

  // Don't show if not installable and not iOS
  if (!isInstallable && !showIOSInstructions) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await promptInstall();
    }
  };

  const appName = store?.pwa_short_name || store?.pwa_name || store?.name || 'Cardápio';

  return (
    <>
      {/* Floating Install Button */}
      <div className="fixed bottom-24 right-4 z-40 animate-slide-up">
        <div className="relative">
          <Button
            onClick={handleInstallClick}
            size="lg"
            className="rounded-full shadow-lg pr-10 gap-2 bg-primary hover:bg-primary/90"
          >
            <Download className="h-5 w-5" />
            Instalar App
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center shadow-md"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Instalar {appName}</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para instalar o app no seu iPhone ou iPad:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">1. Toque em Compartilhar</p>
                    <p className="text-xs text-muted-foreground">
                      Na barra do Safari, toque no ícone de compartilhar
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">2. Adicionar à Tela de Início</p>
                    <p className="text-xs text-muted-foreground">
                      Role para baixo e toque em "Adicionar à Tela de Início"
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setShowIOSModal(false)}
                className="w-full"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
