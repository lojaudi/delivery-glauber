import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Delete, CheckCircle } from 'lucide-react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  maxLength?: number;
  error?: string;
}

export function PinPad({ onSubmit, isLoading, maxLength = 6, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < maxLength) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto space-y-6">
      {/* PIN Display */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < pin.length 
                ? 'bg-primary scale-110' 
                : 'bg-muted border-2 border-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-center text-sm text-destructive font-medium">
          {error}
        </p>
      )}

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Button
            key={digit}
            variant="outline"
            size="lg"
            className="h-16 text-2xl font-semibold hover:bg-primary/10 active:scale-95 transition-transform"
            onClick={() => handleDigit(digit)}
            disabled={isLoading}
          >
            {digit}
          </Button>
        ))}
        
        {/* Clear */}
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
          disabled={isLoading || pin.length === 0}
        >
          C
        </Button>
        
        {/* Zero */}
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-2xl font-semibold hover:bg-primary/10 active:scale-95 transition-transform"
          onClick={() => handleDigit('0')}
          disabled={isLoading}
        >
          0
        </Button>
        
        {/* Delete */}
        <Button
          variant="outline"
          size="lg"
          className="h-16 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
          disabled={isLoading || pin.length === 0}
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>

      {/* Submit Button */}
      <Button
        className="w-full h-14 text-lg font-semibold"
        onClick={handleSubmit}
        disabled={isLoading || pin.length < 4}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verificando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Entrar
          </span>
        )}
      </Button>
    </div>
  );
}
