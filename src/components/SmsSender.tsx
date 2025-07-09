
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageSquare, User } from 'lucide-react';

const SmsSender = () => {
  const { toast } = useToast();
  const [smsData, setSmsData] = useState({
    recipient_phone: '',
    message_content: '',
    client_name: ''
  });
  const [isLoading, setSending] = useState(false);
  const [smsSettings, setSmsSettings] = useState<any>(null);

  useEffect(() => {
    loadSmsSettings();
  }, []);

  const loadSmsSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'sms_api_url',
          'sms_request_type',
          'sms_api_key',
          'sms_token'
        ]);

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSmsSettings(settingsMap);
    } catch (error) {
      console.error('Error loading SMS settings:', error);
    }
  };

  const handleSendSms = async () => {
    if (!smsData.recipient_phone || !smsData.message_content) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    if (!smsSettings?.sms_api_url) {
      toast({
        title: "Error",
        description: "No hay configuración de SMS disponible. Configura la API primero.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Registrar el mensaje en la base de datos
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          recipient_phone: smsData.recipient_phone,
          message_content: smsData.message_content,
          user_id: user.id,
          status: 'sending'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Aquí puedes implementar la lógica para enviar el SMS usando la API configurada
      // Por ahora simulamos el envío
      console.log('Enviando SMS con configuración:', smsSettings);
      console.log('Datos del mensaje:', smsData);

      // Simular el envío (esto se reemplazará con la llamada real a la API)
      setTimeout(async () => {
        try {
          // Actualizar el estado del mensaje a enviado
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', messageData.id);

          if (updateError) throw updateError;

          toast({
            title: "SMS enviado",
            description: `Mensaje enviado exitosamente a ${smsData.recipient_phone}`
          });

          // Limpiar el formulario
          setSmsData({
            recipient_phone: '',
            message_content: '',
            client_name: ''
          });
        } catch (error) {
          console.error('Error updating message status:', error);
          // Actualizar como fallido
          await supabase
            .from('messages')
            .update({ status: 'failed' })
            .eq('id', messageData.id);
        }
        setSending(false);
      }, 2000);

    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el SMS. Inténtalo de nuevo.",
        variant: "destructive"
      });
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Enviar SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="text-blue-200">
                <User className="h-4 w-4 inline mr-1" />
                Nombre del Cliente (Opcional)
              </Label>
              <Input
                id="client_name"
                placeholder="Nombre del cliente"
                value={smsData.client_name}
                onChange={(e) => setSmsData({ ...smsData, client_name: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient_phone" className="text-blue-200">
                Número de Teléfono *
              </Label>
              <Input
                id="recipient_phone"
                placeholder="+1234567890"
                value={smsData.recipient_phone}
                onChange={(e) => setSmsData({ ...smsData, recipient_phone: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_content" className="text-blue-200">
              Mensaje *
            </Label>
            <Textarea
              id="message_content"
              placeholder="Escribe tu mensaje aquí..."
              value={smsData.message_content}
              onChange={(e) => setSmsData({ ...smsData, message_content: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 min-h-[120px]"
              maxLength={1600}
              required
            />
            <div className="text-xs text-blue-200/60 text-right">
              {smsData.message_content.length}/1600 caracteres
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSendSms}
              disabled={isLoading || !smsSettings?.sms_api_url}
              className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Enviando SMS...' : 'Enviar SMS'}
            </Button>
            
            {!smsSettings?.sms_api_url && (
              <p className="text-yellow-400 text-sm mt-2 text-center">
                ⚠️ Configura la API de SMS en la sección de configuraciones antes de enviar mensajes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSender;
