import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCustomerAddresses, CustomerAddress } from '@/hooks/useCustomerAddresses';
import { MapPin, Plus, Star, Trash2, Loader2 } from 'lucide-react';

interface AddressSelectorProps {
  phone: string;
  selectedAddress: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  onAddressChange: (address: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  }) => void;
}

export function AddressSelector({ phone, selectedAddress, onAddressChange }: AddressSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewAddressOpen, setIsNewAddressOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    reference: '',
  });

  const { addresses, isLoading, createAddress, deleteAddress, setDefaultAddress } = useCustomerAddresses(phone);

  const handleSelectAddress = (address: CustomerAddress) => {
    onAddressChange({
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      complement: address.complement || undefined,
      reference: address.reference || undefined,
    });
    setIsDialogOpen(false);
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood) return;

    await createAddress.mutateAsync({
      customer_phone: phone,
      label: newAddress.label || 'Meu Endereço',
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: newAddress.neighborhood,
      complement: newAddress.complement || null,
      reference: newAddress.reference || null,
      is_default: false,
    });

    // Apply the new address
    onAddressChange({
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: newAddress.neighborhood,
      complement: newAddress.complement || undefined,
      reference: newAddress.reference || undefined,
    });

    setNewAddress({ label: '', street: '', number: '', neighborhood: '', complement: '', reference: '' });
    setIsNewAddressOpen(false);
    setIsDialogOpen(false);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAddress.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    await deleteAddress.mutateAsync(id);
  };

  if (!phone || phone.length < 14) {
    return null;
  }

  return (
    <>
      {addresses.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="mb-3"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Meus Endereços ({addresses.length})
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Endereço</DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <Card 
                  key={address.id} 
                  className={`cursor-pointer transition-colors hover:border-primary ${
                    selectedAddress.street === address.street && 
                    selectedAddress.number === address.number 
                      ? 'border-primary bg-primary/5' 
                      : ''
                  }`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {address.street}, {address.number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.neighborhood}
                        </p>
                        {address.complement && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {address.complement}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {!address.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefault(address.id);
                            }}
                          >
                            <Star className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(address.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsNewAddressOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Endereço
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewAddressOpen} onOpenChange={setIsNewAddressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Endereço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Nome do endereço</Label>
              <Input
                id="label"
                placeholder="Ex: Casa, Trabalho"
                value={newAddress.label}
                onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="street">Rua / Avenida</Label>
              <Input
                id="street"
                placeholder="Nome da rua"
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  placeholder="123"
                  value={newAddress.number}
                  onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Seu bairro"
                  value={newAddress.neighborhood}
                  onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="complement">Complemento (opcional)</Label>
              <Input
                id="complement"
                placeholder="Apto, bloco, etc."
                value={newAddress.complement}
                onChange={(e) => setNewAddress({ ...newAddress, complement: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reference">Referência (opcional)</Label>
              <Input
                id="reference"
                placeholder="Próximo ao..."
                value={newAddress.reference}
                onChange={(e) => setNewAddress({ ...newAddress, reference: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={handleSaveNewAddress}
              disabled={!newAddress.street || !newAddress.number || !newAddress.neighborhood || createAddress.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createAddress.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Endereço
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
