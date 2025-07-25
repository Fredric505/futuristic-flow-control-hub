
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const WebhookInfo: React.FC = () => {
  const webhookUrl = 'https://jclbkyyujtrpfqgrmdhl.supabase.co/functions/v1/whatsapp-webhook';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: "URL copiada al portapapeles",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center">
          <ExternalLink className="h-5 w-5 mr-2" />
          URL del Webhook Global
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-blue-200/70 text-sm mb-2">
            Usa esta URL en IFTTT, Zapier o cualquier otro servicio para recibir notificaciones:
          </p>
          <div className="flex items-center space-x-2">
            <code className="bg-gray-900/50 text-blue-300 p-2 rounded flex-1 text-sm break-all">
              {webhookUrl}
            </code>
            <Button
              onClick={() => copyToClipboard(webhookUrl)}
              size="sm"
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-900/20 p-4 rounded border border-blue-500/20">
          <h4 className="text-blue-300 font-medium mb-2">Configuración recomendada:</h4>
          <ul className="text-blue-200/70 text-sm space-y-1">
            <li>• Método: POST</li>
            <li>• Content-Type: application/json o application/x-www-form-urlencoded</li>
            <li>• Campos requeridos: número de teléfono y mensaje</li>
            <li>• El sistema detectará automáticamente el usuario por el número</li>
          </ul>
        </div>

        <div className="bg-green-900/20 p-4 rounded border border-green-500/20">
          <h4 className="text-green-300 font-medium mb-2">Funcionalidad:</h4>
          <ul className="text-green-200/70 text-sm space-y-1">
            <li>• ✅ Una sola URL para todos los usuarios</li>
            <li>• ✅ Detección automática del usuario por número</li>
            <li>• ✅ Envío automático a bot de Telegram del usuario</li>
            <li>• ✅ Historial de notificaciones en tiempo real</li>
            <li>• ✅ Escalable para muchos usuarios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookInfo;
