import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import CustomSelect, { CustomSelectItem } from './CustomSelect';
import { getAllCountries } from '@/utils/countries';

const ProcessForm: React.FC = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    countryCode: '',
    phoneNumber: '',
    contactType: 'propietario',
    ownerName: '',
    iphoneModel: '',
    storage: '',
    color: '',
    imei: '',
    serialNumber: '',
    url: '',
    lostMode: false
  });
  const [loading, setLoading] = useState(false);

  const iphoneModels = [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 mini', 'iPhone 13',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 mini', 'iPhone 12',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
    'iPhone 6s Plus', 'iPhone 6s', 'iPhone 6 Plus', 'iPhone 6',
    'iPhone SE (3ra generación)', 'iPhone SE (2da generación)', 'iPhone SE (1ra generación)'
  ];

  const storageOptions = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const colorOptions = [
    'Titanio Natural', 'Titanio Azul', 'Titanio Blanco', 'Titanio Negro',
    'Rosa', 'Amarillo', 'Verde', 'Azul', 'Morado', 'Blanco', 'Negro',
    'Rojo', 'Oro', 'Plata', 'Gris Espacial', 'Verde Noche', 'Azul Pacífico',
    'Medianoche', 'Luz de las Estrellas', 'Rosa Alpino', 'Azul Sierra'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.countryCode || !formData.phoneNumber || 
        !formData.iphoneModel || !formData.storage || !formData.color || 
        !formData.imei || !formData.serialNumber) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const processData = {
        user_id: user.id,
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
        lost_mode: formData.lostMode
      };

      const { error } = await supabase
        .from('processes')
        .insert(processData);

      if (error) {
        console.error('Error saving process:', error);
        throw error;
      }

      toast({
        title: "Proceso guardado",
        description: "El proceso ha sido guardado exitosamente",
      });

      // Reset form
      setFormData({
        clientName: '',
        countryCode: '',
        phoneNumber: '',
        contactType: 'propietario',
        ownerName: '',
        iphoneModel: '',
        storage: '',
        color: '',
        imei: '',
        serialNumber: '',
        url: '',
        lostMode: false
      });

    } catch (error: any) {
      console.error('Error saving process:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar proceso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allCountries = getAllCountries();
  const combinedCountries = [...allCountries.spanish, ...allCountries.english].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Agregar Nuevo Proceso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-blue-200">Nombre del Cliente *</Label>
              <Input
                id="clientName"
                type="text"
                placeholder="Nombre completo del cliente"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryCode" className="text-blue-200">País y Código *</Label>
              <CustomSelect
                value={formData.countryCode}
                onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                placeholder="Selecciona país"
                className="bg-black/30 border-blue-500/30 text-blue-100"
              >
                {combinedCountries.map((country) => (
                  <CustomSelectItem 
                    key={`${country.code}-${country.name}`} 
                    value={country.code}
                    className="text-blue-100 hover:bg-blue-600/20"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                      <span>{country.name}</span>
                    </div>
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-blue-200">Número de Teléfono *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Ej: 1234567890"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactType" className="text-blue-200">Tipo de Contacto *</Label>
              <CustomSelect
                value={formData.contactType}
                onValueChange={(value) => setFormData({ ...formData, contactType: value })}
                placeholder="Selecciona tipo"
                className="bg-black/30 border-blue-500/30 text-blue-100"
              >
                <CustomSelectItem value="propietario" className="text-blue-100 hover:bg-blue-600/20">
                  Propietario
                </CustomSelectItem>
                <CustomSelectItem value="contacto_emergencia" className="text-blue-100 hover:bg-blue-600/20">
                  Contacto de Emergencia
                </CustomSelectItem>
              </CustomSelect>
            </div>

            {formData.contactType === 'contacto_emergencia' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ownerName" className="text-blue-200">Nombre del Propietario</Label>
                <Input
                  id="ownerName"
                  type="text"
                  placeholder="Nombre del propietario del dispositivo"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="iphoneModel" className="text-blue-200">Modelo de iPhone *</Label>
              <CustomSelect
                value={formData.iphoneModel}
                onValueChange={(value) => setFormData({ ...formData, iphoneModel: value })}
                placeholder="Selecciona modelo"
                className="bg-black/30 border-blue-500/30 text-blue-100"
              >
                {iphoneModels.map((model) => (
                  <CustomSelectItem 
                    key={model} 
                    value={model}
                    className="text-blue-100 hover:bg-blue-600/20"
                  >
                    {model}
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage" className="text-blue-200">Almacenamiento *</Label>
              <CustomSelect
                value={formData.storage}
                onValueChange={(value) => setFormData({ ...formData, storage: value })}
                placeholder="Selecciona almacenamiento"
                className="bg-black/30 border-blue-500/30 text-blue-100"
              >
                {storageOptions.map((storage) => (
                  <CustomSelectItem 
                    key={storage} 
                    value={storage}
                    className="text-blue-100 hover:bg-blue-600/20"
                  >
                    {storage}
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="text-blue-200">Color *</Label>
              <CustomSelect
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
                placeholder="Selecciona color"
                className="bg-black/30 border-blue-500/30 text-blue-100"
              >
                {colorOptions.map((color) => (
                  <CustomSelectItem 
                    key={color} 
                    value={color}
                    className="text-blue-100 hover:bg-blue-600/20"
                  >
                    {color}
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei" className="text-blue-200">IMEI *</Label>
              <Input
                id="imei"
                type="text"
                placeholder="Número IMEI del dispositivo"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-blue-200">Número de Serie *</Label>
              <Input
                id="serialNumber"
                type="text"
                placeholder="Número de serie del dispositivo"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="url" className="text-blue-200">URL de Ubicación (Opcional)</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-black/30 border-blue-500/30 text-blue-100 placeholder-blue-300/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 text-blue-200">
                <input
                  type="checkbox"
                  checked={formData.lostMode}
                  onChange={(e) => setFormData({ ...formData, lostMode: e.target.checked })}
                  className="rounded border-blue-500/30 bg-black/30 text-blue-500 focus:ring-blue-500/30"
                />
                <span>El dispositivo está en modo perdido</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Proceso'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
