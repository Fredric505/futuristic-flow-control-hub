import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, FileText } from 'lucide-react';
import { countryCodes } from '@/utils/countryCodes';

interface SmsTemplate {
  id: string;
  name: string;
  country_code: string;
  assigned_domain: string;
  message_script: string;
  created_at: string;
}

const SmsTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [scripts, setScripts] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    country_code: '',
    assigned_domain: '',
    message_script: ''
  });

  useEffect(() => {
    loadTemplates();
    loadDomainsAndScripts();
  }, []);

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
            message_script: template.message_script,
            created_at: item.created_at
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

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.country_code || !newTemplate.assigned_domain || !newTemplate.message_script) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos de la plantilla",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const templateKey = `sms_template_${Date.now()}`;
      const templateValue = JSON.stringify(newTemplate);

      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: templateKey,
          setting_value: templateValue
        });

      if (error) throw error;

      toast({
        title: "Plantilla guardada",
        description: "La plantilla SMS se ha guardado correctamente"
      });

      setNewTemplate({
        name: '',
        country_code: '',
        assigned_domain: '',
        message_script: ''
      });

      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se ha eliminado correctamente"
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Crear Nueva Plantilla SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template_name" className="text-blue-200">
                Nombre de la Plantilla *
              </Label>
              <Input
                id="template_name"
                placeholder="Nombre de la plantilla"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_country" className="text-blue-200">
                Código de País *
              </Label>
              <Select value={newTemplate.country_code} onValueChange={(value) => setNewTemplate({ ...newTemplate, country_code: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar código" />
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
              <Label htmlFor="template_domain" className="text-blue-200">
                Dominio Asignado *
              </Label>
              <Select value={newTemplate.assigned_domain} onValueChange={(value) => setNewTemplate({ ...newTemplate, assigned_domain: value })}>
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

            <div className="space-y-2">
              <Label htmlFor="template_script" className="text-blue-200">
                Script del Mensaje *
              </Label>
              <Select value={newTemplate.message_script} onValueChange={(value) => setNewTemplate({ ...newTemplate, message_script: value })}>
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
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveTemplate}
              disabled={isLoading}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">Mis Plantillas Guardadas</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-blue-200/70 text-center py-4">No hay plantillas guardadas</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="bg-black/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-blue-200 font-medium">{template.name}</h3>
                      <div className="text-sm text-blue-200/70 space-y-1">
                        <p>País: {template.country_code}</p>
                        <p>Dominio: {template.assigned_domain}</p>
                        <p>Script: {template.message_script}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteTemplate(template.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-300 hover:bg-red-600/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsTemplates;
