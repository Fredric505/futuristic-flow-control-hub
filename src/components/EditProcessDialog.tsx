
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SafeSelect from '@/components/SafeSelect';

interface Process {
  id: string;
  client_name: string;
  country_code: string;
  phone_number: string;
  contact_type: string;
  owner_name: string | null;
  iphone_model: string;
  storage: string;
  color: string;
  imei: string;
  serial_number: string;
  url: string | null;
  lost_mode?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface EditProcessDialogProps {
  process: Process | null;
  isOpen: boolean;
  onClose: () => void;
  onProcessUpdated: () => void;
}

const EditProcessDialog: React.FC<EditProcessDialogProps> = ({ 
  process, 
  isOpen, 
  onClose, 
  onProcessUpdated 
}) => {
  const [formData, setFormData] = useState({
    clientName: process?.client_name || '',
    countryCode: process?.country_code || '',
    phoneNumber: process?.phone_number || '',
    contactType: process?.contact_type || '',
    ownerName: process?.owner_name || '',
    iphoneModel: process?.iphone_model || '',
    storage: process?.storage || '',
    color: process?.color || '',
    imei: process?.imei || '',
    serialNumber: process?.serial_number || '',
    url: process?.url || '',
    lostMode: Boolean(process?.lost_mode)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (process && isOpen) {
      setFormData({
        clientName: process.client_name,
        countryCode: process.country_code,
        phoneNumber: process.phone_number,
        contactType: process.contact_type,
        ownerName: process.owner_name || '',
        iphoneModel: process.iphone_model,
        storage: process.storage,
        color: process.color,
        imei: process.imei,
        serialNumber: process.serial_number,
        url: process.url || '',
        lostMode: Boolean(process.lost_mode)
      });
    }
  }, [process, isOpen]);

  const countryCodes = [
    { code: '+1', country: 'Estados Unidos' },
    { code: '+34', country: 'España' },
    { code: '+44', country: 'Reino Unido' },
    { code: '+51', country: 'Perú' },
    { code: '+52', country: 'México' },
    { code: '+53', country: 'Cuba' },
    { code: '+54', country: 'Argentina' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+58', country: 'Venezuela' },
    { code: '+61', country: 'Australia' },
    { code: '+64', country: 'Nueva Zelanda' },
    { code: '+91', country: 'India' },
    { code: '+240', country: 'Guinea Ecuatorial' },
    { code: '+253', country: 'Yibuti' },
    { code: '+254', country: 'Kenia' },
    { code: '+255', country: 'Tanzania' },
    { code: '+256', country: 'Uganda' },
    { code: '+263', country: 'Zimbabue' },
    { code: '+268', country: 'Suazilandia (Esuatini)' },
    { code: '+353', country: 'Irlanda' },
    { code: '+357', country: 'Chipre' },
    { code: '+501', country: 'Belice' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+507', country: 'Panamá' },
    { code: '+591', country: 'Bolivia' },
    { code: '+592', country: 'Guyana' },
    { code: '+593', country: 'Ecuador' },
    { code: '+595', country: 'Paraguay' },
    { code: '+598', country: 'Uruguay' },
    { code: '+960', country: 'Maldivas' },
    { code: '+1787', country: 'Puerto Rico' },
    { code: '+1809', country: 'República Dominicana' },
    { code: '+675', country: 'Papúa Nueva Guinea' },
    { code: '+503', country: 'El Salvador' },
    { code: '+502', country: 'Guatemala' },
    { code: '+504', country: 'Honduras' },
    { code: '+505', country: 'Nicaragua' }
  ];

  const iphoneModels = [
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 mini', 'iPhone 13',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 mini', 'iPhone 12',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
    'iPhone 6s Plus', 'iPhone 6s', 'iPhone 6 Plus', 'iPhone 6',
    'iPhone SE (3ra gen)', 'iPhone SE (2da gen)', 'iPhone SE (1ra gen)'
  ];

  const storageOptions = [
    '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'
  ];

  const colorOptions = [
    'Negro', 'Blanco', 'Azul', 'Verde', 'Rosa', 'Amarillo', 'Púrpura', 'Rojo',
    'Ultramarino', 'Verde azulado',
    'Titanio Natural', 'Titanio Azul', 'Titanio Blanco', 'Titanio Negro',
    'Medianoche', 'Luz de estrella', 'Oro', 'Plata', 'Grafito',
    'Púrpura Intenso', 'Sierra Blue', 'Azul Pacífico', 'Verde Noche',
    'Gris Espacial', 'Oro Rosa'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!process || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('processes')
        .update({
          client_name: formData.clientName,
          country_code: formData.countryCode,
          phone_number: formData.phoneNumber,
          contact_type: formData.contactType,
          owner_name: formData.ownerName || null,
          iphone_model: formData.iphoneModel,
          storage: formData.storage,
          color: formData.color,
          imei: formData.imei,
          serial_number: formData.serialNumber,
          url: formData.url || null,
          lost_mode: formData.lostMode,
          updated_at: new Date().toISOString()
        })
        .eq('id', process.id);

      if (error) {
        console.error('Error updating process:', error);
        throw error;
      }

      toast({
        title: "Proceso actualizado",
        description: "El proceso se ha actualizado exitosamente",
      });

      onProcessUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating process:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el proceso",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  }, []);

  if (!process) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/90 border-blue-500/20">
        <DialogHeader>
          <DialogTitle className="text-blue-300">Editar Proceso</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-blue-200">Nombre del Cliente</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({...prev, clientName: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Código de País</Label>
              <SafeSelect 
                value={formData.countryCode} 
                onValueChange={(value) => handleSelectChange('countryCode', value)}
                placeholder="Selecciona código"
                disabled={isSubmitting}
                className="bg-white/5 border-blue-500/30 text-white"
              >
                {countryCodes.map((country) => (
                  <SelectItem 
                    key={country.code} 
                    value={country.code}
                    className="hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    {country.code} - {country.country}
                  </SelectItem>
                ))}
              </SafeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-blue-200">Número de Teléfono</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({...prev, phoneNumber: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Tipo de Contacto</Label>
              <SafeSelect 
                value={formData.contactType} 
                onValueChange={(value) => handleSelectChange('contactType', value)}
                placeholder="Selecciona tipo"
                disabled={isSubmitting}
                className="bg-white/5 border-blue-500/30 text-white"
              >
                <SelectItem value="propietario" className="hover:bg-blue-600/20 focus:bg-blue-600/20">Propietario</SelectItem>
                <SelectItem value="emergencia" className="hover:bg-blue-600/20 focus:bg-blue-600/20">Emergencia</SelectItem>
              </SafeSelect>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ownerName" className="text-blue-200">
                {formData.contactType === 'propietario' ? 'Nombre del Propietario (Opcional)' : 'Nombre del Contacto de Emergencia (Opcional)'}
              </Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({...prev, ownerName: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Modelo de iPhone</Label>
              <SafeSelect 
                value={formData.iphoneModel} 
                onValueChange={(value) => handleSelectChange('iphoneModel', value)}
                placeholder="Selecciona modelo"
                disabled={isSubmitting}
                className="bg-white/5 border-blue-500/30 text-white"
              >
                {iphoneModels.map((model) => (
                  <SelectItem 
                    key={model} 
                    value={model}
                    className="hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    {model}
                  </SelectItem>
                ))}
              </SafeSelect>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Almacenamiento</Label>
              <SafeSelect 
                value={formData.storage} 
                onValueChange={(value) => handleSelectChange('storage', value)}
                placeholder="Selecciona almacenamiento"
                disabled={isSubmitting}
                className="bg-white/5 border-blue-500/30 text-white"
              >
                {storageOptions.map((storage) => (
                  <SelectItem 
                    key={storage} 
                    value={storage}
                    className="hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    {storage}
                  </SelectItem>
                ))}
              </SafeSelect>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Color</Label>
              <SafeSelect 
                value={formData.color} 
                onValueChange={(value) => handleSelectChange('color', value)}
                placeholder="Selecciona color"
                disabled={isSubmitting}
                className="bg-white/5 border-blue-500/30 text-white"
              >
                {colorOptions.map((color) => (
                  <SelectItem 
                    key={color} 
                    value={color}
                    className="hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    {color}
                  </SelectItem>
                ))}
              </SafeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei" className="text-blue-200">IMEI</Label>
              <Input
                id="imei"
                value={formData.imei}
                onChange={(e) => setFormData(prev => ({...prev, imei: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-blue-200">Número de Serie</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({...prev, serialNumber: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-blue-200">URL (Opcional)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({...prev, url: e.target.value}))}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="https://ejemplo.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lostMode"
                  checked={formData.lostMode}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({...prev, lostMode: checked === true}))
                  }
                  disabled={isSubmitting}
                  className="border-blue-500/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="lostMode" className="text-blue-200">
                  iPhone en modo perdido
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
              className="border-blue-500/30 text-blue-300 hover:bg-blue-600/10"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {isSubmitting ? 'Actualizando...' : 'Actualizar Proceso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProcessDialog;
