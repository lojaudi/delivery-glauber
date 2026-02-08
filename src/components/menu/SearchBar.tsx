import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="sticky top-[88px] z-30 bg-background px-4 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar no cardápio..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border-border bg-card pl-10 pr-4 shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
        />
      </div>
    </div>
  );
}
