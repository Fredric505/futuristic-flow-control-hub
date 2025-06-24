
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const ProcessForm = () => {
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

  const spanishCountries = [
    { code: '+34', name: 'España' },
    { code: '+54', name: 'Argentina' },
    { code: '+591', name: 'Bolivia' },
    { code: '+56', name: 'Chile' },
    { code: '+57', name: 'Colombia' },
    { code: '+506', name: 'Costa Rica' },
    { code: '+53', name: 'Cuba' },
    { code: '+593', name: 'Ecuador' },
    { code: '+503', name: 'El Salvador' },
    { code: '+240', name: 'Guinea Ecuatorial' },
    { code: '+502', name: 'Guatemala' },
    { code: '+504', name: 'Honduras' },
    { code: '+52', name: 'México' },
    { code: '+505', name: 'Nicaragua' },
    { code: '+507', name: 'Panamá' },
    { code: '+595', name: 'Paraguay' },
    { code: '+51', name: 'Perú' },
    { code: '+1-787', name: 'Puerto Rico' },
    { code: '+1-809', name: 'República Dominicana' },
    { code: '+598', name: 'Uruguay' },
    { code: '+58', name: 'Venezuela' }
  ];

  const iphoneModels = [
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
    'iPhone SE (1ra Gen)', 'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XR',
    'iPhone XS', 'iPhone XS Max', 'iPhone 11', 'iPhone 11 Pro',
    'iPhone 11 Pro Max', 'iPhone SE (2da Gen)', 'iPhone 12 mini',
    'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone SE (3ra Gen)', 'iPhone 14', 'iPhone 14 Plus',
    'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15',
    'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max'
  ];

  const storageOptions = [
    '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'
  ];

  const colorOptions = [
    'Space Gray', 'Silver', 'Gold', 'Rose Gold', 'Red',
    'Blue', 'Coral', 'Yellow', 'White', 'Black', 'Green',
    'Purple', 'Pink', 'Starlight', 'Midnight', 'Sierra Blue',
    'Alpine Green', 'Deep Purple', 'Dynamic Island', 'Natural Titanium',
    'Blue Titanium', 'White Titanium', 'Black Titanium'
  ];

  const contactTypes = ['Propietario', 'Contacto de Emergencia'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!formData.clientName || !formData.countryCode || !formData.phoneNumber || 
        !formData.contactType || !formData.iphoneModel || !formData.storage || 
        !formData.color || !formData.imei || !formData.serialNumber) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    // Guardar proceso
    const processData = {
      ...formData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'guardado'
    };

    // Simular guardado
    const existingProcesses = JSON.parse(localStorage.getItem('processes') || '[]');
    existingProcesses.push(processData);
    localStorage.setItem('processes', JSON.stringify(existingProcesses));

    toast({
      title: "Proceso guardado",
      description: "El proceso ha sido guardado exitosamente",
    });

    // Limpiar formulario
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
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Agregar Nuevo Proceso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-blue-200">Nombre del Cliente *</Label>
              <Input
                value={formData.clientName}
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50"
                placeholder="Ingresa el nombre del cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">País *</Label>
              <Select value={formData.countryCode} onValueChange={(value) => setFormData({...formData, countryCode: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona el país" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/30">
                  {spanishCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code} className="text-white hover:bg-blue-600/20">
                      {country.code} - {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Número de Teléfono *</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50"
                placeholder="Número de teléfono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Tipo de Contacto *</Label>
              <Select value={formData.contactType} onValueChange={(value) => setFormData({...formData, contactType: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/30">
                  {contactTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-blue-600/20">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Modelo de iPhone *</Label>
              <Select value={formData.iphoneModel} onValueChange={(value) => setFormData({...formData, iphoneModel: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona el modelo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/30 max-h-60">
                  {iphoneModels.map((model) => (
                    <SelectItem key={model} value={model} className="text-white hover:bg-blue-600/20">
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Almacenamiento *</Label>
              <Select value={formData.storage} onValueChange={(value) => setFormData({...formData, storage: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona almacenamiento" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/30">
                  {storageOptions.map((storage) => (
                    <SelectItem key={storage} value={storage} className="text-white hover:bg-blue-600/20">
                      {storage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Color *</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({...formData, color: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona el color" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/30 max-h-60">
                  {colorOptions.map((color) => (
                    <SelectItem key={color} value={color} className="text-white hover:bg-blue-600/20">
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">IMEI *</Label>
              <Input
                value={formData.imei}
                onChange={(e) => setFormData({...formData, imei: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50"
                placeholder="Número IMEI"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Número de Serie *</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50"
                placeholder="Número de serie"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-blue-200">URL (Opcional)</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50"
                placeholder="URL opcional"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              Guardar Contacto
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProcessForm;
