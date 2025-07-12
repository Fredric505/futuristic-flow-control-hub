
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface IMEIResult {
  device_name: string;
  model: string;
  color: string;
  storage: string;
  carrier: string;
  warranty: string;
  find_my_iphone: boolean;
  activation_lock: boolean;
  blacklist_status: string;
  serial_number: string;
}

const IMEIChecker = () => {
  const [imei, setImei] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [result, setResult] = useState<IMEIResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'imei' | 'serial'>('imei');
  const { toast } = useToast();

  const checkIMEI = async () => {
    if (!imei.trim() && !serialNumber.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un IMEI o número de serie",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Get API settings from system_settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ifreicloud_api_key', 'ifreicloud_username', 'ifreicloud_url']);

      if (!settings || settings.length < 3) {
        toast({
          title: "Error de configuración",
          description: "Las configuraciones de la API de iFreeCloud no están completas",
          variant: "destructive"
        });
        return;
      }

      const apiConfig = settings.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>);

      // Call edge function to check IMEI/Serial
      const { data, error } = await supabase.functions.invoke('check-imei', {
        body: {
          imei: searchType === 'imei' ? imei : undefined,
          serial: searchType === 'serial' ? serialNumber : undefined,
          apiKey: apiConfig.ifreicloud_api_key,
          username: apiConfig.ifreicloud_username,
          apiUrl: apiConfig.ifreicloud_url
        }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Verificación completada",
        description: "Se ha verificado el dispositivo exitosamente"
      });

    } catch (error) {
      console.error('Error checking IMEI:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el dispositivo. Revisa la configuración de la API.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setImei('');
    setSerialNumber('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Verificador de IMEI/Número de Serie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => setSearchType('imei')}
              variant={searchType === 'imei' ? 'default' : 'outline'}
              className={searchType === 'imei' 
                ? 'bg-blue-600 text-white' 
                : 'border-blue-500/20 text-blue-300 hover:bg-blue-600/10'
              }
            >
              Por IMEI
            </Button>
            <Button
              onClick={() => setSearchType('serial')}
              variant={searchType === 'serial' ? 'default' : 'outline'}
              className={searchType === 'serial' 
                ? 'bg-blue-600 text-white' 
                : 'border-blue-500/20 text-blue-300 hover:bg-blue-600/10'
              }
            >
              Por Número de Serie
            </Button>
          </div>

          {searchType === 'imei' ? (
            <div>
              <Label className="text-blue-200">IMEI</Label>
              <Input
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="Ingresa el IMEI del dispositivo"
                className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50"
                maxLength={15}
              />
            </div>
          ) : (
            <div>
              <Label className="text-blue-200">Número de Serie</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Ingresa el número de serie del dispositivo"
                className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50"
                maxLength={12}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={checkIMEI}
              disabled={isLoading}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Verificando...' : 'Verificar Dispositivo'}
            </Button>
            {result && (
              <Button
                onClick={clearResults}
                variant="outline"
                className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
              >
                Limpiar Resultados
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300">Resultado de Verificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-blue-200/70 text-sm">Dispositivo</Label>
                <p className="text-blue-200 font-medium">{result.device_name}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Modelo</Label>
                <p className="text-blue-200 font-medium">{result.model}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Color</Label>
                <p className="text-blue-200 font-medium">{result.color}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Almacenamiento</Label>
                <p className="text-blue-200 font-medium">{result.storage}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Operadora</Label>
                <p className="text-blue-200 font-medium">{result.carrier}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Garantía</Label>
                <p className="text-blue-200 font-medium">{result.warranty}</p>
              </div>
              <div>
                <Label className="text-blue-200/70 text-sm">Número de Serie</Label>
                <p className="text-blue-200 font-medium">{result.serial_number}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge 
                className={result.find_my_iphone ? 'bg-red-600' : 'bg-green-600'}
              >
                Find My iPhone: {result.find_my_iphone ? 'Activado' : 'Desactivado'}
              </Badge>
              <Badge 
                className={result.activation_lock ? 'bg-red-600' : 'bg-green-600'}
              >
                Activation Lock: {result.activation_lock ? 'Activado' : 'Desactivado'}
              </Badge>
              <Badge 
                className={result.blacklist_status === 'Clean' ? 'bg-green-600' : 'bg-red-600'}
              >
                Estado: {result.blacklist_status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IMEIChecker;
