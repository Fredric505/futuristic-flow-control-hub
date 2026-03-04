import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InstanceSettings = () => {
  const [apiProvider, setApiProvider] = useState<'ultramsg' | 'whapi'>('ultramsg');
  
  // Ultra MSG settings
  const [ultraSpanishInstance, setUltraSpanishInstance] = useState('');
  const [ultraSpanishToken, setUltraSpanishToken] = useState('');
  const [ultraEnglishInstance, setUltraEnglishInstance] = useState('');
  const [ultraEnglishToken, setUltraEnglishToken] = useState('');
  
  // Whapi.cloud settings
  const [whapiToken, setWhapiToken] = useState('');
  const [whapiTokenEn, setWhapiTokenEn] = useState('');
  const [whapiButtonTitleEs, setWhapiButtonTitleEs] = useState('Ver ubicación');
  const [whapiButtonTitleEn, setWhapiButtonTitleEn] = useState('View location');

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
          'whapi_token', 'whapi_token_en', 'whapi_button_title_es', 'whapi_button_title_en',
          'sms_api_key', 'sms_api_token'
        ]);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      const provider = settings?.api_provider || 'ultramsg';
      setApiProvider(provider === 'greenapi' ? 'ultramsg' : provider as 'ultramsg' | 'whapi');
      
      // Ultra MSG settings
      setUltraSpanishInstance(settings?.whatsapp_instance || '');
      setUltraSpanishToken(settings?.whatsapp_token || '');
      setUltraEnglishInstance(settings?.whatsapp_instance_en || '');
      setUltraEnglishToken(settings?.whatsapp_token_en || '');
      
      // Whapi settings
      setWhapiToken(settings?.whapi_token || '');
      setWhapiTokenEn(settings?.whapi_token_en || '');
      setWhapiButtonTitleEs(settings?.whapi_button_title_es || 'Ver ubicación');
      setWhapiButtonTitleEn(settings?.whapi_button_title_en || 'View location');

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

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  };

  const handleSave = async () => {
    try {
      await upsertSetting('api_provider', apiProvider);
      await upsertSetting('whatsapp_instance', ultraSpanishInstance);
      await upsertSetting('whatsapp_token', ultraSpanishToken);
      await upsertSetting('whatsapp_instance_en', ultraEnglishInstance);
      await upsertSetting('whatsapp_token_en', ultraEnglishToken);
      await upsertSetting('whapi_token', whapiToken);
      await upsertSetting('whapi_token_en', whapiTokenEn);
      await upsertSetting('whapi_button_title_es', whapiButtonTitleEs);
      await upsertSetting('whapi_button_title_en', whapiButtonTitleEn);
      await upsertSetting('sms_api_key', smsApiKey);
      await upsertSetting('sms_api_token', smsApiToken);

      toast({
        title: "Configuración guardada",
        description: "Todas las configuraciones actualizadas exitosamente",
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
          'whapi_token', 'whapi_token_en', 'whapi_button_title_es', 'whapi_button_title_en',
          'sms_api_key', 'sms_api_token'
        ]);

      if (error) throw error;

      setApiProvider('ultramsg');
      setUltraSpanishInstance('');
      setUltraSpanishToken('');
      setUltraEnglishInstance('');
      setUltraEnglishToken('');
      setWhapiToken('');
      setWhapiTokenEn('');
      setWhapiButtonTitleEs('Ver ubicación');
      setWhapiButtonTitleEn('View location');
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
      <Card className="glass-card glow-card">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Cargando configuraciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Provider Selector */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground">⚙️ Proveedor de API WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Selecciona el proveedor de API que usarán todos los usuarios
            </Label>
            <Select value={apiProvider} onValueChange={(value: 'ultramsg' | 'whapi') => setApiProvider(value)}>
              <SelectTrigger className="bg-accent/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultramsg">📱 Ultra MSG</SelectItem>
                <SelectItem value="whapi">🌐 Whapi.cloud</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground/60 text-sm mt-2">
              Solo una API puede estar activa a la vez. Configura ambas pero selecciona cuál usar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ultra MSG Configuration */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground">📱 Ultra MSG - Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4 pb-4 border-b border-border/30">
              <h4 className="text-muted-foreground font-semibold">🇪🇸 Español</h4>
              <div className="space-y-2">
                <Label className="text-muted-foreground">ID de Instancia</Label>
                <Input type="text" value={ultraSpanishInstance} onChange={(e) => setUltraSpanishInstance(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Ingresa el ID de instancia para español" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Token</Label>
                <Input type="text" value={ultraSpanishToken} onChange={(e) => setUltraSpanishToken(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Ingresa el token para español" />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-muted-foreground font-semibold">🇺🇸 English</h4>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Instance ID</Label>
                <Input type="text" value={ultraEnglishInstance} onChange={(e) => setUltraEnglishInstance(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Enter instance ID for English" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Token</Label>
                <Input type="text" value={ultraEnglishToken} onChange={(e) => setUltraEnglishToken(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Enter token for English" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whapi.cloud Configuration */}
      <Card className="glass-card glow-card border-success/20">
        <CardHeader>
          <CardTitle className="text-foreground">🌐 Whapi.cloud - Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-muted-foreground text-sm">
                Whapi.cloud permite enviar mensajes con <strong>botones interactivos</strong> que enmascaran URLs. 
                Obtén tu token en <a href="https://whapi.cloud" target="_blank" rel="noopener noreferrer" className="text-success underline">whapi.cloud</a>
              </p>
            </div>

            <div className="space-y-4 pb-4 border-b border-border/30">
              <h4 className="text-muted-foreground font-semibold">🇪🇸 Token Español</h4>
              <div className="space-y-2">
                <Label className="text-muted-foreground">API Token</Label>
                <Input type="password" value={whapiToken} onChange={(e) => setWhapiToken(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Bearer token para español" />
              </div>
            </div>

            <div className="space-y-4 pb-4 border-b border-border/30">
              <h4 className="text-muted-foreground font-semibold">🇺🇸 Token English</h4>
              <div className="space-y-2">
                <Label className="text-muted-foreground">API Token</Label>
                <Input type="password" value={whapiTokenEn} onChange={(e) => setWhapiTokenEn(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Bearer token for English" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-muted-foreground font-semibold">🔘 Nombres de Botones Interactivos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Botón Español</Label>
                  <Input type="text" value={whapiButtonTitleEs} onChange={(e) => setWhapiButtonTitleEs(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Ver ubicación" maxLength={20} />
                  <p className="text-muted-foreground/50 text-xs">Máx 20 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Button English</Label>
                  <Input type="text" value={whapiButtonTitleEn} onChange={(e) => setWhapiButtonTitleEn(e.target.value)} className="bg-accent/50 border-border/50" placeholder="View location" maxLength={20} />
                  <p className="text-muted-foreground/50 text-xs">Max 20 characters</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS API Configuration */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground">📱 SMS API - Senders Global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/30 border border-border/30 mb-4">
              <p className="text-muted-foreground text-sm">
                Configura las credenciales de la API de senders-global.com para enviar SMS.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Key</Label>
              <Input type="text" value={smsApiKey} onChange={(e) => setSmsApiKey(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Ingresa tu API Key de senders-global" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Token</Label>
              <Input type="text" value={smsApiToken} onChange={(e) => setSmsApiToken(e.target.value)} className="bg-accent/50 border-border/50" placeholder="Ingresa tu API Token de senders-global" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button onClick={handleSave} className="flex-1 gold-gradient text-primary-foreground glow-gold hover:opacity-90">
          Guardar Todas las Configuraciones
        </Button>
        <Button onClick={handleDelete} variant="outline" className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10">
          Eliminar Todo
        </Button>
      </div>
      
      {/* Status Summary */}
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-accent/30 border border-border/30">
          <h4 className="text-foreground font-semibold mb-2">⚙️ API Activa</h4>
          <p className="text-primary text-lg font-bold">
            {apiProvider === 'ultramsg' ? '📱 Ultra MSG' : '🌐 Whapi.cloud'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/20 border border-border/30">
              <h4 className="text-foreground font-semibold mb-2">📱 Ultra MSG - Español</h4>
              <p className="text-muted-foreground text-sm">Instancia: {ultraSpanishInstance || 'No configurada'}</p>
              <p className="text-muted-foreground text-sm">Token: {ultraSpanishToken ? '••••••••' : 'No configurado'}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/20 border border-border/30">
              <h4 className="text-foreground font-semibold mb-2">📱 Ultra MSG - English</h4>
              <p className="text-muted-foreground text-sm">Instance: {ultraEnglishInstance || 'Not configured'}</p>
              <p className="text-muted-foreground text-sm">Token: {ultraEnglishToken ? '••••••••' : 'Not configured'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <h4 className="text-foreground font-semibold mb-2">🌐 Whapi.cloud - Español</h4>
              <p className="text-muted-foreground text-sm">Token: {whapiToken ? '••••••••' : 'No configurado'}</p>
              <p className="text-muted-foreground text-sm">Botón: {whapiButtonTitleEs}</p>
            </div>
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <h4 className="text-foreground font-semibold mb-2">🌐 Whapi.cloud - English</h4>
              <p className="text-muted-foreground text-sm">Token: {whapiTokenEn ? '••••••••' : 'Not configured'}</p>
              <p className="text-muted-foreground text-sm">Button: {whapiButtonTitleEn}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstanceSettings;
