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
import { Send, MessageCircle, ArrowLeft, Eye, Pencil } from 'lucide-react';
import WhatsAppPreview from '@/components/WhatsAppPreview';

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
  const [step, setStep] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadButtonNames();
      setStep('edit');
    }
  }, [isOpen]);

  useEffect(() => {
    if (process) {
      setSelectedTemplateId('');
      setMessage('');
      setButtonUrl(process.url || '');
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
        if (!buttonText) setButtonText(map['whapi_button_title_es'] || 'Ver ubicación');
      }
    } catch (error) { console.error('Error loading button names:', error); }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('message_templates').select('*').eq('user_id', user.id).order('name');
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) { console.error('Error loading templates:', error); }
    finally { setLoadingTemplates(false); }
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

  const getDetectedLanguage = (): string => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) return template.language === 'english' || template.language === 'en' ? 'english' : 'spanish';
    const englishWords = ['your', 'device', 'was', 'detected', 'location', 'the', 'has', 'been'];
    const lowerMsg = message.toLowerCase();
    return englishWords.filter(w => lowerMsg.includes(w)).length >= 3 ? 'english' : 'spanish';
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(replaceVariables(template.template_content));
      const lang = template.language === 'english' || template.language === 'en' ? 'en' : 'es';
      setButtonText(savedButtonNames[lang]);
    }
  };

  const getCleanMessage = () => {
    const finalMessage = replaceVariables(message);
    if (buttonText && buttonUrl) {
      return finalMessage
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/Consulta aqui:\s*/gi, '')
        .replace(/Ver estado del dispositivo:\s*/gi, '')
        .replace(/View device status:\s*/gi, '')
        .replace(/🌍\s*/g, '')
        .replace(/\n\n\n+/g, '\n\n')
        .trim();
    }
    return finalMessage;
  };

  const handleSendWhatsApp = async () => {
    if (!process || !message.trim()) return;
    setLoading(true);
    try {
      const fullNumber = `${process.country_code}${process.phone_number}`;
      const finalMessageClean = getCleanMessage();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" }); return; }

      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
      if (!profile || profile.credits < 1) { toast({ title: "Sin créditos", description: "No tienes créditos suficientes", variant: "destructive" }); return; }

      const response = await fetch('https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/send-whapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          number: fullNumber, message: finalMessageClean,
          button_text: buttonText && buttonUrl ? buttonText : undefined,
          button_url: buttonText && buttonUrl ? buttonUrl : undefined,
          language: getDetectedLanguage(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        await supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', session.user.id);
        toast({ title: "✅ WhatsApp Enviado", description: `Mensaje enviado a +${fullNumber}. Se descontó 1 crédito.` });
        onClose();
      } else {
        toast({ title: "Error", description: result.error || "Error al enviar", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al enviar", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (!process) return null;

  const previewMessage = getCleanMessage();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto glass-card border-border/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5 text-success" />
            WhatsApp Sender
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {step === 'edit' ? '1/2 Editar' : '2/2 Vista Previa'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'edit' ? (
          /* ── STEP 1: EDIT ── */
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
              <Label className="text-muted-foreground text-sm">Plantilla</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="bg-accent/50 border-border/50 h-9">
                  <SelectValue placeholder="Selecciona una plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingTemplates ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : templates.length === 0 ? (
                    <SelectItem value="none" disabled>No hay plantillas</SelectItem>
                  ) : templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.language === 'es' ? '🇪🇸' : '🇺🇸'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Mensaje</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Selecciona una plantilla o escribe manualmente"
                className="bg-accent/50 border-border/50 min-h-[80px] text-sm" />
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-success/5 border border-success/20">
              <Label className="text-success text-sm font-semibold">🔘 Botón Interactivo</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Texto</Label>
                  <Input type="text" value={buttonText} onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Ver ubicación" className="bg-accent/50 border-border/50 h-8 text-sm" maxLength={20} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">URL</Label>
                  <Input type="text" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://..." className="bg-accent/50 border-border/50 h-8 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-2 text-xs text-muted-foreground">
              <p><strong>Cliente:</strong> {process.client_name} | <strong>Modelo:</strong> {process.iphone_model}</p>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
              <Button type="button" onClick={() => setStep('preview')} disabled={!message.trim()}
                className="bg-success hover:bg-success/90 text-primary-foreground h-9">
                <Eye className="mr-2 h-4 w-4" /> Vista Previa
              </Button>
            </div>
          </div>
        ) : (
          /* ── STEP 2: PREVIEW ── */
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Así se verá el mensaje que recibirá <strong className="text-foreground">+{process.country_code}{process.phone_number}</strong>
            </p>

            <WhatsAppPreview
              message={previewMessage}
              buttonText={buttonText && buttonUrl ? buttonText : undefined}
              buttonUrl={buttonText && buttonUrl ? buttonUrl : undefined}
              contactName={process.owner_name || process.client_name || 'iPhone Support'}
            />

            <div className="flex gap-2 justify-between pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setStep('edit')} className="h-9">
                <ArrowLeft className="mr-2 h-4 w-4" /> Editar
              </Button>
              <Button type="button" onClick={handleSendWhatsApp} disabled={loading}
                className="bg-success hover:bg-success/90 text-primary-foreground h-9">
                {loading ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar (1 crédito)</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppDialog;
