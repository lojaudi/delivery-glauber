import { useState, useEffect } from 'react';
import { Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length !== 6) return { h: 0, s: 100, l: 50 };
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

function parseHsl(hsl: string): { h: number; s: number; l: number } {
  const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (match) return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
  return { h: 45, s: 100, l: 51 };
}

interface ColorPickerFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPickerField({ label, description, value, onChange }: ColorPickerFieldProps) {
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
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border overflow-hidden p-0"
        />
        <div className="flex-1">
          <Input
            value={hexValue}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#000000"
            className="font-mono uppercase text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export function StoreColorSettings() {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [colors, setColors] = useState({
    primary_color: '45 100% 51%',
    secondary_color: '142 76% 49%',
    accent_color: '200 80% 50%',
  });

  useEffect(() => {
    if (store) {
      setColors({
        primary_color: store.primary_color || '45 100% 51%',
        secondary_color: store.secondary_color || '142 76% 49%',
        accent_color: store.accent_color || '200 80% 50%',
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    setSaving(true);
    try {
      await updateStore.mutateAsync({
        id: store.id,
        primary_color: colors.primary_color,
        secondary_color: colors.secondary_color,
        accent_color: colors.accent_color,
      });
      // Apply immediately
      const root = document.documentElement;
      root.style.setProperty('--primary', colors.primary_color);
      root.style.setProperty('--secondary', colors.secondary_color);
      root.style.setProperty('--accent', colors.accent_color);
      toast({ title: 'Cores salvas com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !store) return null;

  const primaryHsl = parseHsl(colors.primary_color);
  const secondaryHsl = parseHsl(colors.secondary_color);
  const primaryHex = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);
  const secondaryHex = hslToHex(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l);

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-6">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Cores do Sistema e Catálogo
        </h3>
        <p className="text-xs text-muted-foreground">
          Personalize as cores do painel administrativo e do catálogo digital do seu estabelecimento.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <ColorPickerField
            label="Cor Principal"
            description="Botões, destaques e elementos principais"
            value={colors.primary_color}
            onChange={(v) => setColors({ ...colors, primary_color: v })}
          />
          <ColorPickerField
            label="Cor Secundária"
            description="Status de sucesso e elementos complementares"
            value={colors.secondary_color}
            onChange={(v) => setColors({ ...colors, secondary_color: v })}
          />
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preview</Label>
          <div className="p-4 rounded-lg border bg-background space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: primaryHex }}
              >
                Botão Primário
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: secondaryHex }}
              >
                Botão Secundário
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium border-2"
                style={{ borderColor: primaryHex, color: primaryHex }}
              >
                Outline
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: primaryHex }}>
                Destaque
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: secondaryHex }}>
                Aberto
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryHex }}
              >
                {store.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{store.name || 'Meu Estabelecimento'}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: secondaryHex }}>
                    Aberto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Preview do cabeçalho do catálogo</p>
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
      </div>
    </form>
  );
}
