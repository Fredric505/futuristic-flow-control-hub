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
 import { Send, MessageSquare, X } from 'lucide-react';
 
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
     if (isOpen) {
       loadTemplates();
     }
   }, [isOpen]);
 
   // Reset when process changes
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
     // Support {iphone_model} format (single braces)
     .replace(/\{iphone_model\}/gi, process.iphone_model || '')
     // Support {{model}} format (double braces)
       .replace(/\{\{model\}\}/gi, process.iphone_model || '')
     // Support %model% format
       .replace(/%model%/gi, process.iphone_model || '')
     // Support {url} format (single braces)
     .replace(/\{url\}/gi, process.url || '')
     // Support {{url}} format (double braces)
       .replace(/\{\{url\}\}/gi, process.url || '')
     // Support %url% format
       .replace(/%url%/gi, process.url || '')
     // Date variables
     .replace(/\{date\}/gi, dateStr)
       .replace(/\{\{date\}\}/gi, dateStr)
       .replace(/%date%/gi, dateStr)
     // Time variables
     .replace(/\{time\}/gi, timeStr)
       .replace(/\{\{time\}\}/gi, timeStr)
       .replace(/%time%/gi, timeStr)
     // IMEI variables
     .replace(/\{imei\}/gi, process.imei || '')
       .replace(/\{\{imei\}\}/gi, process.imei || '')
       .replace(/%imei%/gi, process.imei || '')
     // Serial variables
     .replace(/\{serial\}/gi, process.serial_number || '')
     .replace(/\{serial_number\}/gi, process.serial_number || '')
       .replace(/\{\{serial\}\}/gi, process.serial_number || '')
       .replace(/%serial%/gi, process.serial_number || '');
   };
 
   const handleTemplateChange = (templateId: string) => {
     setSelectedTemplateId(templateId);
     const template = templates.find(t => t.id === templateId);
     if (template) {
       // Auto-replace variables with process data
       const processedMessage = replaceVariables(template.template_content);
       setMessage(processedMessage);
     }
   };
 
   const getPreviewMessage = (): string => {
     return replaceVariables(message);
   };
 
   const handleSendSms = async () => {
     if (!process) return;
     
     if (!selectedSender) {
       toast({
         title: "Error",
         description: "Por favor selecciona un remitente",
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
 
     const finalMessage = getPreviewMessage();
     if (finalMessage.length > MAX_SMS_LENGTH) {
       toast({
         title: "Error",
         description: `El mensaje excede el límite de ${MAX_SMS_LENGTH} caracteres`,
         variant: "destructive",
       });
       return;
     }
 
     setLoading(true);
 
     try {
       const fullNumber = `${process.country_code}${process.phone_number}`;
 
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
           description: `Mensaje enviado a +${fullNumber}`,
         });
         onClose();
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
 
   if (!process) return null;
 
    const previewMessage = replaceVariables(message);
    const charCount = previewMessage.length;
    const isOverLimit = charCount > MAX_SMS_LENGTH;
 
   return (
     <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="sm:max-w-[500px] bg-slate-900 border-cyan-500/30 text-white">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2 text-cyan-300">
             <MessageSquare className="h-5 w-5" />
             SMS Sender
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           {/* Sender Selection */}
           <div className="space-y-2">
             <Label className="text-cyan-200">Seleccione un remitente</Label>
             <Select onValueChange={handleSenderChange}>
               <SelectTrigger className="bg-white/5 border-cyan-500/30 text-white">
                 <SelectValue placeholder="Selecciona un sender..." />
               </SelectTrigger>
               <SelectContent className="max-h-[300px] bg-slate-800 border-cyan-500/30">
                 {smsSenders.map((sender) => (
                   <SelectItem 
                     key={sender.api_id} 
                     value={sender.api_id.toString()}
                     className="text-white hover:bg-cyan-600/20"
                   >
                     {getSenderLabel(sender)}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Phone Number Display */}
           <div className="grid grid-cols-4 gap-2">
             <div className="space-y-2">
               <Label className="text-cyan-200 text-sm">Código</Label>
               <Input
                 type="text"
                 value={process.country_code}
                 disabled
                 className="bg-white/5 border-cyan-500/30 text-white/70"
               />
             </div>
             <div className="col-span-3 space-y-2">
               <Label className="text-cyan-200 text-sm">Número</Label>
               <Input
                 type="text"
                 value={process.phone_number}
                 disabled
                 className="bg-white/5 border-cyan-500/30 text-white/70"
               />
             </div>
           </div>
 
           {/* Template Selector */}
           <div className="space-y-2">
             <Label className="text-cyan-200">Seleccione una plantilla</Label>
             <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
               <SelectTrigger className="bg-white/5 border-cyan-500/30 text-white">
                 <SelectValue placeholder="Selecciona una plantilla..." />
               </SelectTrigger>
               <SelectContent className="bg-slate-800 border-cyan-500/30">
                 {loadingTemplates ? (
                   <SelectItem value="loading" disabled className="text-white/50">Cargando...</SelectItem>
                 ) : templates.length === 0 ? (
                   <SelectItem value="none" disabled className="text-white/50">No hay plantillas</SelectItem>
                 ) : (
                   templates.map((template) => (
                     <SelectItem 
                       key={template.id} 
                       value={template.id}
                       className="text-white hover:bg-cyan-600/20"
                     >
                       {template.name} ({template.language === 'es' ? '🇪🇸' : '🇺🇸'})
                     </SelectItem>
                   ))
                 )}
               </SelectContent>
             </Select>
           </div>
 
            {/* Message Editor */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-cyan-200">Mensaje</Label>
                <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-cyan-200/60'}`}>
                  {charCount}/{MAX_SMS_LENGTH}
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Selecciona una plantilla o escribe el mensaje manualmente"
                className={`bg-white/5 border-cyan-500/30 text-white min-h-[80px] ${isOverLimit ? 'border-red-500' : ''}`}
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-cyan-200 text-sm">Vista Previa (así se enviará)</Label>
              <div className={`bg-white/10 rounded-lg p-3 text-sm text-white/90 min-h-[60px] ${isOverLimit ? 'border border-red-500' : 'border border-cyan-500/20'}`}>
                {previewMessage || <span className="text-white/40 italic">El mensaje aparecerá aquí...</span>}
              </div>
              {isOverLimit && (
                <p className="text-red-400 text-xs">
                  El mensaje excede el límite de {MAX_SMS_LENGTH} caracteres
                </p>
              )}
            </div>
 
           {/* Process Info */}
           <div className="bg-white/5 rounded-lg p-3 text-xs text-cyan-200/60">
             <p><strong>Cliente:</strong> {process.client_name}</p>
             <p><strong>Modelo:</strong> {process.iphone_model}</p>
             <p><strong>URL:</strong> {process.url || 'No especificada'}</p>
           </div>
         </div>
 
         <div className="flex gap-2 justify-end">
           <Button
             variant="outline"
             onClick={onClose}
             className="bg-transparent border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/20"
           >
             Cerrar
           </Button>
           <Button
             onClick={handleSendSms}
             disabled={loading || !selectedSender || !message.trim() || isOverLimit}
             className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
           >
             {loading ? (
               'Enviando...'
             ) : (
               <>
                 <Send className="mr-2 h-4 w-4" />
                 Enviar mensaje
               </>
             )}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default SmsDialog;