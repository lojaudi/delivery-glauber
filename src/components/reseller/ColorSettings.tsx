import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Reseller } from '@/types/reseller';

interface ColorSettingsProps {
  reseller: Reseller & { primary_color?: string; secondary_color?: string };
  onUpdate: () => void;
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length !== 6) return { h: 0, s: 100, l: 50 };
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Parse HSL string to components
function parseHsl(hsl: string): { h: number; s: number; l: number } {
  const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
  }
  return { h: 45, s: 100, l: 51 };
}

interface ColorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, description, value, onChange }: ColorPickerProps) {
  const hsl = parseHsl(value);
  const [hexValue, setHexValue] = useState(hslToHex(hsl.h, hsl.s, hsl.l));

  useEffect(() => {
    const newHsl = parseHsl(value);
    setHexValue(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  }, [value]);

  const handleColorChange = (hex: string) => {
    setHexValue(hex);
    const { h, s, l } = hexToHsl(hex);
    onChange(`${h} ${s}% ${l}%`);
  };

  const handleHexInput = (hex: string) => {
    setHexValue(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const { h, s, l } = hexToHsl(hex);
      onChange(`${h} ${s}% ${l}%`);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Native color picker */}
        <div className="relative">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-border overflow-hidden"
            style={{ padding: 0 }}
          />
        </div>
        
        {/* Hex input */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground">Código Hex</Label>
          <Input
            value={hexValue}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#000000"
            className="font-mono uppercase"
          />
        </div>
      </div>
    </div>
  );
}

export function ColorSettings({ reseller, onUpdate }: ColorSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    primary_color: reseller.primary_color || '45 100% 51%',
    secondary_color: reseller.secondary_color || '142 76% 49%',
  });

  useEffect(() => {
    setFormData({
      primary_color: reseller.primary_color || '45 100% 51%',
      secondary_color: reseller.secondary_color || '142 76% 49%',
    });
  }, [reseller]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1) Save reseller colors
      const { error } = await supabase
        .from('resellers')
        .update({
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
        })
        .eq('id', reseller.id);

      if (error) throw error;

      // 2) Propagate to all restaurants' store_config (so it applies to cardápio/admin)
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('reseller_id', reseller.id);

      if (restaurantsError) throw restaurantsError;

      const restaurantIds = (restaurants || []).map((r) => r.id);
      if (restaurantIds.length > 0) {
        const { error: storeConfigError } = await supabase
          .from('store_config')
          .update({
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
          })
          .in('restaurant_id', restaurantIds);

        if (storeConfigError) throw storeConfigError;
      }

      // Refresh cached data across the app
      queryClient.invalidateQueries({ queryKey: ['current-reseller'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['store-config'] });

      // Apply colors immediately to the DOM
      const root = document.documentElement;
      root.style.setProperty('--primary', formData.primary_color);
      root.style.setProperty('--ring', formData.primary_color);
      root.style.setProperty('--sidebar-ring', formData.primary_color);
      root.style.setProperty('--secondary', formData.secondary_color);
      root.style.setProperty('--whatsapp', formData.secondary_color);

      toast({ title: 'Cores atualizadas com sucesso!' });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const primaryHsl = parseHsl(formData.primary_color);
  const secondaryHsl = parseHsl(formData.secondary_color);
  const primaryHex = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);
  const secondaryHex = hslToHex(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Cores do Sistema
          </CardTitle>
          <CardDescription>
            Defina as cores que serão aplicadas ao painel de revendedor e a todos os restaurantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <ColorPicker
              label="Cor Principal"
              description="Botões, destaques e elementos principais"
              value={formData.primary_color}
              onChange={(value) => setFormData({ ...formData, primary_color: value })}
            />
            <ColorPicker
              label="Cor Secundária"
              description="Status de sucesso e elementos secundários"
              value={formData.secondary_color}
              onChange={(value) => setFormData({ ...formData, secondary_color: value })}
            />
          </div>

          {/* Live Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Preview em Tempo Real</Label>
            <div className="p-4 rounded-lg border bg-background space-y-4">
              {/* Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Botões</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: primaryHex }}
                  >
                    Botão Primário
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: secondaryHex }}
                  >
                    Botão Secundário
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors"
                    style={{ 
                      borderColor: primaryHex,
                      color: primaryHex
                    }}
                  >
                    Outline
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Badges</p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: primaryHex }}
                  >
                    Em Teste
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: secondaryHex }}
                  >
                    Aberto
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive text-white"
                  >
                    Fechado
                  </span>
                </div>
              </div>

              {/* Header Preview */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Header do Cardápio</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <div 
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: primaryHex }}
                  >
                    🍔
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Burger House</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: secondaryHex }}
                      >
                        Aberto
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Entrega • 30-45 min</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Cores'
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
