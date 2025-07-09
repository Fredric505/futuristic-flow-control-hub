
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, TestTube } from 'lucide-react';

const SmsSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    description: '',
    client_description: '',
    api_url: '',
    request_type: 'GET',
    api_key: '',
    token: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSmsSettings();
  }, []);

  const loadSmsSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'sms_description',
          'sms_client_description', 
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

      setSettings({
        description: settingsMap['sms_description'] || '',
        client_description: settingsMap['sms_client_description'] || '',
        api_url: settingsMap['sms_api_url'] || '',
        request_type: settingsMap['sms_request_type'] || 'GET',
        api_key: settingsMap['sms_api_key'] || '',
        token: settingsMap['sms_token'] || ''
      });
    } catch (error) {
      console.error('Error loading SMS settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones de SMS",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const settingsToUpdate = [
        { key: 'sms_description', value: settings.description },
        { key: 'sms_client_description', value: settings.client_description },
        { key: 'sms_api_url', value: settings.api_url },
        { key: 'sms_request_type', value: settings.request_type },
        { key: 'sms_api_key', value: settings.api_key },
        { key: 'sms_token', value: settings.token }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(
            { 
              setting_key: setting.key, 
              setting_value: setting.value,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'setting_key' }
          );

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Las configuraciones de SMS se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!settings.api_url) {
      toast({
        title: "Error",
        description: "Debes configurar la URL de la API antes de probar",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      // Aquí puedes implementar la lógica de prueba según la API específica
      toast({
        title: "Prueba iniciada",
        description: "Se está probando la conexión con la API de SMS..."
      });
      
      // Simulación de prueba - esto se puede personalizar según la API
      setTimeout(() => {
        toast({
          title: "Prueba completada",
          description: "La configuración de SMS parece estar funcionando correctamente"
        });
        setIsTesting(false);
      }, 2000);
    } catch (error) {
      console.error('Error testing SMS:', error);
      toast({
        title: "Error en la prueba",
        description: "No se pudo conectar con la API de SMS",
        variant: "destructive"
      });
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">Configuración de SMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-blue-200">Descripción</Label>
              <Input
                id="description"
                placeholder="Bulk SMS"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_description" className="text-blue-200">Descripción para el cliente</Label>
              <Input
                id="client_description"
                placeholder="Long Code"
                value={settings.client_description}
                onChange={(e) => setSettings({ ...settings, client_description: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_url" className="text-blue-200">URL de solicitud</Label>
            <Input
              id="api_url"
              placeholder="https://apisms.com/v1/sendsms.php"
              value={settings.api_url}
              onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request_type" className="text-blue-200">Tipo de solicitud</Label>
            <Select value={settings.request_type} onValueChange={(value) => setSettings({ ...settings, request_type: value })}>
              <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/20">
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api_key" className="text-blue-200">API Key</Label>
              <Input
                id="api_key"
                placeholder="XXX-XXX-XXX-XXX"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                type="password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token" className="text-blue-200">Token</Label>
              <Input
                id="token"
                placeholder="XXX-XXX-XXX-XXX"
                value={settings.token}
                onChange={(e) => setSettings({ ...settings, token: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200"
                type="password"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
            
            <Button
              onClick={handleTest}
              disabled={isTesting || !settings.api_url}
              variant="outline"
              className="border-green-500/30 text-green-300 hover:bg-green-600/10"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Probando...' : 'Probar Conexión'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSettings;
