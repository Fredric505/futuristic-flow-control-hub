import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import WebhookInfo from './WebhookInfo';

const InstanceSettings = () => {
  const [whatsappInstance, setWhatsappInstance] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      const config = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setWhatsappInstance(config?.whatsapp_instance || '');
      setWhatsappToken(config?.whatsapp_token || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Error al cargar la configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { setting_key: key, setting_value: value },
          { onConflict: 'setting_key' }
        );

      if (error) {
        console.error('Error updating setting:', error);
        throw error;
      }

      toast({
        title: "Configuración actualizada",
        description: `La configuración de ${key} ha sido actualizada`,
      });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: `Error al actualizar ${key}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleInstanceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWhatsappInstance(value);
    await updateSetting('whatsapp_instance', value);
  };

  const handleTokenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWhatsappToken(value);
    await updateSetting('whatsapp_token', value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-300">Configuración de Instancia</h2>
        <Button
          onClick={loadSettings}
          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <WebhookInfo />

      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">Configuración de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="whatsapp-instance" className="text-blue-200/70">
              WhatsApp Instance ID
            </Label>
            <Input
              id="whatsapp-instance"
              className="bg-black/40 border-blue-500/30 text-blue-200"
              value={whatsappInstance}
              onChange={handleInstanceChange}
            />
          </div>
          <div>
            <Label htmlFor="whatsapp-token" className="text-blue-200/70">
              WhatsApp Token
            </Label>
            <Input
              id="whatsapp-token"
              className="bg-black/40 border-blue-500/30 text-blue-200"
              value={whatsappToken}
              onChange={handleTokenChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstanceSettings;
