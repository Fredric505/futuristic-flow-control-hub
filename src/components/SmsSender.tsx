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
      toast({ title: "Error", description: "Por favor selecciona un sender", variant: "destructive" });
      return;
    }
    if (!countryCode || !phoneNumber) {
      toast({ title: "Error", description: "Por favor ingresa el código de país y número de teléfono", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Error", description: "Por favor ingresa un mensaje", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const fullNumber = `${countryCode}${phoneNumber}`;
      const finalMessage = replaceVariables(message);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" });
        return;
      }

      // Check credits before sending
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.credits < 1) {
        toast({ title: "Sin créditos", description: "No tienes créditos suficientes para enviar SMS", variant: "destructive" });
        setLoading(false);
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
        // Deduct 1 credit
        await supabase
          .from('profiles')
          .update({ credits: profile.credits - 1 })
          .eq('id', session.user.id);

        toast({ title: "✅ SMS Enviado", description: `Mensaje enviado a ${fullNumber}. Se descontó 1 crédito.` });
        setPhoneNumber('');
        setMessage('');
        setSelectedTemplateId('');
      } else {
        toast({ title: "Error", description: result.error || "Error al enviar SMS", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({ title: "Error", description: error.message || "Error al enviar SMS", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            SMS Sender - Senders Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Seleccionar Sender (País/Operadora)</Label>
            <Select onValueChange={handleSenderChange}>
              <SelectTrigger className="bg-accent/50 border-border/50">
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
              <p className="text-muted-foreground text-xs">
                API ID: {selectedSender.api_id} | Sender ID: {selectedSender.sender_id} | País: {selectedSender.country}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-info" />
            Número de Teléfono
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Código País</Label>
              <Input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                placeholder="51"
                className="bg-accent/50 border-border/50"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-muted-foreground text-sm">Número de Teléfono</Label>
              <Input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="999888777"
                className="bg-accent/50 border-border/50"
              />
            </div>
          </div>
          {countryCode && phoneNumber && (
            <p className="text-muted-foreground text-xs">
              Número completo: +{countryCode}{phoneNumber}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-success" />
            Mensaje SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Plantilla (Opcional)</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-accent/50 border-border/50">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Modelo (variable)</Label>
              <Input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="iPhone 15 Pro Max" className="bg-accent/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">URL (variable)</Label>
              <Input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="bg-accent/50 border-border/50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Contenido del Mensaje</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="bg-accent/50 border-border/50 min-h-[100px]"
            />
            <p className="text-muted-foreground text-xs">
              Variables: {'{{model}}'}, {'{{url}}'}, {'{{date}}'}, {'{{time}}'}, {'{{imei}}'}, {'{{serial}}'}
            </p>
          </div>

          {message && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Vista Previa</Label>
              <div className="p-4 bg-accent/30 rounded-xl border border-border/50">
                <p className="text-foreground whitespace-pre-wrap text-sm">{getPreviewMessage()}</p>
              </div>
              <p className="text-muted-foreground text-xs">Caracteres: {getPreviewMessage().length}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSendSms}
        disabled={loading || !selectedSender || !countryCode || !phoneNumber || !message.trim()}
        className="w-full gold-gradient text-primary-foreground py-6 text-lg font-bold glow-gold hover:opacity-90 transition-all"
      >
        {loading ? 'Enviando...' : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Enviar SMS (1 crédito)
          </>
        )}
      </Button>

      <Card className="glass-card">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">
            ⚠️ <strong>Importante:</strong> Cada SMS enviado consume 1 crédito. Asegúrate de tener créditos disponibles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSenderComponent;
