
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, FileText, Phone } from 'lucide-react';
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

const SmsSender = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageData, setMessageData] = useState({
    country_code: '',
    phone_number: '',
    message_text: '',
    selected_template: '',
    selected_process: ''
  });

  useEffect(() => {
    loadTemplates();
    loadProcesses();
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessageData({
        ...messageData,
        selected_template: templateId,
        message_text: template.message_text
      });
    }
  };

  const handleProcessSelect = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (process) {
      // Generar la URL completa del subdominio
      const subdomainUrl = `https://${process.color}.${process.assigned_domain}`;
      
      // Agregar la URL al mensaje actual
      const updatedMessage = messageData.message_text + `\n\n${subdomainUrl}`;
      
      setMessageData({
        ...messageData,
        selected_process: processId,
        message_text: updatedMessage
      });

      toast({
        title: "URL agregada",
        description: `Se agregó la URL del subdominio: ${subdomainUrl}`
      });
    }
  };

  const handleSendSms = async () => {
    if (!messageData.country_code || !messageData.phone_number || !messageData.message_text) {
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

      // Guardar en la tabla messages
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          recipient_phone: `${messageData.country_code}${messageData.phone_number}`,
          message_content: messageData.message_text,
          status: 'sent'
        });

      if (error) throw error;

      toast({
        title: "SMS enviado",
        description: "El mensaje se ha enviado correctamente"
      });

      // Limpiar formulario
      setMessageData({
        country_code: '',
        phone_number: '',
        message_text: '',
        selected_template: '',
        selected_process: ''
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

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Enviar SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de plantillas */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-blue-200">
                <FileText className="h-4 w-4 inline mr-1" />
                Seleccionar Plantilla (Opcional)
              </Label>
              <Select value={messageData.selected_template} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar plantilla guardada" />
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

          {/* Selector de procesos para agregar URL */}
          {processes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-blue-200">
                Agregar URL de Proceso (Opcional)
              </Label>
              <Select value={messageData.selected_process} onValueChange={handleProcessSelect}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                  <SelectValue placeholder="Seleccionar proceso para agregar URL" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-blue-500/20 z-50">
                  {processes.map((process) => (
                    <SelectItem key={process.id} value={process.id} className="text-white hover:bg-slate-800">
                      {process.client_name} - {process.color}.{process.assigned_domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="message_text" className="text-blue-200">
              Mensaje *
            </Label>
            <Textarea
              id="message_text"
              placeholder="Escribe tu mensaje aquí..."
              value={messageData.message_text}
              onChange={(e) => setMessageData({ ...messageData, message_text: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 min-h-[120px]"
              rows={5}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSendSms}
              disabled={isLoading}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Enviando...' : 'Enviar SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSender;
