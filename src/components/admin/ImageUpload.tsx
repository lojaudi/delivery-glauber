import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  bucket: 'product-images' | 'store-assets';
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

export function ImageUpload({ 
  bucket, 
  currentUrl, 
  onUpload, 
  onRemove,
  className 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync previewUrl with currentUrl prop changes
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onUpload(publicUrl);

      toast({
        title: 'Imagem enviada!',
        description: 'A imagem foi carregada com sucesso',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-40 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full h-40 rounded-xl border-2 border-dashed border-border",
            "flex flex-col items-center justify-center gap-2",
            "bg-muted/30 hover:bg-muted/50 transition-colors",
            "text-muted-foreground"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">Clique para enviar imagem</span>
              <span className="text-xs">PNG, JPG até 5MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
