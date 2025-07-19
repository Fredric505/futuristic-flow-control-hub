
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, RefreshCw } from 'lucide-react';

interface WhatsAppResponse {
  id: string;
  phone_number: string;
  response_content: string;
  imei: string | null;
  serial_number: string | null;
  telegram_sent: boolean;
  created_at: string;
}

const WhatsAppResponseHandler = () => {
  const [responses, setResponses] = useState<WhatsAppResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState({
    phone_number: '',
    response_content: '',
    imei: '',
    serial_number: ''
  });

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('whatsapp_responses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setResponses(data);

    } catch (error) {
      console.error('Error loading responses:', error);
    }
  };

  const handleTestResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Insertar respuesta de prueba
      const { error } = await supabase
        .from('whatsapp_responses')
        .insert({
          user_id: user.id,
          phone_number: testData.phone_number,
          response_content: testData.response_content,
          imei: testData.imei || null,
          serial_number: testData.serial_number || null,
          telegram_sent: false
        });

      if (error) throw error;

      // Intentar procesar la respuesta
      await processResponse();

      toast({
        title: "Respuesta de prueba enviada",
        description: "La respuesta se ha registrado y procesado",
      });

      setTestData({
        phone_number: '',
        response_content: '',
        imei: '',
        serial_number: ''
      });

      loadResponses();

    } catch (error: any) {
      console.error('Error sending test response:', error);
      toast({
        title: "Error",
        description: error.message || "Error al procesar la respuesta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processResponse = async () => {
    try {
      // Llamar a la edge function para procesar respuestas pendientes
      const response = await fetch('/api/process-whatsapp-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al procesar respuestas');
      }

      const result = await response.json();
      console.log('Respuestas procesadas:', result);

    } catch (error) {
      console.error('Error processing responses:', error);
    }
  };

  const resendToTelegram = async (responseId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/resend-to-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseId }),
      });

      if (!response.ok) {
        throw new Error('Error al reenviar a Telegram');
      }

      toast({
        title: "Reenviado a Telegram",
        description: "El mensaje se ha reenviado exitosamente",
      });

      loadResponses();

    } catch (error: any) {
      console.error('Error resending to telegram:', error);
      toast({
        title: "Error",
        description: error.message || "Error al reenviar a Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Probar Respuesta de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestResponse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-blue-200">Número de Teléfono</Label>
                <Input
                  id="phone_number"
                  value={testData.phone_number}
                  onChange={(e) => setTestData(prev => ({...prev, phone_number: e.target.value}))}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="+1234567890"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imei" className="text-blue-200">IMEI</Label>
                <Input
                  id="imei"
                  value={testData.imei}
                  onChange={(e) => setTestData(prev => ({...prev, imei: e.target.value}))}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number" className="text-blue-200">Número de Serie</Label>
                <Input
                  id="serial_number"
                  value={testData.serial_number}
                  onChange={(e) => setTestData(prev => ({...prev, serial_number: e.target.value}))}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="ABC123XYZ"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="response_content" className="text-blue-200">Contenido de la Respuesta</Label>
                <Input
                  id="response_content"
                  value={testData.response_content}
                  onChange={(e) => setTestData(prev => ({...prev, response_content: e.target.value}))}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Hola, he encontrado tu iPhone..."
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : 'Enviar Respuesta de Prueba'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-300">Historial de Respuestas</CardTitle>
          <Button
            onClick={loadResponses}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {responses.length === 0 ? (
              <p className="text-blue-200/60 text-center py-4">No hay respuestas registradas</p>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-200 font-medium">{response.phone_number}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          response.telegram_sent 
                            ? 'bg-green-600/20 text-green-300 border border-green-500/30'
                            : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {response.telegram_sent ? 'Enviado' : 'Pendiente'}
                        </span>
                      </div>
                      
                      <p className="text-blue-200/80 text-sm mb-2">{response.response_content}</p>
                      
                      <div className="text-blue-200/60 text-xs space-y-1">
                        {response.imei && <p>IMEI: {response.imei}</p>}
                        {response.serial_number && <p>Serie: {response.serial_number}</p>}
                        <p>Fecha: {new Date(response.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {!response.telegram_sent && (
                      <Button
                        onClick={() => resendToTelegram(response.id)}
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                        size="sm"
                        disabled={isLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppResponseHandler;
