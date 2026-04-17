import { useState, useEffect, useMemo } from 'react';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface WeightSelectorProps {
  pricePerKg: number;
  /** Weight in grams */
  value: number;
  onChange: (grams: number) => void;
}

const QUICK_WEIGHTS = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatWeight = (g: number) => {
  if (g >= 1000) return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 2).replace('.', ',')}kg`;
  return `${g}g`;
};

export function WeightSelector({ pricePerKg, value, onChange }: WeightSelectorProps) {
  const [manualInput, setManualInput] = useState<string>('');

  useEffect(() => {
    if (value > 0) setManualInput(String(value));
  }, [value]);

  const total = useMemo(() => {
    return Math.round((value / 1000) * pricePerKg * 100) / 100;
  }, [value, pricePerKg]);

  const handleManualChange = (raw: string) => {
    setManualInput(raw);
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      // Round down to nearest 50g
      const rounded = Math.round(num / 50) * 50;
      onChange(rounded);
    } else {
      onChange(0);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">Selecione o peso</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatCurrency(pricePerKg)}/kg
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {QUICK_WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            className={cn(
              'px-2 py-2 rounded-lg border text-sm font-medium transition-all',
              value === w
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary hover:bg-primary/5'
            )}
          >
            {formatWeight(w)}
          </button>
        ))}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Peso personalizado (gramas, múltiplos de 50)</Label>
        <Input
          type="number"
          inputMode="numeric"
          step={50}
          min={0}
          placeholder="Ex: 350"
          value={manualInput}
          onChange={(e) => handleManualChange(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">
          {value > 0 ? formatWeight(value) : '—'}
        </span>
        <span className="text-lg font-bold text-primary">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
