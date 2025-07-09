
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, Phone, FileText } from 'lucide-react';
import { countryCodes } from '@/utils/countryCodes';

interface SmsTemplate {
  id: string;
  name: string;
  country_code: string;
  assigned_domain: string;
  message_script: string;
}

const SmsProcessForm = () => {
  const { toast } = useToast();
  const [processData, setProcessData] = useState({
    country_code: '',
    phone_number: '',
    assigned_domain: '',
    message_script: '',
    subdomain: '',
    client_name: '',
    imei: '',
    owner_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [scripts, setScripts] = useState<string[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);

  useEffect(() => {
    loadDomainsAndScripts();
    loadTemplates();
  }, []);

  const generateUniqueSubdomain = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `sms-${timestamp}-${random}`;
  };

  const loadDomainsAndScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['user_domains', 'message_scripts']);

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setDomains(settingsMap['user_domains']?.split(',').map(d => d.trim()) || []);
      setScripts(settingsMap['message_scripts']?.split(',').map(s => s.trim()) || []);
    } catch (error) {
      console.error('Error loading domains and scripts:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'sms_template_%');

      if (error) throw error;

      const templateData: SmsTemplate[] = [];
      data?.forEach(item => {
        try {
          const template = JSON.parse(item.setting_value);
          templateData.push({
            id: item.id,
            name: template.name,
            country_code: template.country_code,
            assigned_domain: template.assigned_domain,
            message_script: template.message_script
          });
        } catch (e) {
          console.error('Error parsing template:', e);
        }
      });

      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setProcessData({
        ...processData,
        country_code: template.country_code,
        assigned_domain: template.assigned_domain,
        message_script: template.message_script
      });
      
      toast({
        title: "Plantilla aplicada",
        description: `Plantilla "${template.name}" aplicada correctamente`
      });
    }
  };

  const handleSaveProcess = async () => {
    if (!processData.country_code || !processData.phone_number || !processData.assigned_domain || !processData.message_script || !processData.client_name || !processData.imei) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generar subdominio único automáticamente
      const uniqueSubdomain = generateUniqueSubdomain();

      const { error } = await supabase
        .from('processes')
        .insert({
          user_id: user.id,
          client_name: processData.client_name,
          country_code: processData.country_code,
          phone_number: processData.phone_number,
          contact_type: 'sms',
          iphone_model: processData.assigned_domain,
          storage: processData.message_script,
          color: uniqueSubdomain, // Subdominio único generado automáticamente
          imei: processData.imei,
          serial_number: `sms-${Date.now()}`,
          owner_name: processData.owner_name || null,
          status: 'ready'
        });

      if (error) throw error;

      toast({
        title: "Proceso SMS creado",
        description: `Proceso guardado con subdominio: ${uniqueSubdomain}`
      });

      // Limpiar formulario
      setProcessData({
        country_code: '',
        phone_number: '',
        assigned_domain: '',
        message_script: '',
        subdomain: '',
        client_name: '',
        imei: '',
        owner_name: ''
      });
    } catch (error) {
      console.error('Error saving SMS process:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el proceso SMS",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Crear Proceso SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de plantillas */}
          {templates.length > 0 && (
            <div className="space-y-2 pb-4 border-b border-blue-500/20">
              <Label className="text-blue-200">
                <Template className="h-4 w-4 inline mr-1" />
                Aplicar Plantilla (Opcional)
              </Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar plantilla guardada" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20">
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white hover:bg-slate-800">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="text-blue-200">
                Nombre del Cliente *
              </Label>
              <Input
                id="client_name"
                placeholder="Nombre del cliente"
                value={processData.client_name}
                onChange={(e) => setProcessData({ ...processData, client_name: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei" className="text-blue-200">
                IMEI *
              </Label>
              <Input
                id="imei"
                placeholder="IMEI del dispositivo"
                value={processData.imei}
                onChange={(e) => setProcessData({ ...processData, imei: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name" className="text-blue-200">
                Nombre del Propietario (Opcional)
              </Label>
              <Input
                id="owner_name"
                placeholder="Nombre del propietario"
                value={processData.owner_name}
                onChange={(e) => setProcessData({ ...processData, owner_name: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code" className="text-blue-200">
                Código de País *
              </Label>
              <Select value={processData.country_code} onValueChange={(value) => setProcessData({ ...processData, country_code: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar código de país" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20 max-h-60">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code} className="text-white hover:bg-slate-800">
                      {country.code} - {country.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-blue-200">
                <Phone className="h-4 w-4 inline mr-1" />
                Número de Teléfono *
              </Label>
              <Input
                id="phone_number"
                placeholder="1234567890"
                value={processData.phone_number}
                onChange={(e) => setProcessData({ ...processData, phone_number: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_domain" className="text-blue-200">
                Dominio Asignado *
              </Label>
              <Select value={processData.assigned_domain} onValueChange={(value) => setProcessData({ ...processData, assigned_domain: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar dominio" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20">
                  {domains.length > 0 ? domains.map((domain) => (
                    <SelectItem key={domain} value={domain} className="text-white hover:bg-slate-800">
                      {domain}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-domains" disabled className="text-gray-400">
                      No hay dominios configurados
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_script" className="text-blue-200">
              Script del Mensaje *
            </Label>
            <Select value={processData.message_script} onValueChange={(value) => setProcessData({ ...processData, message_script: value })}>
              <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                <SelectValue placeholder="Seleccionar script" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-blue-500/20">
                {scripts.length > 0 ? scripts.map((script) => (
                  <SelectItem key={script} value={script} className="text-white hover:bg-slate-800">
                    {script}
                  </SelectItem>
                )) : (
                  <SelectItem value="no-scripts" disabled className="text-gray-400">
                    No hay scripts configurados
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-4">
            <p className="text-blue-200 text-sm">
              <strong>Nota:</strong> El subdominio se generará automáticamente de forma única para cada proceso. 
              Este subdominio cargará el script seleccionado.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveProcess}
              disabled={isLoading}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando Proceso...' : 'Guardar Proceso SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsProcessForm;
