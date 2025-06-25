
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProcessFormProps {
  userType: string;
}

const ProcessForm = ({ userType }: ProcessFormProps) => {
  const [formData, setFormData] = useState({
    clientName: '',
    countryCode: '+506',
    phoneNumber: '',
    contactType: 'propietario',
    iphoneModel: '',
    storage: '',
    color: '',
    imei: '',
    serialNumber: '',
    url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "Debes estar autenticado para guardar procesos",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('processes')
        .insert({
          user_id: user.id,
          client_name: formData.clientName,
          country_code: formData.countryCode,
          phone_number: formData.phoneNumber,
          contact_type: formData.contactType,
          iphone_model: formData.iphoneModel,
          storage: formData.storage,
          color: formData.color,
          imei: formData.imei,
          serial_number: formData.serialNumber,
          url: formData.url
        });

      if (error) throw error;

      toast({
        title: "Proceso guardado",
        description: "El proceso se ha guardado exitosamente",
      });

      // Reset form
      setFormData({
        clientName: '',
        countryCode: '+506',
        phoneNumber: '',
        contactType: 'propietario',
        iphoneModel: '',
        storage: '',
        color: '',
        imei: '',
        serialNumber: '',
        url: ''
      });

    } catch (error) {
      console.error('Error saving process:', error);
      toast({
        title: "Error",
        description: "Error al guardar el proceso",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Agregar Nuevo Proceso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-blue-200">Nombre del Cliente</Label>
              <Input
                id="clientName"
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-blue-200">Número de Teléfono</Label>
              <div className="flex space-x-2">
                <Select value={formData.countryCode} onValueChange={(value) => setFormData({...formData, countryCode: value})}>
                  <SelectTrigger className="w-24 bg-white/5 border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+506">+506</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+52">+52</SelectItem>
                    <SelectItem value="+34">+34</SelectItem>
                    <SelectItem value="+57">+57</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="flex-1 bg-white/5 border-blue-500/30 text-white"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactType" className="text-blue-200">Tipo de Contacto</Label>
              <Select value={formData.contactType} onValueChange={(value) => setFormData({...formData, contactType: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="propietario">Propietario</SelectItem>
                  <SelectItem value="emergencia">Contacto de Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iphoneModel" className="text-blue-200">Modelo de iPhone</Label>
              <Select value={formData.iphoneModel} onValueChange={(value) => setFormData({...formData, iphoneModel: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iPhone 16 Pro Max">iPhone 16 Pro Max</SelectItem>
                  <SelectItem value="iPhone 16 Pro">iPhone 16 Pro</SelectItem>
                  <SelectItem value="iPhone 16 Plus">iPhone 16 Plus</SelectItem>
                  <SelectItem value="iPhone 16">iPhone 16</SelectItem>
                  <SelectItem value="iPhone 15 Pro Max">iPhone 15 Pro Max</SelectItem>
                  <SelectItem value="iPhone 15 Pro">iPhone 15 Pro</SelectItem>
                  <SelectItem value="iPhone 15 Plus">iPhone 15 Plus</SelectItem>
                  <SelectItem value="iPhone 15">iPhone 15</SelectItem>
                  <SelectItem value="iPhone 14 Pro Max">iPhone 14 Pro Max</SelectItem>
                  <SelectItem value="iPhone 14 Pro">iPhone 14 Pro</SelectItem>
                  <SelectItem value="iPhone 14 Plus">iPhone 14 Plus</SelectItem>
                  <SelectItem value="iPhone 14">iPhone 14</SelectItem>
                  <SelectItem value="iPhone 13 Pro Max">iPhone 13 Pro Max</SelectItem>
                  <SelectItem value="iPhone 13 Pro">iPhone 13 Pro</SelectItem>
                  <SelectItem value="iPhone 13">iPhone 13</SelectItem>
                  <SelectItem value="iPhone 12 Pro Max">iPhone 12 Pro Max</SelectItem>
                  <SelectItem value="iPhone 12 Pro">iPhone 12 Pro</SelectItem>
                  <SelectItem value="iPhone 12">iPhone 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage" className="text-blue-200">Almacenamiento</Label>
              <Select value={formData.storage} onValueChange={(value) => setFormData({...formData, storage: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona almacenamiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128GB">128GB</SelectItem>
                  <SelectItem value="256GB">256GB</SelectItem>
                  <SelectItem value="512GB">512GB</SelectItem>
                  <SelectItem value="1TB">1TB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color" className="text-blue-200">Color</Label>
              <Input
                id="color"
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ej: Azul Natural, Blanco, Negro"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imei" className="text-blue-200">IMEI</Label>
              <Input
                id="imei"
                type="text"
                value={formData.imei}
                onChange={(e) => setFormData({...formData, imei: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="15 dígitos"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serialNumber" className="text-blue-200">Número de Serie</Label>
              <Input
                id="serialNumber"
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ej: F2LMQDQFQ6L7"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url" className="text-blue-200">URL (Opcional)</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="https://ejemplo.com"
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            Guardar Proceso
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
