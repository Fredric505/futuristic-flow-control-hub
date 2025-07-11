
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessUrlDisplayProps {
  url: string;
  processName: string;
}

const ProcessUrlDisplay: React.FC<ProcessUrlDisplayProps> = ({ url, processName }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "URL Copiada",
        description: "La URL ha sido copiada al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive"
      });
    }
  };

  const handleOpenUrl = () => {
    // Open in new tab instead of current window to prevent tab closing
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
      <CardHeader>
        <CardTitle className="text-green-300 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Proceso Creado Exitosamente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-blue-200/70 mb-2">
            Tu proceso "{processName}" ha sido creado. Usa esta URL para enviar a tus clientes:
          </p>
          <div className="bg-black/30 p-3 rounded-lg border border-blue-500/20">
            <p className="text-blue-300 text-sm font-mono break-all">
              {url}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleCopyUrl}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar URL
              </>
            )}
          </Button>
          
          <Button
            onClick={handleOpenUrl}
            className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            type="button"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir en Nueva Pestaña
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessUrlDisplay;
