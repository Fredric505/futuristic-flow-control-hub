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
import { Send, MessageSquare, ArrowLeft, Eye } from 'lucide-react';
import SmsPreview from '@/components/SmsPreview';

interface MessageTemplate { id: string; name: string; template_content: string; language: string; }
interface Process { id: string; client_name: string; country_code: string; phone_number: string; iphone_model: string; storage: string; color: string; imei: string; serial_number: string; url: string | null; owner_name: string | null; }
interface SmsDialogProps { isOpen: boolean; onClose: () => void; process: Process | null; }

const MAX_SMS_LENGTH = 158;

const SmsDialog: React.FC<SmsDialogProps> = ({ isOpen, onClose, process }) => {
  const [selectedSender, setSelectedSender] = useState<SmsSender | null>(null);
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');

  useEffect(() => { if (isOpen) { loadTemplates(); setStep('edit'); } }, [isOpen]);
  useEffect(() => { if (process) { setSelectedTemplateId(''); setMessage(''); setSelectedSender(null); } }, [process?.id]);

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
      .replace(/\{iphone_model\}/gi, process.iphone_model || '').replace(/\{\{model\}\}/gi, process.iphone_model || '').replace(/%model%/gi, process.iphone_model || '')
      .replace(/\{url\}/gi, process.url || '').replace(/\{\{url\}\}/gi, process.url || '').replace(/%url%/gi, process.url || '')
      .replace(/\{date\}/gi, dateStr).replace(/\{\{date\}\}/gi, dateStr).replace(/%date%/gi, dateStr)
      .replace(/\{time\}/gi, timeStr).replace(/\{\{time\}\}/gi, timeStr).replace(/%time%/gi, timeStr)
      .replace(/\{imei\}/gi, process.imei || '').replace(/\{\{imei\}\}/gi, process.imei || '').replace(/%imei%/gi, process.imei || '')
      .replace(/\{serial\}/gi, process.serial_number || '').replace(/\{serial_number\}/gi, process.serial_number || '')
      .replace(/\{\{serial\}\}/gi, process.serial_number || '').replace(/%serial%/gi, process.serial_number || '');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) setMessage(replaceVariables(template.template_content));
  };

  const previewMessage = replaceVariables(message);
  const charCount = previewMessage.length;
  const isOverLimit = charCount > MAX_SMS_LENGTH;

  const handleSendSms = async () => {
    if (!process || !selectedSender || !message.trim()) return;
    if (isOverLimit) { toast({ title: "Error", description: `Excede ${MAX_SMS_LENGTH} caracteres`, variant: "destructive" }); return; }
    setLoading(true);
    try {
      const fullNumber = `${process.country_code}${process.phone_number}`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" }); return; }

      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
      if (!profile || profile.credits < 1) { toast({ title: "Sin créditos", description: "No tienes créditos suficientes", variant: "destructive" }); return; }

      const response = await fetch('https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ number: fullNumber, message: previewMessage, api_id: selectedSender.api_id, sender_id: selectedSender.sender_id }),
      });

      const result = await response.json();
      if (result.success) {
        await supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', session.user.id);
        toast({ title: "✅ SMS Enviado", description: `Mensaje enviado a +${fullNumber}. Se descontó 1 crédito.` });
        onClose();
      } else {
        toast({ title: "Error", description: result.error || "Error al enviar SMS", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al enviar SMS", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (!process) return null;

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
            <MessageSquare className="h-5 w-5 text-primary" />
            SMS Sender
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {step === 'edit' ? '1/2 Editar' : '2/2 Vista Previa'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'edit' ? (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Remitente</Label>
              <Select onValueChange={handleSenderChange}>
                <SelectTrigger className="bg-accent/50 border-border/50 h-9">
                  <SelectValue placeholder="Selecciona un sender..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {smsSenders.map((s) => (
                    <SelectItem key={s.api_id} value={s.api_id.toString()}>{getSenderLabel(s)}</SelectItem>
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
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground text-sm">Mensaje</Label>
                <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>{charCount}/{MAX_SMS_LENGTH}</span>
              </div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Selecciona una plantilla o escribe manualmente"
                className={`bg-accent/50 border-border/50 min-h-[60px] text-sm ${isOverLimit ? 'border-destructive' : ''}`} />
              {isOverLimit && <p className="text-destructive text-xs">Excede el límite de {MAX_SMS_LENGTH} caracteres</p>}
            </div>

            <div className="bg-accent/30 rounded-lg p-2 text-xs text-muted-foreground">
              <p><strong>Cliente:</strong> {process.client_name} | <strong>Modelo:</strong> {process.iphone_model}</p>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
              <Button type="button" onClick={() => setStep('preview')}
                disabled={!selectedSender || !message.trim() || isOverLimit}
                className="gold-gradient text-primary-foreground h-9 glow-gold hover:opacity-90">
                <Eye className="mr-2 h-4 w-4" /> Vista Previa
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Así se verá el SMS que recibirá <strong className="text-foreground">+{process.country_code}{process.phone_number}</strong>
            </p>

            <SmsPreview
              message={previewMessage}
              senderName={selectedSender?.sender_id || 'SMS'}
              isOverLimit={isOverLimit}
            />

            <div className="flex gap-2 justify-between pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setStep('edit')} className="h-9">
                <ArrowLeft className="mr-2 h-4 w-4" /> Editar
              </Button>
              <Button type="button" onClick={handleSendSms} disabled={loading}
                className="gold-gradient text-primary-foreground h-9 glow-gold hover:opacity-90">
                {loading ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar (1 crédito)</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SmsDialog;
