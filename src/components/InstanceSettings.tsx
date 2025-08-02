
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InstanceSettings = () => {
  const [instanceEs, setInstanceEs] = useState('');
  const [tokenEs, setTokenEs] = useState('');
  const [instanceEn, setInstanceEn] = useState('');
  const [tokenEn, setTokenEn] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance_es', 'whatsapp_token_es', 'whatsapp_instance_en', 'whatsapp_token_en']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setInstanceEs(settings?.whatsapp_instance_es || '');
      setTokenEs(settings?.whatsapp_token_es || '');
      setInstanceEn(settings?.whatsapp_instance_en || '');
      setTokenEn(settings?.whatsapp_token_en || '');
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
      // Update Spanish settings
      const { error: instanceEsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance_es',
          setting_value: instanceEs,
          updated_at: new Date().toISOString()
        });

      if (instanceEsError) throw instanceEsError;

      const { error: tokenEsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token_es',
          setting_value: tokenEs,
          updated_at: new Date().toISOString()
        });

      if (tokenEsError) throw tokenEsError;

      // Update English settings
      const { error: instanceEnError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance_en',
          setting_value: instanceEn,
          updated_at: new Date().toISOString()
        });

      if (instanceEnError) throw instanceEnError;

      const { error: tokenEnError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token_en',
          setting_value: tokenEn,
          updated_at: new Date().toISOString()
        });

      if (tokenEnError) throw tokenEnError;

      toast({
        title: "Configuración guardada",
        description: "Configuraciones actualizadas exitosamente",
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
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', ['whatsapp_instance_es', 'whatsapp_token_es', 'whatsapp_instance_en', 'whatsapp_token_en']);

      if (error) throw error;

      setInstanceEs('');
      setTokenEs('');
      setInstanceEn('');
      setTokenEn('');
      
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
      {/* Configuraciones en Español */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            🇪🇸 Configuración para Español
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-es" className="text-blue-200">ID de Instancia (Español)</Label>
              <Input
                id="instance-es"
                type="text"
                value={instanceEs}
                onChange={(e) => setInstanceEs(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el ID de instancia para español"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token-es" className="text-blue-200">Token (Español)</Label>
              <Input
                id="token-es"
                type="text"
                value={tokenEs}
                onChange={(e) => setTokenEs(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el token para español"
              />
            </div>
            
            <div className="mt-4 p-3 bg-blue-950/30 rounded-lg border border-blue-500/20">
              <p className="text-blue-200/70 text-sm">Instancia: {instanceEs || 'No configurada'}</p>
              <p className="text-blue-200/70 text-sm">Token: {tokenEs || 'No configurado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuraciones en Inglés */}
      <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-300 flex items-center gap-2">
            🇺🇸 Configuración para Inglés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-en" className="text-green-200">ID de Instancia (Inglés)</Label>
              <Input
                id="instance-en"
                type="text"
                value={instanceEn}
                onChange={(e) => setInstanceEn(e.target.value)}
                className="bg-white/5 border-green-500/30 text-white"
                placeholder="Ingresa el ID de instancia para inglés"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token-en" className="text-green-200">Token (Inglés)</Label>
              <Input
                id="token-en"
                type="text"
                value={tokenEn}
                onChange={(e) => setTokenEn(e.target.value)}
                className="bg-white/5 border-green-500/30 text-white"
                placeholder="Ingresa el token para inglés"
              />
            </div>
            
            <div className="mt-4 p-3 bg-green-950/30 rounded-lg border border-green-500/20">
              <p className="text-green-200/70 text-sm">Instancia: {instanceEn || 'No configurada'}</p>
              <p className="text-green-200/70 text-sm">Token: {tokenEn || 'No configurado'}</p>
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
          Eliminar Todas
        </Button>
      </div>
    </div>
  );
};

export default InstanceSettings;
