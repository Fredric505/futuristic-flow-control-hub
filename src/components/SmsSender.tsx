import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { smsSenders, getSenderLabel, SmsSender } from '@/utils/smsSenders';
import { Send, MessageSquare, Phone, FileText } from 'lucide-react';

interface MessageTemplate {
  id: string;
  name: string;
  template_content: string;
  language: string;
}

const SmsSenderComponent = () => {
  const [selectedSender, setSelectedSender] = useState<SmsSender | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Variables for preview
  const [model, setModel] = useState('iPhone 15 Pro Max');
  const [url, setUrl] = useState('https://example.com/location');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSenderChange = (apiId: string) => {
    const sender = smsSenders.find(s => s.api_id === parseInt(apiId));
    setSelectedSender(sender || null);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.template_content);
    }
  };

  const replaceVariables = (text: string): string => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' GMT';

    return text
      .replace(/\{\{model\}\}/gi, model)
      .replace(/%model%/gi, model)
      .replace(/\{\{url\}\}/gi, url)
      .replace(/%url%/gi, url)
      .replace(/\{\{date\}\}/gi, dateStr)
      .replace(/%date%/gi, dateStr)
      .replace(/\{\{time\}\}/gi, timeStr)
      .replace(/%time%/gi, timeStr)
      .replace(/\{\{imei\}\}/gi, '')
      .replace(/%imei%/gi, '')
      .replace(/\{\{serial\}\}/gi, '')
      .replace(/%serial%/gi, '');
  };

  const getPreviewMessage = (): string => {
    return replaceVariables(message);
  };

  const handleSendSms = async () => {
    if (!selectedSender) {
      toast({
        title: "Error",
        description: "Por favor selecciona un sender",
        variant: "destructive",
      });
      return;
    }

    if (!countryCode || !phoneNumber) {
      toast({
        title: "Error",
        description: "Por favor ingresa el código de país y número de teléfono",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un mensaje",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const fullNumber = `${countryCode}${phoneNumber}`;
      const finalMessage = replaceVariables(message);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "No hay sesión activa",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        'https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/send-sms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            number: fullNumber,
            message: finalMessage,
            api_id: selectedSender.api_id,
            sender_id: selectedSender.sender_id,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ SMS Enviado",
          description: `Mensaje enviado exitosamente a ${fullNumber}`,
        });
        // Clear form
        setPhoneNumber('');
        setMessage('');
        setSelectedTemplateId('');
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al enviar SMS",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: error.message || "Error al enviar SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SMS Sender Selection */}
      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            📱 SMS Sender - Senders Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-orange-200">Seleccionar Sender (País/Operadora)</Label>
            <Select onValueChange={handleSenderChange}>
              <SelectTrigger className="bg-white/5 border-orange-500/30 text-white">
                <SelectValue placeholder="Selecciona un sender..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {smsSenders.map((sender) => (
                  <SelectItem key={sender.api_id} value={sender.api_id.toString()}>
                    {getSenderLabel(sender)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSender && (
              <p className="text-orange-200/60 text-sm">
                API ID: {selectedSender.api_id} | Sender ID: {selectedSender.sender_id} | País: {selectedSender.country}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phone Number */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            📞 Número de Teléfono
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-blue-200">Código País</Label>
              <Input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                placeholder="51"
                className="bg-white/5 border-blue-500/30 text-white"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-blue-200">Número de Teléfono</Label>
              <Input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="999888777"
                className="bg-white/5 border-blue-500/30 text-white"
              />
            </div>
          </div>
          {countryCode && phoneNumber && (
            <p className="text-blue-200/60 text-sm">
              Número completo: +{countryCode}{phoneNumber}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Message Template & Content */}
      <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-300 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ✉️ Mensaje SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label className="text-green-200">Plantilla (Opcional)</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-white/5 border-green-500/30 text-white">
                <SelectValue placeholder="Selecciona una plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {loadingTemplates ? (
                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                ) : templates.length === 0 ? (
                  <SelectItem value="none" disabled>No hay plantillas</SelectItem>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.language === 'es' ? '🇪🇸' : '🇺🇸'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Variables for Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-green-200">Modelo (para variable)</Label>
              <Input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="iPhone 15 Pro Max"
                className="bg-white/5 border-green-500/30 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-green-200">URL (para variable)</Label>
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white/5 border-green-500/30 text-white"
              />
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <Label className="text-green-200">Contenido del Mensaje</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí... Usa {{model}}, {{url}}, {{date}}, {{time}} como variables"
              className="bg-white/5 border-green-500/30 text-white min-h-[100px]"
            />
            <p className="text-green-200/60 text-xs">
              Variables disponibles: {'{{model}}'}, {'{{url}}'}, {'{{date}}'}, {'{{time}}'}, {'{{imei}}'}, {'{{serial}}'}
            </p>
          </div>

          {/* Preview */}
          {message && (
            <div className="space-y-2">
              <Label className="text-green-200">Vista Previa del Mensaje</Label>
              <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
                <p className="text-green-200 whitespace-pre-wrap">{getPreviewMessage()}</p>
              </div>
              <p className="text-green-200/60 text-xs">
                Caracteres: {getPreviewMessage().length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <Button
        onClick={handleSendSms}
        disabled={loading || !selectedSender || !countryCode || !phoneNumber || !message.trim()}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-6 text-lg"
      >
        {loading ? (
          <>Enviando...</>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Enviar SMS
          </>
        )}
      </Button>

      {/* Info */}
      <Card className="bg-black/20 backdrop-blur-xl border border-yellow-500/20">
        <CardContent className="p-4">
          <p className="text-yellow-200/70 text-sm">
            ⚠️ <strong>Importante:</strong> Asegúrate de tener configuradas las credenciales de SMS 
            (API Key y Token) en la sección de Configuraciones antes de enviar mensajes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSenderComponent;
