
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
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
    iphoneModel: '',
    storage: '',
    color: '',
    imei: '',
    serialNumber: '',
    url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solo países de habla hispana
  const countryCodes = [
    { code: '+54', country: 'Argentina' },
    { code: '+591', country: 'Bolivia' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+53', country: 'Cuba' },
    { code: '+593', country: 'Ecuador' },
    { code: '+503', country: 'El Salvador' },
    { code: '+34', country: 'España' },
    { code: '+502', country: 'Guatemala' },
    { code: '+240', country: 'Guinea Ecuatorial' },
    { code: '+504', country: 'Honduras' },
    { code: '+52', country: 'México' },
    { code: '+505', country: 'Nicaragua' },
    { code: '+507', country: 'Panamá' },
    { code: '+595', country: 'Paraguay' },
    { code: '+51', country: 'Perú' },
    { code: '+1787', country: 'Puerto Rico' },
    { code: '+1809', country: 'República Dominicana' },
    { code: '+598', country: 'Uruguay' },
    { code: '+58', country: 'Venezuela' }
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
    // iPhone 16 series
    'Ultramarino', 'Verde azulado', 'Rosa', 'Blanco', 'Negro',
    // iPhone 15 series
    'Titanio Natural', 'Titanio Azul', 'Titanio Blanco', 'Titanio Negro',
    'Rosa', 'Amarillo', 'Verde', 'Azul', 'Negro',
    // iPhone 14 series
    'Púrpura Intenso', 'Oro', 'Plata', 'Grafito',
    'Púrpura', 'Azul', 'Medianoche', 'Luz de estrella', 'PRODUCT(RED)',
    // iPhone 13 series
    'Sierra Blue', 'Grafito', 'Oro', 'Plata',
    'Rosa', 'Azul', 'Medianoche', 'Luz de estrella', 'PRODUCT(RED)',
    // iPhone 12 series
    'Azul Pacífico', 'Grafito', 'Oro', 'Plata',
    'Púrpura', 'Azul', 'Verde', 'Negro', 'Blanco', 'PRODUCT(RED)',
    // iPhone 11 series
    'Verde Noche', 'Oro', 'Gris Espacial', 'Plata',
    'Púrpura', 'Amarillo', 'Verde', 'Negro', 'Blanco', 'PRODUCT(RED)',
    // Otros modelos
    'Gris Espacial', 'Plata', 'Oro Rosa'
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
          iphone_model: formData.iphoneModel,
          storage: formData.storage,
          color: formData.color,
          imei: formData.imei,
          serial_number: formData.serialNumber,
          url: formData.url || null,
          status: 'guardado'
        });

      if (error) {
        console.error('Error al guardar proceso:', error);
        throw error;
      }

      console.log('Proceso guardado exitosamente');

      // Usar setTimeout para evitar conflictos de DOM
      setTimeout(() => {
        toast({
          title: "Proceso guardado",
          description: "El proceso se ha guardado exitosamente",
        });
      }, 100);

      // Reset form después de un breve delay
      setTimeout(() => {
        setFormData({
          clientName: '',
          countryCode: '',
          phoneNumber: '',
          contactType: '',
          iphoneModel: '',
          storage: '',
          color: '',
          imei: '',
          serialNumber: '',
          url: ''
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
      // Delay para evitar conflictos de estado
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
