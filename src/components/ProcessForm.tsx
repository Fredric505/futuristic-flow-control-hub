
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CustomSelect, { CustomSelectItem } from './CustomSelect';
import { countries } from '@/utils/countries';

interface ProcessFormProps {
  userType?: string;
}

const ProcessForm: React.FC<ProcessFormProps> = ({ userType }) => {
  const [formData, setFormData] = useState({
    client_name: '',
    country_code: '',
    phone_number: '',
    contact_type: 'propietario',
    owner_name: '',
    iphone_model: '',
    storage: '',
    color: '',
    imei: '',
    serial_number: '',
    url: '',
    lost_mode: false
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name || !formData.country_code || !formData.phone_number || 
        !formData.iphone_model || !formData.storage || !formData.color || 
        !formData.imei || !formData.serial_number) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting process form:', formData);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('processes')
        .insert({
          client_name: formData.client_name,
          country_code: formData.country_code,
          phone_number: formData.phone_number,
          contact_type: formData.contact_type,
          owner_name: formData.owner_name || null,
          iphone_model: formData.iphone_model,
          storage: formData.storage,
          color: formData.color,
          imei: formData.imei,
          serial_number: formData.serial_number,
          url: formData.url || null,
          lost_mode: formData.lost_mode,
          status: 'pendiente',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating process:', error);
        throw error;
      }

      console.log('Process created successfully:', data);
      
      toast({
        title: "Proceso guardado",
        description: "El proceso ha sido guardado exitosamente y está listo para enviar",
      });

      // Reset form
      setFormData({
        client_name: '',
        country_code: '',
        phone_number: '',
        contact_type: 'propietario',
        owner_name: '',
        iphone_model: '',
        storage: '',
        color: '',
        imei: '',
        serial_number: '',
        url: '',
        lost_mode: false
      });

    } catch (error: any) {
      console.error('Error submitting process:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar proceso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Agregar Nuevo Proceso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="text-blue-200">Nombre del Cliente *</Label>
              <Input
                id="client_name"
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el nombre del cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code" className="text-blue-200">País *</Label>
              <CustomSelect
                value={formData.country_code}
                onValueChange={(value) => handleInputChange('country_code', value)}
                placeholder="Selecciona un país"
                className="bg-white/5 border-blue-500/30 text-white"
              >
                {countries.map((country) => (
                  <CustomSelectItem key={`${country.code}-${country.name}`} value={country.code}>
                    <div className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                      <span className="text-muted-foreground">({country.code})</span>
                      <span className="text-xs">
                        {country.language === 'en' ? '🇺🇸' : '🇪🇸'}
                      </span>
                    </div>
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-blue-200">Número de Teléfono *</Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Solo números sin código de país"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_type" className="text-blue-200">Tipo de Contacto *</Label>
              <CustomSelect
                value={formData.contact_type}
                onValueChange={(value) => handleInputChange('contact_type', value)}
                placeholder="Selecciona el tipo"
                className="bg-white/5 border-blue-500/30 text-white"
              >
                <CustomSelectItem value="propietario">Propietario</CustomSelectItem>
                <CustomSelectItem value="emergencia">Contacto de Emergencia</CustomSelectItem>
              </CustomSelect>
            </div>
          </div>

          {formData.contact_type === 'emergencia' && (
            <div className="space-y-2">
              <Label htmlFor="owner_name" className="text-blue-200">Nombre del Propietario</Label>
              <Input
                id="owner_name"
                type="text"
                value={formData.owner_name}
                onChange={(e) => handleInputChange('owner_name', e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Nombre del propietario del iPhone"
              />
            </div>
          )}

          {/* Información del Dispositivo */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-blue-300">Información del iPhone</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iphone_model" className="text-blue-200">Modelo *</Label>
                <CustomSelect
                  value={formData.iphone_model}
                  onValueChange={(value) => handleInputChange('iphone_model', value)}
                  placeholder="Selecciona el modelo"
                  className="bg-white/5 border-blue-500/30 text-white"
                >
                  <CustomSelectItem value="iPhone 15 Pro Max">iPhone 15 Pro Max</CustomSelectItem>
                  <CustomSelectItem value="iPhone 15 Pro">iPhone 15 Pro</CustomSelectItem>
                  <CustomSelectItem value="iPhone 15 Plus">iPhone 15 Plus</CustomSelectItem>
                  <CustomSelectItem value="iPhone 15">iPhone 15</CustomSelectItem>
                  <CustomSelectItem value="iPhone 14 Pro Max">iPhone 14 Pro Max</CustomSelectItem>
                  <CustomSelectItem value="iPhone 14 Pro">iPhone 14 Pro</CustomSelectItem>
                  <CustomSelectItem value="iPhone 14 Plus">iPhone 14 Plus</CustomSelectItem>
                  <CustomSelectItem value="iPhone 14">iPhone 14</CustomSelectItem>
                  <CustomSelectItem value="iPhone 13 Pro Max">iPhone 13 Pro Max</CustomSelectItem>
                  <CustomSelectItem value="iPhone 13 Pro">iPhone 13 Pro</CustomSelectItem>
                  <CustomSelectItem value="iPhone 13 mini">iPhone 13 mini</CustomSelectItem>
                  <CustomSelectItem value="iPhone 13">iPhone 13</CustomSelectItem>
                  <CustomSelectItem value="iPhone 12 Pro Max">iPhone 12 Pro Max</CustomSelectItem>
                  <CustomSelectItem value="iPhone 12 Pro">iPhone 12 Pro</CustomSelectItem>
                  <CustomSelectItem value="iPhone 12 mini">iPhone 12 mini</CustomSelectItem>
                  <CustomSelectItem value="iPhone 12">iPhone 12</CustomSelectItem>
                </CustomSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage" className="text-blue-200">Almacenamiento *</Label>
                <CustomSelect
                  value={formData.storage}
                  onValueChange={(value) => handleInputChange('storage', value)}
                  placeholder="Selecciona almacenamiento"
                  className="bg-white/5 border-blue-500/30 text-white"
                >
                  <CustomSelectItem value="128GB">128GB</CustomSelectItem>
                  <CustomSelectItem value="256GB">256GB</CustomSelectItem>
                  <CustomSelectItem value="512GB">512GB</CustomSelectItem>
                  <CustomSelectItem value="1TB">1TB</CustomSelectItem>
                </CustomSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-blue-200">Color *</Label>
                <CustomSelect
                  value={formData.color}
                  onValueChange={(value) => handleInputChange('color', value)}
                  placeholder="Selecciona color"
                  className="bg-white/5 border-blue-500/30 text-white"
                >
                  <CustomSelectItem value="Negro">Negro</CustomSelectItem>
                  <CustomSelectItem value="Blanco">Blanco</CustomSelectItem>
                  <CustomSelectItem value="Azul">Azul</CustomSelectItem>
                  <CustomSelectItem value="Rosa">Rosa</CustomSelectItem>
                  <CustomSelectItem value="Amarillo">Amarillo</CustomSelectItem>
                  <CustomSelectItem value="Verde">Verde</CustomSelectItem>
                  <CustomSelectItem value="Morado">Morado</CustomSelectItem>
                  <CustomSelectItem value="Rojo">Rojo</CustomSelectItem>
                  <CustomSelectItem value="Titanio Natural">Titanio Natural</CustomSelectItem>
                  <CustomSelectItem value="Titanio Azul">Titanio Azul</CustomSelectItem>
                  <CustomSelectItem value="Titanio Blanco">Titanio Blanco</CustomSelectItem>
                  <CustomSelectItem value="Titanio Negro">Titanio Negro</CustomSelectItem>
                </CustomSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imei" className="text-blue-200">IMEI *</Label>
                <Input
                  id="imei"
                  type="text"
                  value={formData.imei}
                  onChange={(e) => handleInputChange('imei', e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Ingresa el IMEI"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number" className="text-blue-200">Número de Serie *</Label>
                <Input
                  id="serial_number"
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => handleInputChange('serial_number', e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Ingresa el número de serie"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-blue-200">URL de Ubicación (Opcional)</Label>
              <Textarea
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa la URL de ubicación si está disponible"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="lost_mode"
                type="checkbox"
                checked={formData.lost_mode}
                onChange={(e) => handleInputChange('lost_mode', e.target.checked)}
                className="rounded border-blue-500/30"
              />
              <Label htmlFor="lost_mode" className="text-blue-200">iPhone en modo perdido</Label>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Proceso'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
