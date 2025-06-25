
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

  const countryCodes = [
    { code: '+1', country: 'Estados Unidos/Canadá' },
    { code: '+7', country: 'Rusia/Kazajistán' },
    { code: '+20', country: 'Egipto' },
    { code: '+27', country: 'Sudáfrica' },
    { code: '+30', country: 'Grecia' },
    { code: '+31', country: 'Países Bajos' },
    { code: '+32', country: 'Bélgica' },
    { code: '+33', country: 'Francia' },
    { code: '+34', country: 'España' },
    { code: '+36', country: 'Hungría' },
    { code: '+39', country: 'Italia' },
    { code: '+40', country: 'Rumania' },
    { code: '+41', country: 'Suiza' },
    { code: '+43', country: 'Austria' },
    { code: '+44', country: 'Reino Unido' },
    { code: '+45', country: 'Dinamarca' },
    { code: '+46', country: 'Suecia' },
    { code: '+47', country: 'Noruega' },
    { code: '+48', country: 'Polonia' },
    { code: '+49', country: 'Alemania' },
    { code: '+51', country: 'Perú' },
    { code: '+52', country: 'México' },
    { code: '+53', country: 'Cuba' },
    { code: '+54', country: 'Argentina' },
    { code: '+55', country: 'Brasil' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+58', country: 'Venezuela' },
    { code: '+60', country: 'Malasia' },
    { code: '+61', country: 'Australia' },
    { code: '+62', country: 'Indonesia' },
    { code: '+63', country: 'Filipinas' },
    { code: '+64', country: 'Nueva Zelanda' },
    { code: '+65', country: 'Singapur' },
    { code: '+66', country: 'Tailandia' },
    { code: '+81', country: 'Japón' },
    { code: '+82', country: 'Corea del Sur' },
    { code: '+84', country: 'Vietnam' },
    { code: '+86', country: 'China' },
    { code: '+90', country: 'Turquía' },
    { code: '+91', country: 'India' },
    { code: '+92', country: 'Pakistán' },
    { code: '+93', country: 'Afganistán' },
    { code: '+94', country: 'Sri Lanka' },
    { code: '+95', country: 'Myanmar' },
    { code: '+98', country: 'Irán' },
    { code: '+212', country: 'Marruecos' },
    { code: '+213', country: 'Argelia' },
    { code: '+216', country: 'Túnez' },
    { code: '+218', country: 'Libia' },
    { code: '+220', country: 'Gambia' },
    { code: '+221', country: 'Senegal' },
    { code: '+222', country: 'Mauritania' },
    { code: '+223', country: 'Malí' },
    { code: '+224', country: 'Guinea' },
    { code: '+225', country: 'Costa de Marfil' },
    { code: '+226', country: 'Burkina Faso' },
    { code: '+227', country: 'Níger' },
    { code: '+228', country: 'Togo' },
    { code: '+229', country: 'Benín' },
    { code: '+230', country: 'Mauricio' },
    { code: '+231', country: 'Liberia' },
    { code: '+232', country: 'Sierra Leona' },
    { code: '+233', country: 'Ghana' },
    { code: '+234', country: 'Nigeria' },
    { code: '+235', country: 'Chad' },
    { code: '+236', country: 'República Centroafricana' },
    { code: '+237', country: 'Camerún' },
    { code: '+238', country: 'Cabo Verde' },
    { code: '+239', country: 'Santo Tomé y Príncipe' },
    { code: '+240', country: 'Guinea Ecuatorial' },
    { code: '+241', country: 'Gabón' },
    { code: '+242', country: 'República del Congo' },
    { code: '+243', country: 'República Democrática del Congo' },
    { code: '+244', country: 'Angola' },
    { code: '+245', country: 'Guinea-Bisáu' },
    { code: '+246', country: 'Territorio Británico del Océano Índico' },
    { code: '+248', country: 'Seychelles' },
    { code: '+249', country: 'Sudán' },
    { code: '+250', country: 'Ruanda' },
    { code: '+251', country: 'Etiopía' },
    { code: '+252', country: 'Somalia' },
    { code: '+253', country: 'Yibuti' },
    { code: '+254', country: 'Kenia' },
    { code: '+255', country: 'Tanzania' },
    { code: '+256', country: 'Uganda' },
    { code: '+257', country: 'Burundi' },
    { code: '+258', country: 'Mozambique' },
    { code: '+260', country: 'Zambia' },
    { code: '+261', country: 'Madagascar' },
    { code: '+262', country: 'Reunión/Mayotte' },
    { code: '+263', country: 'Zimbabue' },
    { code: '+264', country: 'Namibia' },
    { code: '+265', country: 'Malaui' },
    { code: '+266', country: 'Lesoto' },
    { code: '+267', country: 'Botsuana' },
    { code: '+268', country: 'Esuatini' },
    { code: '+269', country: 'Comoras' },
    { code: '+290', country: 'Santa Elena' },
    { code: '+291', country: 'Eritrea' },
    { code: '+297', country: 'Aruba' },
    { code: '+298', country: 'Islas Feroe' },
    { code: '+299', country: 'Groenlandia' },
    { code: '+350', country: 'Gibraltar' },
    { code: '+351', country: 'Portugal' },
    { code: '+352', country: 'Luxemburgo' },
    { code: '+353', country: 'Irlanda' },
    { code: '+354', country: 'Islandia' },
    { code: '+355', country: 'Albania' },
    { code: '+356', country: 'Malta' },
    { code: '+357', country: 'Chipre' },
    { code: '+358', country: 'Finlandia' },
    { code: '+359', country: 'Bulgaria' },
    { code: '+370', country: 'Lituania' },
    { code: '+371', country: 'Letonia' },
    { code: '+372', country: 'Estonia' },
    { code: '+373', country: 'Moldavia' },
    { code: '+374', country: 'Armenia' },
    { code: '+375', country: 'Bielorrusia' },
    { code: '+376', country: 'Andorra' },
    { code: '+377', country: 'Mónaco' },
    { code: '+378', country: 'San Marino' },
    { code: '+380', country: 'Ucrania' },
    { code: '+381', country: 'Serbia' },
    { code: '+382', country: 'Montenegro' },
    { code: '+383', country: 'Kosovo' },
    { code: '+385', country: 'Croacia' },
    { code: '+386', country: 'Eslovenia' },
    { code: '+387', country: 'Bosnia y Herzegovina' },
    { code: '+389', country: 'Macedonia del Norte' },
    { code: '+420', country: 'República Checa' },
    { code: '+421', country: 'Eslovaquia' },
    { code: '+423', country: 'Liechtenstein' },
    { code: '+500', country: 'Islas Malvinas' },
    { code: '+501', country: 'Belice' },
    { code: '+502', country: 'Guatemala' },
    { code: '+503', country: 'El Salvador' },
    { code: '+504', country: 'Honduras' },
    { code: '+505', country: 'Nicaragua' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+507', country: 'Panamá' },
    { code: '+508', country: 'San Pedro y Miquelón' },
    { code: '+509', country: 'Haití' },
    { code: '+590', country: 'Guadalupe' },
    { code: '+591', country: 'Bolivia' },
    { code: '+592', country: 'Guyana' },
    { code: '+593', country: 'Ecuador' },
    { code: '+594', country: 'Guayana Francesa' },
    { code: '+595', country: 'Paraguay' },
    { code: '+596', country: 'Martinica' },
    { code: '+597', country: 'Surinam' },
    { code: '+598', country: 'Uruguay' },
    { code: '+599', country: 'Antillas Neerlandesas' },
    { code: '+670', country: 'Timor Oriental' },
    { code: '+672', country: 'Territorio Antártico Australiano' },
    { code: '+673', country: 'Brunéi' },
    { code: '+674', country: 'Nauru' },
    { code: '+675', country: 'Papúa Nueva Guinea' },
    { code: '+676', country: 'Tonga' },
    { code: '+677', country: 'Islas Salomón' },
    { code: '+678', country: 'Vanuatu' },
    { code: '+679', country: 'Fiji' },
    { code: '+680', country: 'Palaos' },
    { code: '+681', country: 'Wallis y Futuna' },
    { code: '+682', country: 'Islas Cook' },
    { code: '+683', country: 'Niue' },
    { code: '+684', country: 'Samoa Americana' },
    { code: '+685', country: 'Samoa' },
    { code: '+686', country: 'Kiribati' },
    { code: '+687', country: 'Nueva Caledonia' },
    { code: '+688', country: 'Tuvalu' },
    { code: '+689', country: 'Polinesia Francesa' },
    { code: '+690', country: 'Tokelau' },
    { code: '+691', country: 'Estados Federados de Micronesia' },
    { code: '+692', country: 'Islas Marshall' }
  ];

  const iphoneColors = [
    'Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium',
    'Pink', 'Yellow', 'Green', 'Blue', 'Black', 'White', 'Purple', 'Red',
    'Starlight', 'Midnight', 'Pink', 'Blue', 'Yellow', 'Green', 'Purple', 'Red',
    'Deep Purple', 'Gold', 'Silver', 'Space Black', 'Sierra Blue', 'Graphite',
    'Alpine Green', 'Space Gray', 'Rose Gold', 'Pacific Blue', 'Coral',
    'Lavender', 'Mint', 'Cream', 'Plum', 'Orange', 'Sky Blue'
  ];

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
                  <SelectTrigger className="w-32 bg-white/5 border-blue-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.code} {country.country}
                      </SelectItem>
                    ))}
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
                  <SelectItem value="iPhone 13 mini">iPhone 13 mini</SelectItem>
                  <SelectItem value="iPhone 13">iPhone 13</SelectItem>
                  <SelectItem value="iPhone 12 Pro Max">iPhone 12 Pro Max</SelectItem>
                  <SelectItem value="iPhone 12 Pro">iPhone 12 Pro</SelectItem>
                  <SelectItem value="iPhone 12 mini">iPhone 12 mini</SelectItem>
                  <SelectItem value="iPhone 12">iPhone 12</SelectItem>
                  <SelectItem value="iPhone SE (3rd generation)">iPhone SE (3rd generation)</SelectItem>
                  <SelectItem value="iPhone SE (2nd generation)">iPhone SE (2nd generation)</SelectItem>
                  <SelectItem value="iPhone 11 Pro Max">iPhone 11 Pro Max</SelectItem>
                  <SelectItem value="iPhone 11 Pro">iPhone 11 Pro</SelectItem>
                  <SelectItem value="iPhone 11">iPhone 11</SelectItem>
                  <SelectItem value="iPhone XS Max">iPhone XS Max</SelectItem>
                  <SelectItem value="iPhone XS">iPhone XS</SelectItem>
                  <SelectItem value="iPhone XR">iPhone XR</SelectItem>
                  <SelectItem value="iPhone X">iPhone X</SelectItem>
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
                  <SelectItem value="16GB">16GB</SelectItem>
                  <SelectItem value="32GB">32GB</SelectItem>
                  <SelectItem value="64GB">64GB</SelectItem>
                  <SelectItem value="128GB">128GB</SelectItem>
                  <SelectItem value="256GB">256GB</SelectItem>
                  <SelectItem value="512GB">512GB</SelectItem>
                  <SelectItem value="1TB">1TB</SelectItem>
                  <SelectItem value="2TB">2TB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color" className="text-blue-200">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({...formData, color: value})}>
                <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                  <SelectValue placeholder="Selecciona color" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {iphoneColors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
