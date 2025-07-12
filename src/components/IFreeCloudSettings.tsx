
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const IFreeCloudSettings = () => {
  const [settings, setSettings] = useState({
    username: '',
    api_key: '',
    api_url: 'https://api.ifreicloud.co.uk'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ifreicloud_username', 'ifreicloud_api_key', 'ifreicloud_url']);

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>) || {};

      setSettings({
        username: settingsMap.ifreicloud_username || '',
        api_key: settingsMap.ifreicloud_api_key || '',
        api_url: settingsMap.ifreicloud_url || 'https://api.ifreicloud.co.uk'
      });

    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const settingsToSave = [
        { setting_key: 'ifreicloud_username', setting_value: settings.username },
        { setting_key: 'ifreicloud_api_key', setting_value: settings.api_key },
        { setting_key: 'ifreicloud_url', setting_value: settings.api_url }
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { 
            onConflict: 'setting_key',
            ignoreDuplicates: false 
          });

        if (error) throw error;
      }

      toast({
        title: "Configuraciones guardadas",
        description: "Las configuraciones de iFreeCloud han sido actualizadas exitosamente"
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.username || !settings.api_key || !settings.api_url) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos antes de probar la conexión",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Call edge function to test connection
      const { data, error } = await supabase.functions.invoke('test-ifreicloud-connection', {
        body: {
          username: settings.username,
          apiKey: settings.api_key,
          apiUrl: settings.api_url
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión con iFreeCloud API fue establecida correctamente"
        });
      } else {
        throw new Error(data.message || 'Error de conexión');
      }

    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con la API de iFreeCloud. Verifica tus credenciales.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de iFreeCloud API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label className="text-blue-200">Nombre de Usuario</Label>
            <Input
              value={settings.username}
              onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              placeholder="Tu nombre de usuario en iFreeCloud"
              className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50"
            />
          </div>

          <div>
            <Label className="text-blue-200">Clave API</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="Tu clave API de iFreeCloud"
                className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50 pr-10"
              />
              <Button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-transparent hover:bg-blue-600/20"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-blue-300" />
                ) : (
                  <Eye className="h-4 w-4 text-blue-300" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-blue-200">URL de la API</Label>
          <Input
            value={settings.api_url}
            onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
            placeholder="https://api.ifreicloud.co.uk"
            className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>

          <Button
            onClick={testConnection}
            disabled={isLoading}
            variant="outline"
            className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Probar Conexión
          </Button>
        </div>

        <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-500/20 mt-4">
          <h4 className="text-blue-300 font-medium mb-2">Instrucciones:</h4>
          <ul className="text-blue-200/70 text-sm space-y-1">
            <li>1. Ve a tu panel de iFreeCloud API</li>
            <li>2. Copia tu nombre de usuario y clave API</li>
            <li>3. Pega las credenciales en los campos correspondientes</li>
            <li>4. Haz clic en "Probar Conexión" para verificar</li>
            <li>5. Guarda la configuración cuando la conexión sea exitosa</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default IFreeCloudSettings;
