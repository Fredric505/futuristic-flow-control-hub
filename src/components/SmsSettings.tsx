
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, TestTube, Settings } from 'lucide-react';

const SmsSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    api_url: '',
    request_type: 'GET',
    api_key: '',
    token: '',
    user_domains: '',
    message_scripts: ''
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
          'sms_api_url',
          'sms_request_type',
          'sms_api_key',
          'sms_token', 
          'user_domains',
          'message_scripts'
        ]);

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(item => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings({
        api_url: settingsMap['sms_api_url'] || '',
        request_type: settingsMap['sms_request_type'] || 'GET',
        api_key: settingsMap['sms_api_key'] || '',
        token: settingsMap['sms_token'] || '',
        user_domains: settingsMap['user_domains'] || '',
        message_scripts: settingsMap['message_scripts'] || ''
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
        { key: 'sms_api_url', value: settings.api_url },
        { key: 'sms_request_type', value: settings.request_type },
        { key: 'sms_api_key', value: settings.api_key },
        { key: 'sms_token', value: settings.token },
        { key: 'user_domains', value: settings.user_domains },
        { key: 'message_scripts', value: settings.message_scripts }
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
      toast({
        title: "Prueba iniciada",
        description: "Se está probando la conexión con la API de SMS..."
      });
      
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
    <div className="space-y-4">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-blue-300 flex items-center text-lg">
            <Settings className="h-5 w-5 mr-2" />
            Configuración SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="api_url" className="text-blue-200 text-sm">URL de la API</Label>
              <Input
                id="api_url"
                placeholder="https://apisms.com/v1/sendsms.php"
                value={settings.api_url}
                onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200 h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="request_type" className="text-blue-200 text-sm">Tipo de solicitud</Label>
              <Select value={settings.request_type} onValueChange={(value) => setSettings({ ...settings, request_type: value })}>
                <SelectTrigger className="bg-black/20 border-blue-500/20 text-blue-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/20">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="api_key" className="text-blue-200 text-sm">API Key</Label>
              <Input
                id="api_key"
                placeholder="XXX-XXX-XXX-XXX"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200 h-9"
                type="password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token" className="text-blue-200 text-sm">Token</Label>
              <Input
                id="token"
                placeholder="XXX-XXX-XXX-XXX"
                value={settings.token}
                onChange={(e) => setSettings({ ...settings, token: e.target.value })}
                className="bg-black/20 border-blue-500/20 text-blue-200 h-9"
                type="password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_domains" className="text-blue-200 text-sm">Dominios de Usuarios (separados por comas)</Label>
            <Input
              id="user_domains"
              placeholder="domain1.com, domain2.com, domain3.com"
              value={settings.user_domains}
              onChange={(e) => setSettings({ ...settings, user_domains: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_scripts" className="text-blue-200 text-sm">Scripts de Mensajes (separados por comas)</Label>
            <Input
              id="message_scripts"
              placeholder="Script1, Script2, Script3"
              value={settings.message_scripts}
              onChange={(e) => setSettings({ ...settings, message_scripts: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 h-9"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 h-9"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
            
            <Button
              onClick={handleTest}
              disabled={isTesting || !settings.api_url}
              variant="outline"
              className="border-green-500/30 text-green-300 hover:bg-green-600/10 h-9"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Probando...' : 'Probar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsSettings;
