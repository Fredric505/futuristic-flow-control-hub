import React, { useState, useCallback } from 'react';
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
    clientName: '', countryCode: '', phoneNumber: '', contactType: '', ownerName: '',
    iphoneModel: '', storage: '', color: '', imei: '', serialNumber: '', url: '',
    lostMode: false, templateId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  React.useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from('message_templates').select('id, name, language').order('name');
      setTemplates(data || []);
    } catch (error) { console.error('Error fetching templates:', error); }
  };

  const countryCodes = [
    { code: '+1', country: '🇺🇸 Estados Unidos' }, { code: '+34', country: '🇪🇸 España' },
    { code: '+44', country: '🇬🇧 Reino Unido' }, { code: '+51', country: '🇵🇪 Perú' },
    { code: '+52', country: '🇲🇽 México' }, { code: '+53', country: '🇨🇺 Cuba' },
    { code: '+54', country: '🇦🇷 Argentina' }, { code: '+56', country: '🇨🇱 Chile' },
    { code: '+57', country: '🇨🇴 Colombia' }, { code: '+58', country: '🇻🇪 Venezuela' },
    { code: '+61', country: '🇦🇺 Australia' }, { code: '+64', country: '🇳🇿 Nueva Zelanda' },
    { code: '+91', country: '🇮🇳 India' }, { code: '+240', country: '🇬🇶 Guinea Ecuatorial' },
    { code: '+253', country: '🇩🇯 Yibuti' }, { code: '+254', country: '🇰🇪 Kenia' },
    { code: '+255', country: '🇹🇿 Tanzania' }, { code: '+256', country: '🇺🇬 Uganda' },
    { code: '+263', country: '🇿🇼 Zimbabue' }, { code: '+268', country: '🇸🇿 Esuatini' },
    { code: '+353', country: '🇮🇪 Irlanda' }, { code: '+357', country: '🇨🇾 Chipre' },
    { code: '+501', country: '🇧🇿 Belice' }, { code: '+502', country: '🇬🇹 Guatemala' },
    { code: '+503', country: '🇸🇻 El Salvador' }, { code: '+504', country: '🇭🇳 Honduras' },
    { code: '+505', country: '🇳🇮 Nicaragua' }, { code: '+506', country: '🇨🇷 Costa Rica' },
    { code: '+507', country: '🇵🇦 Panamá' }, { code: '+591', country: '🇧🇴 Bolivia' },
    { code: '+592', country: '🇬🇾 Guyana' }, { code: '+593', country: '🇪🇨 Ecuador' },
    { code: '+595', country: '🇵🇾 Paraguay' }, { code: '+598', country: '🇺🇾 Uruguay' },
    { code: '+675', country: '🇵🇬 Papúa Nueva Guinea' }, { code: '+960', country: '🇲🇻 Maldivas' },
    { code: '+1787', country: '🇵🇷 Puerto Rico' }, { code: '+1809', country: '🇩🇴 Rep. Dominicana' },
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
    'Verde Oscuro', 'Aerogel', 'Ultramarino', 'Verde azulado',
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
        toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
        return;
      }
      if (formData.contactType === 'propietario' && !formData.ownerName.trim()) {
        setIsSubmitting(false);
        toast({ title: "Campo requerido", description: "El nombre del propietario es obligatorio.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from('processes').insert({
        user_id: session.user.id, client_name: formData.clientName,
        country_code: formData.countryCode, phone_number: formData.phoneNumber,
        contact_type: formData.contactType, owner_name: formData.ownerName || null,
        iphone_model: formData.iphoneModel, storage: formData.storage,
        color: formData.color, imei: formData.imei, serial_number: formData.serialNumber,
        url: formData.url || null, lost_mode: formData.lostMode,
        template_id: formData.templateId || null, status: 'guardado'
      });
      if (error) throw error;
      toast({ title: "✅ Proceso guardado", description: "Se ha registrado exitosamente" });
      setFormData({ clientName: '', countryCode: '', phoneNumber: '', contactType: '', ownerName: '',
        iphoneModel: '', storage: '', color: '', imei: '', serialNumber: '', url: '',
        lostMode: false, templateId: '' });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al guardar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const inputClass = "bg-accent/30 border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 h-11 rounded-lg transition-all";
  const selectClass = "bg-accent/30 border-border/50 text-foreground h-11";
  const labelClass = "text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]";

  const SectionDivider = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-3 pt-2 pb-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="text-xs font-bold text-foreground font-['Space_Grotesk'] uppercase tracking-[0.15em]">{title}</h3>
        <div className="h-px bg-gradient-to-r from-primary/30 to-transparent mt-1.5" />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="glass-card rounded-2xl border border-border/50 relative">
        {/* Gold top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="p-5 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-7">

            {/* ── CLIENT ── */}
            <div>
              <SectionDivider icon={User} title="Datos del Cliente" />
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className={labelClass}>Nombre del Cliente</Label>
                <Input id="clientName" value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className={inputClass} placeholder="Ej: Juan Pérez" required disabled={isSubmitting} />
              </div>
            </div>

            {/* ── OWNER / EMERGENCY ── */}
            <div>
              <SectionDivider icon={Shield} title="Propietario / Contacto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Tipo de Contacto</Label>
                  <SafeSelect value={formData.contactType}
                    onValueChange={(v) => handleSelectChange('contactType', v)}
                    placeholder="Selecciona" disabled={isSubmitting} className={selectClass}>
                    <SelectItem value="propietario">👤 Propietario</SelectItem>
                    <SelectItem value="emergencia">🆘 Contacto de Emergencia</SelectItem>
                  </SafeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className={labelClass}>
                    {formData.contactType === 'propietario' ? 'Nombre del Propietario *' : 'Nombre del Contacto'}
                  </Label>
                  <Input id="ownerName" value={formData.ownerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    className={inputClass}
                    placeholder={formData.contactType === 'propietario' ? 'Nombre del dueño del iPhone' : 'Nombre (opcional)'}
                    disabled={isSubmitting} required={formData.contactType === 'propietario'} />
                </div>
              </div>
            </div>

            {/* ── PHONE ── */}
            <div>
              <SectionDivider icon={Phone} title="Teléfono" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>País</Label>
                  <SafeSelect value={formData.countryCode}
                    onValueChange={(v) => handleSelectChange('countryCode', v)}
                    placeholder="Código de país" disabled={isSubmitting} className={selectClass}>
                    {countryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.country} ({c.code})</SelectItem>
                    ))}
                  </SafeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className={labelClass}>Número</Label>
                  <Input id="phoneNumber" value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className={inputClass} placeholder="Sin código de país" required disabled={isSubmitting} />
                </div>
              </div>
            </div>

            {/* ── DEVICE ── */}
            <div>
              <SectionDivider icon={Smartphone} title="Dispositivo" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Modelo</Label>
                  <SafeSelect value={formData.iphoneModel}
                    onValueChange={(v) => handleSelectChange('iphoneModel', v)}
                    placeholder="iPhone" disabled={isSubmitting} className={selectClass}>
                    {iphoneModels.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SafeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Almacenamiento</Label>
                  <SafeSelect value={formData.storage}
                    onValueChange={(v) => handleSelectChange('storage', v)}
                    placeholder="GB/TB" disabled={isSubmitting} className={selectClass}>
                    {storageOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SafeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Color</Label>
                  <SafeSelect value={formData.color}
                    onValueChange={(v) => handleSelectChange('color', v)}
                    placeholder="Color" disabled={isSubmitting} className={selectClass}>
                    {colorOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SafeSelect>
                </div>
              </div>
            </div>

            {/* ── IDENTIFIERS ── */}
            <div>
              <SectionDivider icon={Hash} title="Identificadores" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="imei" className={labelClass}>IMEI</Label>
                  <Input id="imei" value={formData.imei}
                    onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                    className={`${inputClass} font-mono tracking-widest text-xs`}
                    placeholder="000000000000000" required disabled={isSubmitting} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber" className={labelClass}>Número de Serie</Label>
                  <Input id="serialNumber" value={formData.serialNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className={`${inputClass} font-mono tracking-widest text-xs`}
                    placeholder="XXXXXXXXXXXX" required disabled={isSubmitting} />
                </div>
              </div>
            </div>

            {/* ── OPTIONS ── */}
            <div>
              <SectionDivider icon={Globe} title="Opciones" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="url" className={labelClass}>URL (Opcional)</Label>
                  <Input id="url" value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    className={inputClass} placeholder="https://..." disabled={isSubmitting} />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/15">
                  <Checkbox id="lostMode" checked={formData.lostMode}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, lostMode: c === true }))}
                    disabled={isSubmitting}
                    className="border-warning/40 data-[state=checked]:bg-warning data-[state=checked]:border-warning" />
                  <div>
                    <Label htmlFor="lostMode" className="text-foreground text-sm font-medium cursor-pointer flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-warning" /> Modo Perdido
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Personaliza el mensaje para modo perdido</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TEMPLATE ── */}
            <div>
              <SectionDivider icon={FileText} title="Plantilla" />
              <div className="space-y-1.5">
                <Label className={labelClass}>Plantilla de Mensaje (Opcional)</Label>
                <SafeSelect value={formData.templateId}
                  onValueChange={(v) => handleSelectChange('templateId', v)}
                  placeholder="Mensaje aleatorio" disabled={isSubmitting} className={selectClass}>
                  <SelectItem value="">Mensaje aleatorio (predeterminado)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.language === 'spanish' ? 'ES' : 'EN'})
                    </SelectItem>
                  ))}
                </SafeSelect>
                <p className="text-[10px] text-muted-foreground">Sin plantilla = mensaje aleatorio automático</p>
              </div>
            </div>

            {/* ── SUBMIT ── */}
            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting}
                className="w-full h-12 gold-gradient text-primary-foreground font-semibold text-sm tracking-wide uppercase hover:opacity-90 transition-all duration-300 glow-gold font-['Space_Grotesk'] rounded-xl">
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Guardar Proceso</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProcessForm;
