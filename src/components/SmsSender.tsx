
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, FileText, Phone, ArrowLeft, Trash2 } from 'lucide-react';
import { countryCodes } from '@/utils/countryCodes';

interface SmsTemplate {
  id: string;
  name: string;
  message_text: string;
}

interface Process {
  id: string;
  client_name: string;
  color: string; // Este es el subdominio único
  assigned_domain: string;
  message_script: string;
}

interface SmsApi {
  name: string;
  url: string;
  key: string;
  token: string;
}

const SmsSender = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [smsApis, setSmsApis] = useState<SmsApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'send'>('select');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [messageData, setMessageData] = useState({
    country_code: '',
    phone_number: '',
    message_text: '',
    selected_template: '',
    selected_api: ''
  });

  useEffect(() => {
    loadTemplates();
    loadProcesses();
    loadSmsApis();
  }, []);

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
            message_text: template.message_text
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

  const loadProcesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('processes')
        .select('id, client_name, color, iphone_model, storage')
        .eq('user_id', user.id)
        .eq('contact_type', 'sms');

      if (error) throw error;

      const processData: Process[] = data?.map(process => ({
        id: process.id,
        client_name: process.client_name,
        color: process.color, // subdominio único
        assigned_domain: process.iphone_model, // dominio asignado
        message_script: process.storage // script del mensaje
      })) || [];

      setProcesses(processData);
    } catch (error) {
      console.error('Error loading processes:', error);
    }
  };

  const loadSmsApis = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['sms_api_url', 'sms_api_key', 'sms_token', 'user_domains']);

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      // Crear array de APIs basado en los dominios configurados
      const domains = settingsMap['user_domains']?.split(',').map(d => d.trim()) || [];
      const apiData: SmsApi[] = domains.map((domain, index) => ({
        name: `API ${domain}`,
        url: settingsMap['sms_api_url'] || '',
        key: settingsMap['sms_api_key'] || '',
        token: settingsMap['sms_token'] || ''
      }));

      setSmsApis(apiData);
    } catch (error) {
      console.error('Error loading SMS APIs:', error);
    }
  };

  const handleProcessSelect = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (process) {
      setSelectedProcess(process);
      setCurrentStep('send');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && selectedProcess) {
      // Crear URL completa del script con el subdominio del proceso
      const scriptUrl = `https://${selectedProcess.color}.${selectedProcess.assigned_domain}/script/${selectedProcess.message_script}`;
      const messageWithTemplateAndUrl = `${template.message_text}\n\n${scriptUrl}`;
      
      setMessageData({
        ...messageData,
        selected_template: templateId,
        message_text: messageWithTemplateAndUrl
      });
    }
  };

  const handleDeleteProcess = async (processId: string) => {
    try {
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', processId);

      if (error) throw error;

      toast({
        title: "Proceso eliminado",
        description: "El proceso SMS se ha eliminado correctamente"
      });

      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proceso",
        variant: "destructive"
      });
    }
  };

  const handleSendSms = async () => {
    if (!messageData.country_code || !messageData.phone_number || !messageData.message_text || !messageData.selected_api) {
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

      // Verificar créditos del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.credits <= 0) {
        toast({
          title: "Sin créditos",
          description: "No tienes créditos suficientes para enviar SMS",
          variant: "destructive"
        });
        return;
      }

      // Guardar en la tabla messages
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          recipient_phone: `${messageData.country_code}${messageData.phone_number}`,
          message_content: messageData.message_text,
          status: 'sent',
          process_id: selectedProcess?.id || null
        });

      if (error) throw error;

      // Descontar un crédito
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Actualizar status del proceso a "enviado"
      if (selectedProcess) {
        const { error: processError } = await supabase
          .from('processes')
          .update({ status: 'enviado' })
          .eq('id', selectedProcess.id);

        if (processError) console.error('Error updating process status:', processError);
      }

      toast({
        title: "SMS enviado",
        description: "El mensaje se ha enviado correctamente"
      });

      // Resetear formulario
      setCurrentStep('select');
      setSelectedProcess(null);
      setMessageData({
        country_code: '',
        phone_number: '',
        message_text: '',
        selected_template: '',
        selected_api: ''
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el SMS",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
    setSelectedProcess(null);
    setMessageData({
      country_code: '',
      phone_number: '',
      message_text: '',
      selected_template: '',
      selected_api: ''
    });
  };

  if (currentStep === 'select') {
    return (
      <div className="space-y-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Seleccionar Proceso para Enviar SMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processes.length === 0 ? (
              <p className="text-blue-200/70 text-center py-8">
                No hay procesos de SMS guardados. Crea un proceso primero en la sección "Proceso SMS".
              </p>
            ) : (
              <div className="grid gap-3">
                {processes.map((process) => (
                  <div
                    key={process.id}
                    className="bg-black/10 border border-blue-500/20 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-blue-200 font-medium">{process.client_name}</h3>
                        <p className="text-blue-200/70 text-sm">
                          {process.color}.{process.assigned_domain}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleProcessSelect(process.id)}
                          size="sm"
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                        >
                          Enviar SMS
                        </Button>
                        <Button
                          onClick={() => handleDeleteProcess(process.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-300 hover:bg-red-600/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-blue-300 flex items-center">
              <Send className="h-5 w-5 mr-2" />
              Enviar SMS - {selectedProcess?.client_name}
            </CardTitle>
            <Button
              onClick={handleBack}
              variant="outline"
              size="sm"
              className="border-blue-500/30 text-blue-300 hover:bg-blue-600/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country_code" className="text-blue-200">
                Código de País *
              </Label>
              <Select value={messageData.country_code} onValueChange={(value) => setMessageData({ ...messageData, country_code: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar código" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20 max-h-60 z-50">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code} className="text-white hover:bg-slate-800">
                      {country.code} - {country.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-blue-200">
                <Phone className="h-4 w-4 inline mr-1" />
                Número de Teléfono *
              </Label>
              <Input
                id="phone_number"
                placeholder="1234567890"
                value={messageData.phone_number}
                onChange={(e) => setMessageData({ ...messageData, phone_number: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>
          </div>

          {/* API SMS Selection */}
          <div className="space-y-2">
            <Label className="text-blue-200">API SMS *</Label>
            <Select value={messageData.selected_api} onValueChange={(value) => setMessageData({ ...messageData, selected_api: value })}>
              <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                <SelectValue placeholder="Seleccionar API de mensajería" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-blue-500/20 z-50">
                {smsApis.map((api, index) => (
                  <SelectItem key={index} value={api.name} className="text-white hover:bg-slate-800">
                    {api.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translation Template Selector */}
          <div className="space-y-2">
            <Label className="text-blue-200">TRADUCCIÓN DE PLANTILLA</Label>
            <Select value="Español" onValueChange={() => {}}>
              <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-blue-500/20 z-50">
                <SelectItem value="Español" className="text-white hover:bg-slate-800">
                  Español
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plantillas */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-blue-200">
                <FileText className="h-4 w-4 inline mr-1" />
                Plantillas Guardadas
              </Label>
              <Select value={messageData.selected_template} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccione una plantilla" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20 z-50">
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white hover:bg-slate-800">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message_text" className="text-blue-200">
              Mensaje *
            </Label>
            <Textarea
              id="message_text"
              placeholder="Escriba su mensaje o seleccione una plantilla"
              value={messageData.message_text}
              onChange={(e) => setMessageData({ ...messageData, message_text: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 min-h-[120px]"
              rows={5}
            />
            <div className="text-right text-sm text-blue-200/70">
              {messageData.message_text.length}/160
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSendSms}
              disabled={isLoading}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Enviando...' : 'Enviar SMS'}
            </Button>
            
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-red-500/30 text-red-300 hover:bg-red-600/10"
            >
              Atrás
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSender;
