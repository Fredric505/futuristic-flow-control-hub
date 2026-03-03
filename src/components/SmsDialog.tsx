import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { smsSenders, getSenderLabel, SmsSender } from '@/utils/smsSenders';
import { Send, MessageSquare } from 'lucide-react';

interface MessageTemplate {
  id: string;
  name: string;
  template_content: string;
  language: string;
}

interface Process {
  id: string;
  client_name: string;
  country_code: string;
  phone_number: string;
  iphone_model: string;
  storage: string;
  color: string;
  imei: string;
  serial_number: string;
  url: string | null;
  owner_name: string | null;
}

interface SmsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

const MAX_SMS_LENGTH = 158;

const SmsDialog: React.FC<SmsDialogProps> = ({ isOpen, onClose, process }) => {
  const [selectedSender, setSelectedSender] = useState<SmsSender | null>(null);
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (isOpen) loadTemplates();
  }, [isOpen]);

  useEffect(() => {
    if (process) {
      setSelectedTemplateId('');
      setMessage('');
      setSelectedSender(null);
    }
  }, [process?.id]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
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

  const replaceVariables = (text: string): string => {
    if (!process) return text;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' GMT';
    return text
      .replace(/\{iphone_model\}/gi, process.iphone_model || '')
      .replace(/\{\{model\}\}/gi, process.iphone_model || '')
      .replace(/%model%/gi, process.iphone_model || '')
      .replace(/\{url\}/gi, process.url || '')
      .replace(/\{\{url\}\}/gi, process.url || '')
      .replace(/%url%/gi, process.url || '')
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{\{date\}\}/gi, dateStr)
      .replace(/%date%/gi, dateStr)
      .replace(/\{time\}/gi, timeStr)
      .replace(/\{\{time\}\}/gi, timeStr)
      .replace(/%time%/gi, timeStr)
      .replace(/\{imei\}/gi, process.imei || '')
      .replace(/\{\{imei\}\}/gi, process.imei || '')
      .replace(/%imei%/gi, process.imei || '')
      .replace(/\{serial\}/gi, process.serial_number || '')
      .replace(/\{serial_number\}/gi, process.serial_number || '')
      .replace(/\{\{serial\}\}/gi, process.serial_number || '')
      .replace(/%serial%/gi, process.serial_number || '');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const processedMessage = replaceVariables(template.template_content);
      setMessage(processedMessage);
    }
  };

  const getPreviewMessage = (): string => replaceVariables(message);

  const handleSendSms = async () => {
    if (!process) return;
    if (!selectedSender) {
      toast({ title: "Error", description: "Por favor selecciona un remitente", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Error", description: "Por favor ingresa un mensaje", variant: "destructive" });
      return;
    }
    const finalMessage = getPreviewMessage();
    if (finalMessage.length > MAX_SMS_LENGTH) {
      toast({ title: "Error", description: `El mensaje excede el límite de ${MAX_SMS_LENGTH} caracteres`, variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const fullNumber = `${process.country_code}${process.phone_number}`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" });
        return;
      }

      // Check credits
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

        toast({ title: "✅ SMS Enviado", description: `Mensaje enviado a +${fullNumber}. Se descontó 1 crédito.` });
        onClose();
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

  if (!process) return null;

  const previewMessage = replaceVariables(message);
  const charCount = previewMessage.length;
  const isOverLimit = charCount > MAX_SMS_LENGTH;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto glass-card border-border/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            SMS Sender
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Seleccione un remitente</Label>
            <Select onValueChange={handleSenderChange}>
              <SelectTrigger className="bg-accent/50 border-border/50 h-9">
                <SelectValue placeholder="Selecciona un sender..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {smsSenders.map((sender) => (
                  <SelectItem key={sender.api_id} value={sender.api_id.toString()}>
                    {getSenderLabel(sender)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Código</Label>
              <Input type="text" value={process.country_code} disabled className="bg-accent/50 border-border/50 h-8 text-sm" />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-muted-foreground text-xs">Número</Label>
              <Input type="text" value={process.phone_number} disabled className="bg-accent/50 border-border/50 h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Seleccione una plantilla</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-accent/50 border-border/50 h-9">
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground text-sm">Mensaje</Label>
              <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charCount}/{MAX_SMS_LENGTH}
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Selecciona una plantilla o escribe el mensaje manualmente"
              className={`bg-accent/50 border-border/50 min-h-[60px] text-sm ${isOverLimit ? 'border-destructive' : ''}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Vista Previa</Label>
            <div className={`bg-accent/30 rounded-lg p-2 text-xs text-foreground/90 min-h-[40px] border ${isOverLimit ? 'border-destructive' : 'border-border/50'}`}>
              {previewMessage || <span className="text-muted-foreground italic">El mensaje aparecerá aquí...</span>}
            </div>
            {isOverLimit && (
              <p className="text-destructive text-xs">Excede el límite de {MAX_SMS_LENGTH} caracteres</p>
            )}
          </div>

          <div className="bg-accent/30 rounded-lg p-2 text-xs text-muted-foreground">
            <p><strong>Cliente:</strong> {process.client_name} | <strong>Modelo:</strong> {process.iphone_model}</p>
            <p className="truncate"><strong>URL:</strong> {process.url || 'No especificada'}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="h-9"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendSms(); }}
            disabled={loading || !selectedSender || !message.trim() || isOverLimit}
            className="gold-gradient text-primary-foreground h-9 glow-gold hover:opacity-90"
          >
            {loading ? 'Enviando...' : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar (1 crédito)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmsDialog;
