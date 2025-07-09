
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, Phone } from 'lucide-react';
import { countryCodes } from '@/utils/countryCodes';

const SmsProcessForm = () => {
  const { toast } = useToast();
  const [processData, setProcessData] = useState({
    country_code: '',
    phone_number: '',
    assigned_domain: '',
    message_script: '',
    subdomain: '',
    client_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [scripts, setScripts] = useState<string[]>([]);

  useEffect(() => {
    loadDomainsAndScripts();
  }, []);

  const loadDomainsAndScripts = async () => {
    try {
      // Cargar dominios y scripts de la configuración del sistema
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['user_domains', 'message_scripts']);

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      // Parsear dominios y scripts (asumiendo que están separados por comas)
      setDomains(settingsMap['user_domains']?.split(',').map(d => d.trim()) || []);
      setScripts(settingsMap['message_scripts']?.split(',').map(s => s.trim()) || []);
    } catch (error) {
      console.error('Error loading domains and scripts:', error);
    }
  };

  const handleSaveProcess = async () => {
    if (!processData.country_code || !processData.phone_number || !processData.assigned_domain || !processData.message_script || !processData.client_name) {
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

      // Crear un proceso SMS (usando la tabla processes pero con campos específicos para SMS)
      const { error } = await supabase
        .from('processes')
        .insert({
          user_id: user.id,
          client_name: processData.client_name,
          country_code: processData.country_code,
          phone_number: processData.phone_number,
          contact_type: 'sms', // Identificar como proceso SMS
          iphone_model: processData.assigned_domain, // Reutilizar campo para dominio
          storage: processData.message_script, // Reutilizar campo para script
          color: processData.subdomain || 'default', // Reutilizar campo para subdominio
          imei: 'sms-process', // Identificador fijo para SMS
          serial_number: `sms-${Date.now()}`, // Serial único para SMS
          status: 'ready'
        });

      if (error) throw error;

      toast({
        title: "Proceso SMS creado",
        description: "El proceso SMS se ha guardado correctamente"
      });

      // Limpiar formulario
      setProcessData({
        country_code: '',
        phone_number: '',
        assigned_domain: '',
        message_script: '',
        subdomain: '',
        client_name: ''
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
              <Label htmlFor="country_code" className="text-blue-200">
                Código de País *
              </Label>
              <Select value={processData.country_code} onValueChange={(value) => setProcessData({ ...processData, country_code: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar código de país" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/20 max-h-60">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
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
                <SelectContent className="bg-slate-800 border-blue-500/20">
                  {domains.length > 0 ? domains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-domains" disabled>
                      No hay dominios configurados
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="message_script" className="text-blue-200">
                Script del Mensaje *
              </Label>
              <Select value={processData.message_script} onValueChange={(value) => setProcessData({ ...processData, message_script: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar script" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/20">
                  {scripts.length > 0 ? scripts.map((script) => (
                    <SelectItem key={script} value={script}>
                      {script}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-scripts" disabled>
                      No hay scripts configurados
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-blue-200">
                Subdominio (Opcional)
              </Label>
              <Input
                id="subdomain"
                placeholder="subdominio"
                value={processData.subdomain}
                onChange={(e) => setProcessData({ ...processData, subdomain: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>
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
