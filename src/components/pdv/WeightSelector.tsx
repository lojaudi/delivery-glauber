import { useState, useEffect, useMemo } from 'react';
import { Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface WeightSelectorProps {
  pricePerKg: number;
  /** Weight in grams */
  value: number;
  onChange: (grams: number) => void;
}

const QUICK_WEIGHTS = [100, 200, 300, 500, 1000];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatWeight = (g: number) => {
  if (g >= 1000) {
    const kg = g / 1000;
    return `${kg.toFixed(kg % 1 === 0 ? 0 : 3).replace('.', ',')}kg`;
  }
  return `${g}g`;
};

export function WeightSelector({ pricePerKg, value, onChange }: WeightSelectorProps) {
  const [manualInput, setManualInput] = useState<string>('');

  useEffect(() => {
    if (value > 0 && manualInput === '') {
      setManualInput(String(value));
    }
    if (value === 0) {
      setManualInput('');
    }
  }, [value]);

  const total = useMemo(() => {
    return Math.round((value / 1000) * pricePerKg * 100) / 100;
  }, [value, pricePerKg]);

  const handleManualChange = (raw: string) => {
    // Allow only digits — free input in grams
    const cleaned = raw.replace(/\D/g, '');
    setManualInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    } else {
      onChange(0);
    }
  };

  const handleQuickSelect = (g: number) => {
    setManualInput(String(g));
    onChange(g);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">Informe o peso</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatCurrency(pricePerKg)}/kg
        </span>
      </div>

      <div>
        <Label htmlFor="weight-input" className="text-xs text-muted-foreground">
          Peso em gramas (livre)
        </Label>
        <Input
          id="weight-input"
          type="text"
          inputMode="numeric"
          autoFocus
          placeholder="Ex: 327"
          value={manualInput}
          onChange={(e) => handleManualChange(e.target.value)}
          className="mt-1 text-lg font-semibold h-12"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Digite qualquer valor em gramas. O preço é calculado automaticamente.
        </p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Atalhos rápidos</Label>
        <div className="grid grid-cols-5 gap-2 mt-1">
          {QUICK_WEIGHTS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => handleQuickSelect(w)}
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
