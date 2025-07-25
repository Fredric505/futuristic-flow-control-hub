
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Copy, Globe, Zap } from 'lucide-react';

const WebhookInfo: React.FC = () => {
  const webhookUrl = `${window.location.origin.replace('localhost:8080', 'jclbkyyujtrpfqgrmdhl.supabase.co')}/functions/v1/whatsapp-webhook`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: "URL copiada al portapapeles",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            URL Global del Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900/20 p-4 rounded border border-blue-500/20">
            <p className="text-blue-200/70 text-sm mb-2">URL del Webhook:</p>
            <div className="flex items-center space-x-2">
              <code className="text-blue-300 bg-black/40 px-3 py-2 rounded text-sm flex-1 break-all">
                {webhookUrl}
              </code>
              <Button
                size="sm"
                onClick={() => copyToClipboard(webhookUrl)}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-yellow-900/20 p-4 rounded border border-yellow-500/20">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-yellow-300 mt-0.5" />
              <div>
                <p className="text-yellow-300 font-medium mb-2">Configuración en IFTTT/Zapier:</p>
                <ul className="text-yellow-200/80 text-sm space-y-1">
                  <li>• Usa esta URL como webhook de destino</li>
                  <li>• Método: POST</li>
                  <li>• Envía el número de teléfono en el campo "phone" o "sender"</li>
                  <li>• Envía el mensaje en el campo "message" o "text"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 p-4 rounded border border-green-500/20">
            <p className="text-green-300 font-medium mb-2">¿Cómo funciona?</p>
            <ol className="text-green-200/80 text-sm space-y-1">
              <li>1. Esta URL recibe todas las notificaciones de WhatsApp</li>
              <li>2. Identifica automáticamente el usuario por el número</li>
              <li>3. Reenvía la notificación al bot de Telegram configurado</li>
              <li>4. Funciona en tiempo real para todos los usuarios</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookInfo;
