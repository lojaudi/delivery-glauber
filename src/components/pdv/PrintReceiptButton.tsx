import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Printer, Copy, Loader2, Settings2 } from 'lucide-react';
import { printReceipt, generatePrintableText, printReceiptBrowser, PrintOrderData } from '@/utils/thermalPrinter';
import { useStoreConfig } from '@/hooks/useStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface PrintReceiptButtonProps {
  orderData: PrintOrderData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showOptions?: boolean;
}

export function PrintReceiptButton({ 
  orderData, 
  variant = 'outline', 
  size = 'default', 
  className,
  showOptions = false 
}: PrintReceiptButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { data: storeConfig } = useStoreConfig();

  // Enrich order data with store info
  const enrichedOrderData: PrintOrderData = {
    ...orderData,
    storeInfo: {
      name: storeConfig?.name || '',
      logoUrl: storeConfig?.logo_url,
      address: storeConfig?.address,
      phone: storeConfig?.phone_whatsapp,
    },
  };

  const isSerialAvailable = () => {
    try {
      // Check if we're in an iframe (like Lovable preview)
      if (window.self !== window.top) {
        return false;
      }
      return 'serial' in navigator;
    } catch {
      return false;
    }
  };

  const handlePrintThermal = async () => {
    if (!isSerialAvailable()) {
      toast({
        title: 'Impressora térmica não disponível',
        description: 'Use a impressão via navegador ou conecte via USB.',
        variant: 'destructive',
      });
      return;
    }

    setIsPrinting(true);
    try {
      await printReceipt(enrichedOrderData);
      toast({ title: 'Comanda impressa com sucesso!' });
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: 'Erro na impressão',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintBrowser = () => {
    try {
      printReceiptBrowser(enrichedOrderData);
      toast({ title: 'Enviando para impressão...' });
    } catch (error: any) {
      toast({
        title: 'Erro ao imprimir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePrint = async () => {
    // If Serial API is not available, go directly to browser print
    if (!isSerialAvailable()) {
      handlePrintBrowser();
      return;
    }

    setIsPrinting(true);
    try {
      await printReceipt(enrichedOrderData);
      toast({ title: 'Comanda impressa com sucesso!' });
    } catch (error: any) {
      console.error('Print error:', error);
      // If Web Serial failed for any reason, show preview
      setShowPreview(true);
      toast({
        title: 'Impressão via USB não disponível',
        description: 'Use a visualização para copiar ou imprimir.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopy = () => {
    const text = generatePrintableText(enrichedOrderData);
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  // Show dropdown with options
  if (showOptions) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={isPrinting}
              className={className}
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {size !== 'icon' && <span className="ml-2">Imprimir</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Opções de Impressão</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrintBrowser}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir (Navegador)
            </DropdownMenuItem>
            {isSerialAvailable() && (
              <DropdownMenuItem onClick={handlePrintThermal}>
                <Settings2 className="w-4 h-4 mr-2" />
                Impressora Térmica (USB)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowPreview(true)}>
              <Copy className="w-4 h-4 mr-2" />
              Visualizar / Copiar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Visualização da Comanda</DialogTitle>
              <DialogDescription>
                Copie o texto ou use a impressão do navegador.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-auto max-h-96 whitespace-pre">
              {generatePrintableText(enrichedOrderData)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
              <Button onClick={handlePrintBrowser} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Simple button (default behavior)
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={isPrinting}
        className={className}
      >
        {isPrinting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        {size !== 'icon' && <span className="ml-2">Imprimir</span>}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visualização da Comanda</DialogTitle>
            <DialogDescription>
              Copie o texto ou use a impressão do navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-auto max-h-96 whitespace-pre">
            {generatePrintableText(enrichedOrderData)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handlePrintBrowser} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
