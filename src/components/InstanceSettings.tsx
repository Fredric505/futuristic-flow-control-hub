import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InstanceSettings = () => {
  const [apiProvider, setApiProvider] = useState<'ultramsg' | 'greenapi'>('ultramsg');
  
  // Ultra MSG settings
  const [ultraSpanishInstance, setUltraSpanishInstance] = useState('');
  const [ultraSpanishToken, setUltraSpanishToken] = useState('');
  const [ultraEnglishInstance, setUltraEnglishInstance] = useState('');
  const [ultraEnglishToken, setUltraEnglishToken] = useState('');
  
  // Green API settings
  const [greenSpanishInstance, setGreenSpanishInstance] = useState('');
  const [greenSpanishToken, setGreenSpanishToken] = useState('');
  const [greenEnglishInstance, setGreenEnglishInstance] = useState('');
  const [greenEnglishToken, setGreenEnglishToken] = useState('');

  // SMS API settings
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsApiToken, setSmsApiToken] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', [
          'api_provider',
          'whatsapp_instance', 'whatsapp_token', 'whatsapp_instance_en', 'whatsapp_token_en',
          'greenapi_instance', 'greenapi_token', 'greenapi_instance_en', 'greenapi_token_en',
          'sms_api_key', 'sms_api_token'
        ]);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setApiProvider((settings?.api_provider || 'ultramsg') as 'ultramsg' | 'greenapi');
      
      // Ultra MSG settings
      setUltraSpanishInstance(settings?.whatsapp_instance || '');
      setUltraSpanishToken(settings?.whatsapp_token || '');
      setUltraEnglishInstance(settings?.whatsapp_instance_en || '');
      setUltraEnglishToken(settings?.whatsapp_token_en || '');
      
      // Green API settings
      setGreenSpanishInstance(settings?.greenapi_instance || '');
      setGreenSpanishToken(settings?.greenapi_token || '');
      setGreenEnglishInstance(settings?.greenapi_instance_en || '');
      setGreenEnglishToken(settings?.greenapi_token_en || '');

      // SMS API settings
      setSmsApiKey(settings?.sms_api_key || '');
      setSmsApiToken(settings?.sms_api_token || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Error al cargar configuraciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Save API provider selection
      const { error: providerError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'api_provider',
          setting_value: apiProvider,
          updated_at: new Date().toISOString()
        });

      if (providerError) throw providerError;

      // Update Ultra MSG Spanish settings
      const { error: ultraSpanishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance',
          setting_value: ultraSpanishInstance,
          updated_at: new Date().toISOString()
        });

      if (ultraSpanishInstanceError) throw ultraSpanishInstanceError;

      const { error: ultraSpanishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token',
          setting_value: ultraSpanishToken,
          updated_at: new Date().toISOString()
        });

      if (ultraSpanishTokenError) throw ultraSpanishTokenError;

      // Update Ultra MSG English settings
      const { error: ultraEnglishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance_en',
          setting_value: ultraEnglishInstance,
          updated_at: new Date().toISOString()
        });

      if (ultraEnglishInstanceError) throw ultraEnglishInstanceError;

      const { error: ultraEnglishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token_en',
          setting_value: ultraEnglishToken,
          updated_at: new Date().toISOString()
        });

      if (ultraEnglishTokenError) throw ultraEnglishTokenError;

      // Update Green API Spanish settings
      const { error: greenSpanishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'greenapi_instance',
          setting_value: greenSpanishInstance,
          updated_at: new Date().toISOString()
        });

      if (greenSpanishInstanceError) throw greenSpanishInstanceError;

      const { error: greenSpanishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'greenapi_token',
          setting_value: greenSpanishToken,
          updated_at: new Date().toISOString()
        });

      if (greenSpanishTokenError) throw greenSpanishTokenError;

      // Update Green API English settings
      const { error: greenEnglishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'greenapi_instance_en',
          setting_value: greenEnglishInstance,
          updated_at: new Date().toISOString()
        });

      if (greenEnglishInstanceError) throw greenEnglishInstanceError;

      const { error: greenEnglishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'greenapi_token_en',
          setting_value: greenEnglishToken,
          updated_at: new Date().toISOString()
        });

      if (greenEnglishTokenError) throw greenEnglishTokenError;

      // Save SMS API settings
      const { error: smsApiKeyError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'sms_api_key',
          setting_value: smsApiKey,
          updated_at: new Date().toISOString()
        });

      if (smsApiKeyError) throw smsApiKeyError;

      const { error: smsApiTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'sms_api_token',
          setting_value: smsApiToken,
          updated_at: new Date().toISOString()
        });

      if (smsApiTokenError) throw smsApiTokenError;

      toast({
        title: "Configuración guardada",
        description: "Configuraciones de ambos idiomas y SMS actualizadas exitosamente",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar configuración",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las configuraciones?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', [
          'api_provider',
          'whatsapp_instance', 'whatsapp_token', 'whatsapp_instance_en', 'whatsapp_token_en',
          'greenapi_instance', 'greenapi_token', 'greenapi_instance_en', 'greenapi_token_en',
          'sms_api_key', 'sms_api_token'
        ]);

      if (error) throw error;

      setApiProvider('ultramsg');
      setUltraSpanishInstance('');
      setUltraSpanishToken('');
      setUltraEnglishInstance('');
      setUltraEnglishToken('');
      setGreenSpanishInstance('');
      setGreenSpanishToken('');
      setGreenEnglishInstance('');
      setGreenEnglishToken('');
      setSmsApiKey('');
      setSmsApiToken('');
      
      toast({
        title: "Configuración eliminada",
        description: "Todas las configuraciones eliminadas",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Error deleting settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar configuración",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando configuraciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Provider Selector */}
      <Card className="bg-black/20 backdrop-blur-xl border border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-300">⚙️ Proveedor de API / API Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="api-provider" className="text-purple-200">
              Selecciona el proveedor de API que usarán todos los usuarios
            </Label>
            <Select value={apiProvider} onValueChange={(value: 'ultramsg' | 'greenapi') => setApiProvider(value)}>
              <SelectTrigger className="bg-white/5 border-purple-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultramsg">Ultra MSG</SelectItem>
                <SelectItem value="greenapi">Green API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-purple-200/60 text-sm mt-2">
              Solo una API puede estar activa a la vez. Configura ambas pero selecciona cuál usar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ultra MSG Configuration */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">📱 Ultra MSG - Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Spanish */}
            <div className="space-y-4 pb-4 border-b border-blue-500/20">
              <h4 className="text-blue-200 font-semibold">🇪🇸 Español</h4>
              <div className="space-y-2">
                <Label htmlFor="ultra-spanish-instance" className="text-blue-200">ID de Instancia</Label>
                <Input
                  id="ultra-spanish-instance"
                  type="text"
                  value={ultraSpanishInstance}
                  onChange={(e) => setUltraSpanishInstance(e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Ingresa el ID de instancia para español"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ultra-spanish-token" className="text-blue-200">Token</Label>
                <Input
                  id="ultra-spanish-token"
                  type="text"
                  value={ultraSpanishToken}
                  onChange={(e) => setUltraSpanishToken(e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Ingresa el token para español"
                />
              </div>
            </div>

            {/* English */}
            <div className="space-y-4">
              <h4 className="text-blue-200 font-semibold">🇺🇸 English</h4>
              <div className="space-y-2">
                <Label htmlFor="ultra-english-instance" className="text-blue-200">Instance ID</Label>
                <Input
                  id="ultra-english-instance"
                  type="text"
                  value={ultraEnglishInstance}
                  onChange={(e) => setUltraEnglishInstance(e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Enter instance ID for English"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ultra-english-token" className="text-blue-200">Token</Label>
                <Input
                  id="ultra-english-token"
                  type="text"
                  value={ultraEnglishToken}
                  onChange={(e) => setUltraEnglishToken(e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder="Enter token for English"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Green API Configuration */}
      <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-300">🟢 Green API - Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Spanish */}
            <div className="space-y-4 pb-4 border-b border-green-500/20">
              <h4 className="text-green-200 font-semibold">🇪🇸 Español</h4>
              <div className="space-y-2">
                <Label htmlFor="green-spanish-instance" className="text-green-200">ID de Instancia</Label>
                <Input
                  id="green-spanish-instance"
                  type="text"
                  value={greenSpanishInstance}
                  onChange={(e) => setGreenSpanishInstance(e.target.value)}
                  className="bg-white/5 border-green-500/30 text-white"
                  placeholder="Ingresa el ID de instancia para español"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="green-spanish-token" className="text-green-200">Token</Label>
                <Input
                  id="green-spanish-token"
                  type="text"
                  value={greenSpanishToken}
                  onChange={(e) => setGreenSpanishToken(e.target.value)}
                  className="bg-white/5 border-green-500/30 text-white"
                  placeholder="Ingresa el token para español"
                />
              </div>
            </div>

            {/* English */}
            <div className="space-y-4">
              <h4 className="text-green-200 font-semibold">🇺🇸 English</h4>
              <div className="space-y-2">
                <Label htmlFor="green-english-instance" className="text-green-200">Instance ID</Label>
                <Input
                  id="green-english-instance"
                  type="text"
                  value={greenEnglishInstance}
                  onChange={(e) => setGreenEnglishInstance(e.target.value)}
                  className="bg-white/5 border-green-500/30 text-white"
                  placeholder="Enter instance ID for English"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="green-english-token" className="text-green-200">Token</Label>
                <Input
                  id="green-english-token"
                  type="text"
                  value={greenEnglishToken}
                  onChange={(e) => setGreenEnglishToken(e.target.value)}
                  className="bg-white/5 border-green-500/30 text-white"
                  placeholder="Enter token for English"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS API Configuration */}
      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300">📱 SMS API - Senders Global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-orange-950/30 rounded-lg border border-orange-500/20 mb-4">
              <p className="text-orange-200/70 text-sm">
                Configura las credenciales de la API de senders-global.com para enviar SMS.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sms-api-key" className="text-orange-200">API Key</Label>
              <Input
                id="sms-api-key"
                type="text"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                className="bg-white/5 border-orange-500/30 text-white"
                placeholder="Ingresa tu API Key de senders-global"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sms-api-token" className="text-orange-200">API Token</Label>
              <Input
                id="sms-api-token"
                type="text"
                value={smsApiToken}
                onChange={(e) => setSmsApiToken(e.target.value)}
                className="bg-white/5 border-orange-500/30 text-white"
                placeholder="Ingresa tu API Token de senders-global"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex space-x-4">
        <Button 
          onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          Guardar Todas las Configuraciones
        </Button>
        <Button 
          onClick={handleDelete}
          className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
        >
          Eliminar Todo
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Current API Provider */}
        <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-500/20">
          <h4 className="text-purple-300 font-semibold mb-2">⚙️ API Activa / Active API</h4>
          <p className="text-purple-200/70 text-lg font-bold">
            {apiProvider === 'ultramsg' ? '📱 Ultra MSG' : '🟢 Green API'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ultra MSG Status */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
              <h4 className="text-blue-300 font-semibold mb-2">📱 Ultra MSG - Español</h4>
              <p className="text-blue-200/70 text-sm">Instancia: {ultraSpanishInstance || 'No configurada'}</p>
              <p className="text-blue-200/70 text-sm">Token: {ultraSpanishToken || 'No configurado'}</p>
            </div>
            
            <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
              <h4 className="text-blue-300 font-semibold mb-2">📱 Ultra MSG - English</h4>
              <p className="text-blue-200/70 text-sm">Instance: {ultraEnglishInstance || 'Not configured'}</p>
              <p className="text-blue-200/70 text-sm">Token: {ultraEnglishToken || 'Not configured'}</p>
            </div>
          </div>

          {/* Green API Status */}
          <div className="space-y-4">
            <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
              <h4 className="text-green-300 font-semibold mb-2">🟢 Green API - Español</h4>
              <p className="text-green-200/70 text-sm">Instancia: {greenSpanishInstance || 'No configurada'}</p>
              <p className="text-green-200/70 text-sm">Token: {greenSpanishToken || 'No configurado'}</p>
            </div>
            
            <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
              <h4 className="text-green-300 font-semibold mb-2">🟢 Green API - English</h4>
              <p className="text-green-200/70 text-sm">Instance: {greenEnglishInstance || 'Not configured'}</p>
              <p className="text-green-200/70 text-sm">Token: {greenEnglishToken || 'Not configured'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstanceSettings;