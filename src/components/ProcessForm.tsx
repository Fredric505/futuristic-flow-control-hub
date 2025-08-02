import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SafeSelect from '@/components/SafeSelect';

interface ProcessFormProps {
  userType?: 'admin' | 'user';
}

const ProcessForm = ({ userType = 'user' }: ProcessFormProps) => {
  const [formData, setFormData] = useState({
    clientName: '',
    countryCode: '',
    phoneNumber: '',
    contactType: '',
    ownerName: '',
    iphoneModel: '',
    storage: '',
    color: '',
    imei: '',
    serialNumber: '',
    url: '',
    lostMode: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lista de códigos de país ordenada por número
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
    { code: '+254', country: 'Kenia' },
    { code: '+255', country: 'Tanzania' },
    { code: '+256', country: 'Uganda' },
    { code: '+263', country: 'Zimbabue' },
    { code: '+268', country: 'Suazilandia (Esuatini)' },
    { code: '+353', country: 'Irlanda' },
    { code: '+357', country: 'Chipre' },
    { code: '+501', country: 'Belice' },
    { code: '+502', country: 'Guatemala' },
    { code: '+503', country: 'El Salvador' },
    { code: '+504', country: 'Honduras' },
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
    { code: '+675', country: 'Papúa Nueva Guinea' }
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

  // Lista de colores limpia sin duplicados
  const colorOptions = [
    // Colores básicos
    'Negro', 'Blanco', 'Azul', 'Verde', 'Rosa', 'Amarillo', 'Púrpura', 'Rojo',
    // Colores específicos iPhone 16
    'Ultramarino', 'Verde azulado',
    // Colores Titanio
    'Titanio Natural', 'Titanio Azul', 'Titanio Blanco', 'Titanio Negro',
    // Colores especiales
    'Medianoche', 'Luz de estrella', 'Oro', 'Plata', 'Grafito',
    'Púrpura Intenso', 'Sierra Blue', 'Azul Pacífico', 'Verde Noche',
    'Gris Espacial', 'Oro Rosa'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      console.log('Enviando formulario de proceso...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTimeout(() => {
          toast({
            title: "Error de Autenticación",
            description: "Debes iniciar sesión para guardar un proceso",
            variant: "destructive",
          });
        }, 100);
        return;
      }
      console.log('Usuario autenticado, guardando proceso...');
      const { error } = await supabase
        .from('processes')
        .insert({
          user_id: session.user.id,
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
          status: 'guardado'
        });
      if (error) {
        console.error('Error al guardar proceso:', error);
        throw error;
      }
      console.log('Proceso guardado exitosamente');
      setTimeout(() => {
        toast({
          title: "Proceso guardado",
          description: "El proceso se ha guardado exitosamente",
        });
      }, 100);
      setTimeout(() => {
        setFormData({
          clientName: '',
          countryCode: '',
          phoneNumber: '',
          contactType: '',
          ownerName: '',
          iphoneModel: '',
          storage: '',
          color: '',
          imei: '',
          serialNumber: '',
          url: '',
          lostMode: false
        });
      }, 200);
    } catch (error: any) {
      console.error('Error completo al guardar proceso:', error);
      setTimeout(() => {
        toast({
          title: "Error",
          description: error.message || "Error al guardar el proceso. Intenta nuevamente.",
          variant: "destructive",
        });
      }, 100);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 300);
    }
  };

  // Mejorado manejo de select con useCallback
  const handleSelectChange = useCallback((field: string, value: string) => {
    console.log(`${field} seleccionado:`, value);
    setFormData(prev => ({...prev, [field]: value}));
  }, []);

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">
          {userType === 'admin' ? 'Agregar Proceso (Admin)' : 'Agregar Proceso'}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                placeholder={formData.contactType === 'propietario' ? 'Nombre del propietario del iPhone' : 'Nombre de la persona para quien es contacto de emergencia'}
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

            {/* Nuevo campo para modo perdido */}
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
              <p className="text-xs text-blue-200/60">
                Selecciona esta opción si el iPhone está en modo perdido para personalizar el mensaje
              </p>
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Proceso'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;