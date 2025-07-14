import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WhatsAppSettings = () => {
  const [instance, setInstance] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setInstance(settings?.whatsapp_instance || '');
      setToken(settings?.whatsapp_token || '');
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
      toast({
        title: "Error",
        description: "Error al cargar configuraciones de WhatsApp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const settings = [
        { key: 'whatsapp_instance', value: instance },
        { key: 'whatsapp_token', value: token }
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Configuración de WhatsApp actualizada exitosamente",
      });
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar configuración de WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      if (error) throw error;

      setInstance('');
      setToken('');
      
      toast({
        title: "Configuración eliminada",
        description: "Configuración de WhatsApp eliminada",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Error deleting WhatsApp settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar configuración de WhatsApp",
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
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Configuración de WhatsApp</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance" className="text-blue-200">ID de Instancia WhatsApp</Label>
            <Input
              id="instance"
              type="text"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Ejemplo: instance126876"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token" className="text-blue-200">Token WhatsApp</Label>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Ejemplo: 4ecj8581tubua7ry"
            />
          </div>
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Guardar WhatsApp
            </Button>
            <Button 
              onClick={handleDelete}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Eliminar
            </Button>
          </div>
          
          <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-2">Configuración Actual WhatsApp</h4>
            <div className="space-y-1">
              <p className="text-blue-200/70 text-sm">Instancia: {instance || 'No configurada'}</p>
              <p className="text-blue-200/70 text-sm">Token: {token || 'No configurado'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppSettings;