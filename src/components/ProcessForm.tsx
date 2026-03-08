import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SafeSelect from '@/components/SafeSelect';
import { User, Phone, Smartphone, Hash, Globe, FileText, Shield, Save, Loader2, MapPin } from 'lucide-react';

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
    lostMode: false,
    templateId: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase
        .from('message_templates')
        .select('id, name, language')
        .order('name');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

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
    { code: '+502', country: 'Guatemala' },
    { code: '+503', country: 'El Salvador' },
    { code: '+504', country: 'Honduras' },
    { code: '+505', country: 'Nicaragua' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+507', country: 'Panamá' },
    { code: '+591', country: 'Bolivia' },
    { code: '+592', country: 'Guyana' },
    { code: '+593', country: 'Ecuador' },
    { code: '+595', country: 'Paraguay' },
    { code: '+598', country: 'Uruguay' },
    { code: '+675', country: 'Papúa Nueva Guinea' },
    { code: '+960', country: 'Maldivas' },
    { code: '+1787', country: 'Puerto Rico' },
    { code: '+1809', country: 'República Dominicana' },
  ];

  const iphoneModels = [
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Plus', 'iPhone 17 Air', 'iPhone 17',
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

  const storageOptions = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

  const colorOptions = [
    'Negro', 'Blanco', 'Azul', 'Verde', 'Rosa', 'Amarillo', 'Púrpura', 'Rojo',
    'Verde Oscuro', 'Aerogel',
    'Ultramarino', 'Verde azulado',
    'Titanio Natural', 'Titanio Azul', 'Titanio Blanco', 'Titanio Negro',
    'Titanio Desierto', 'Titanio Oscuro', 'Titanio Verde',
    'Medianoche', 'Luz de estrella', 'Oro', 'Plata', 'Grafito',
    'Púrpura Intenso', 'Sierra Blue', 'Azul Pacífico', 'Verde Noche',
    'Gris Espacial', 'Oro Rosa'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTimeout(() => {
          toast({ title: "Error de Autenticación", description: "Debes iniciar sesión para guardar un proceso", variant: "destructive" });
        }, 100);
        return;
      }

      if (formData.contactType === 'propietario' && !formData.ownerName.trim()) {
        setIsSubmitting(false);
        setTimeout(() => {
          toast({ title: "Falta nombre del propietario", description: "El nombre del propietario es obligatorio para el saludo.", variant: "destructive" });
        }, 100);
        return;
      }

      const { error } = await supabase.from('processes').insert({
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
        template_id: formData.templateId || null,
        status: 'guardado'
      });

      if (error) throw error;

      setTimeout(() => {
        toast({ title: "Proceso guardado", description: "El proceso se ha guardado exitosamente" });
      }, 100);

      setTimeout(() => {
        setFormData({
          clientName: '', countryCode: '', phoneNumber: '', contactType: '', ownerName: '',
          iphoneModel: '', storage: '', color: '', imei: '', serialNumber: '', url: '',
          lostMode: false, templateId: ''
        });
      }, 200);
    } catch (error: any) {
      console.error('Error al guardar proceso:', error);
      setTimeout(() => {
        toast({ title: "Error", description: error.message || "Error al guardar el proceso.", variant: "destructive" });
      }, 100);
    } finally {
      setTimeout(() => { setIsSubmitting(false); }, 300);
    }
  };

  const handleSelectChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-border/40">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground font-['Space_Grotesk'] tracking-wide uppercase">{title}</h3>
    </div>
  );

  const inputStyles = "bg-accent/40 border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 transition-colors";
  const selectStyles = "bg-accent/40 border-border/60 text-foreground";
  const labelStyles = "text-muted-foreground text-xs font-medium uppercase tracking-wider";

  return (
    <div className="space-y-5 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Contact Info */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={User} title="Información del Contacto" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className={labelStyles}>Nombre del Cliente</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className={inputStyles}
                  placeholder="Nombre completo"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={labelStyles}>Tipo de Contacto</Label>
                <SafeSelect
                  value={formData.contactType}
                  onValueChange={(value) => handleSelectChange('contactType', value)}
                  placeholder="Selecciona tipo"
                  disabled={isSubmitting}
                  className={selectStyles}
                >
                  <SelectItem value="propietario">Propietario</SelectItem>
                  <SelectItem value="emergencia">Contacto de Emergencia</SelectItem>
                </SafeSelect>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="ownerName" className={labelStyles}>
                  {formData.contactType === 'propietario' ? 'Nombre del Propietario *' : 'Nombre del Contacto de Emergencia'}
                </Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                  className={inputStyles}
                  placeholder={formData.contactType === 'propietario' ? 'Nombre del propietario del iPhone' : 'Nombre de la persona (opcional)'}
                  disabled={isSubmitting}
                  required={formData.contactType === 'propietario'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Phone */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={Phone} title="Teléfono" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelStyles}>Código de País</Label>
                <SafeSelect
                  value={formData.countryCode}
                  onValueChange={(value) => handleSelectChange('countryCode', value)}
                  placeholder="País"
                  disabled={isSubmitting}
                  className={selectStyles}
                >
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.code} — {country.country}
                    </SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className={labelStyles}>Número de Teléfono</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className={inputStyles}
                  placeholder="Sin código de país"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Device */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={Smartphone} title="Información del Dispositivo" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className={labelStyles}>Modelo</Label>
                <SafeSelect
                  value={formData.iphoneModel}
                  onValueChange={(value) => handleSelectChange('iphoneModel', value)}
                  placeholder="Modelo de iPhone"
                  disabled={isSubmitting}
                  className={selectStyles}
                >
                  {iphoneModels.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className={labelStyles}>Almacenamiento</Label>
                <SafeSelect
                  value={formData.storage}
                  onValueChange={(value) => handleSelectChange('storage', value)}
                  placeholder="Capacidad"
                  disabled={isSubmitting}
                  className={selectStyles}
                >
                  {storageOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className={labelStyles}>Color</Label>
                <SafeSelect
                  value={formData.color}
                  onValueChange={(value) => handleSelectChange('color', value)}
                  placeholder="Color del dispositivo"
                  disabled={isSubmitting}
                  className={selectStyles}
                >
                  {colorOptions.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SafeSelect>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Identifiers */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={Hash} title="Identificadores" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="imei" className={labelStyles}>IMEI</Label>
                <Input
                  id="imei"
                  value={formData.imei}
                  onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                  className={`${inputStyles} font-mono tracking-wider`}
                  placeholder="000000000000000"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="serialNumber" className={labelStyles}>Número de Serie</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className={`${inputStyles} font-mono tracking-wider`}
                  placeholder="XXXXXXXXXXXX"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Additional Options */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={Globe} title="Opciones Adicionales" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="url" className={labelStyles}>URL (Opcional)</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className={inputStyles}
                  placeholder="https://ejemplo.com"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
                <Checkbox
                  id="lostMode"
                  checked={formData.lostMode}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, lostMode: checked === true }))}
                  disabled={isSubmitting}
                  className="border-warning/40 data-[state=checked]:bg-warning data-[state=checked]:border-warning"
                />
                <div>
                  <Label htmlFor="lostMode" className="text-foreground text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-warning" />
                    iPhone en Modo Perdido
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Personaliza el mensaje para dispositivos en modo perdido
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Template */}
        <Card className="glass-card glow-card">
          <CardContent className="pt-6">
            <SectionHeader icon={FileText} title="Plantilla de Mensaje" />
            <div className="space-y-1.5">
              <Label className={labelStyles}>Plantilla (Opcional)</Label>
              <SafeSelect
                value={formData.templateId}
                onValueChange={(value) => handleSelectChange('templateId', value)}
                placeholder="Mensaje aleatorio (predeterminado)"
                disabled={isSubmitting}
                className={selectStyles}
              >
                <SelectItem value="">Mensaje aleatorio (predeterminado)</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.language === 'spanish' ? 'ES' : 'EN'})
                  </SelectItem>
                ))}
              </SafeSelect>
              <p className="text-[11px] text-muted-foreground">
                Si no seleccionas una plantilla, se enviará un mensaje aleatorio automático
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 gold-gradient text-primary-foreground font-semibold text-sm tracking-wide uppercase hover:opacity-90 transition-all duration-300 glow-gold font-['Space_Grotesk']"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar Proceso
            </span>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ProcessForm;
