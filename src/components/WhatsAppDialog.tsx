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
import { Send, MessageCircle } from 'lucide-react';

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

interface WhatsAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
}

const WhatsAppDialog: React.FC<WhatsAppDialogProps> = ({ isOpen, onClose, process }) => {
  const [message, setMessage] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savedButtonNames, setSavedButtonNames] = useState({ es: 'Ver ubicación', en: 'View location' });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadButtonNames();
    }
  }, [isOpen]);

  useEffect(() => {
    if (process) {
      setSelectedTemplateId('');
      setMessage('');
      setButtonUrl(process.url || '');
      // Set button text based on saved names
      setButtonText(savedButtonNames.es);
    }
  }, [process?.id]);

  const loadButtonNames = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whapi_button_title_es', 'whapi_button_title_en']);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(s => { map[s.setting_key] = s.setting_value || ''; });
        setSavedButtonNames({
          es: map['whapi_button_title_es'] || 'Ver ubicación',
          en: map['whapi_button_title_en'] || 'View location',
        });
        if (!buttonText) {
          setButtonText(map['whapi_button_title_es'] || 'Ver ubicación');
        }
      }
    } catch (error) {
      console.error('Error loading button names:', error);
    }
  };

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

  const handleSendWhatsApp = async () => {
    if (!process) return;
    if (!message.trim()) {
      toast({ title: "Error", description: "Por favor ingresa un mensaje", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const fullNumber = `${process.country_code}${process.phone_number}`;
      const finalMessage = replaceVariables(message);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Check credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.credits < 1) {
        toast({ title: "Sin créditos", description: "No tienes créditos suficientes", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Strip URL from message text when sending with button (URL is in the button)
      let finalMessageClean = finalMessage;
      if (buttonText && buttonUrl) {
        // Remove URL patterns from the message body since the URL is in the interactive button
        finalMessageClean = finalMessage
          .replace(/https?:\/\/[^\s]+/gi, '')
          .replace(/Consulta aqui:\s*/gi, '')
          .replace(/Ver estado del dispositivo:\s*/gi, '')
          .replace(/View device status:\s*/gi, '')
          .replace(/🌍\s*/g, '')
          .replace(/\n\n\n+/g, '\n\n')
          .trim();
      }

      const response = await fetch(
        `https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/send-whapi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            number: fullNumber,
            message: finalMessageClean,
            button_text: buttonText && buttonUrl ? buttonText : undefined,
            button_url: buttonText && buttonUrl ? buttonUrl : undefined,
            language: 'spanish',
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

        toast({ title: "✅ WhatsApp Enviado", description: `Mensaje enviado a +${fullNumber}. Se descontó 1 crédito.` });
        onClose();
      } else {
        toast({ title: "Error", description: result.error || "Error al enviar WhatsApp", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      toast({ title: "Error", description: error.message || "Error al enviar WhatsApp", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!process) return null;

  const previewMessage = replaceVariables(message);

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
            <MessageCircle className="h-5 w-5 text-success" />
            WhatsApp Sender (Whapi)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
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
            <Label className="text-muted-foreground text-sm">Mensaje</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Selecciona una plantilla o escribe el mensaje manualmente"
              className="bg-accent/50 border-border/50 min-h-[60px] text-sm"
            />
          </div>

          {/* Button configuration */}
          <div className="space-y-2 p-3 rounded-lg bg-success/5 border border-success/20">
            <Label className="text-success text-sm font-semibold">🔘 Botón Interactivo</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Texto del botón</Label>
                <Input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Ver ubicación"
                  className="bg-accent/50 border-border/50 h-8 text-sm"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">URL del botón</Label>
                <Input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-accent/50 border-border/50 h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-[10px]">El botón aparecerá debajo del mensaje como en la imagen de referencia. Máx 20 caracteres.</p>
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Vista Previa</Label>
            <div className="bg-[#1a2e1a] rounded-lg overflow-hidden border border-success/20">
              <div className="p-3 text-sm text-foreground/90 min-h-[40px]">
                {previewMessage || <span className="text-muted-foreground italic">El mensaje aparecerá aquí...</span>}
              </div>
              {buttonText && buttonUrl && (
                <div className="border-t border-success/20 p-2 flex items-center justify-center gap-2 text-success text-sm">
                  <span>↗</span>
                  <span>{buttonText}</span>
                </div>
              )}
            </div>
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendWhatsApp(); }}
            disabled={loading || !message.trim()}
            className="bg-success hover:bg-success/90 text-primary-foreground h-9"
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

export default WhatsAppDialog;
