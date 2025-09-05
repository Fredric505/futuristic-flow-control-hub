import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InstanceSettings = () => {
  const [spanishInstance, setSpanishInstance] = useState('');
  const [spanishToken, setSpanishToken] = useState('');
  const [englishInstance, setEnglishInstance] = useState('');
  const [englishToken, setEnglishToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token', 'whatsapp_instance_en', 'whatsapp_token_en']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setSpanishInstance(settings?.whatsapp_instance || '');
      setSpanishToken(settings?.whatsapp_token || '');
      setEnglishInstance(settings?.whatsapp_instance_en || '');
      setEnglishToken(settings?.whatsapp_token_en || '');
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
      const { error: spanishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance',
          setting_value: spanishInstance,
          updated_at: new Date().toISOString()
        });

      if (spanishInstanceError) throw spanishInstanceError;

      const { error: spanishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token',
          setting_value: spanishToken,
          updated_at: new Date().toISOString()
        });

      if (spanishTokenError) throw spanishTokenError;

      // Update English settings
      const { error: englishInstanceError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_instance_en',
          setting_value: englishInstance,
          updated_at: new Date().toISOString()
        });

      if (englishInstanceError) throw englishInstanceError;

      const { error: englishTokenError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whatsapp_token_en',
          setting_value: englishToken,
          updated_at: new Date().toISOString()
        });

      if (englishTokenError) throw englishTokenError;

      toast({
        title: "Configuración guardada",
        description: "Configuraciones de ambos idiomas actualizadas exitosamente",
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
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token', 'whatsapp_instance_en', 'whatsapp_token_en']);

      if (error) throw error;

      setSpanishInstance('');
      setSpanishToken('');
      setEnglishInstance('');
      setEnglishToken('');
      
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
      {/* Configuración en Español */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">🇪🇸 Configuración Español/Castellano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spanish-instance" className="text-blue-200">ID de Instancia (Español)</Label>
              <Input
                id="spanish-instance"
                type="text"
                value={spanishInstance}
                onChange={(e) => setSpanishInstance(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el ID de instancia para español"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="spanish-token" className="text-blue-200">Token (Español)</Label>
              <Input
                id="spanish-token"
                type="text"
                value={spanishToken}
                onChange={(e) => setSpanishToken(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el token para español"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración en Inglés */}
      <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
        <CardHeader>
          <CardTitle className="text-green-300">🇺🇸 Configuración Inglés/English</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="english-instance" className="text-green-200">Instance ID (English)</Label>
              <Input
                id="english-instance"
                type="text"
                value={englishInstance}
                onChange={(e) => setEnglishInstance(e.target.value)}
                className="bg-white/5 border-green-500/30 text-white"
                placeholder="Enter instance ID for English"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="english-token" className="text-green-200">Token (English)</Label>
              <Input
                id="english-token"
                type="text"
                value={englishToken}
                onChange={(e) => setEnglishToken(e.target.value)}
                className="bg-white/5 border-green-500/30 text-white"
                placeholder="Enter token for English"
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado actual Español */}
        <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
          <h4 className="text-blue-300 font-semibold mb-2">🇪🇸 Configuración Actual Español</h4>
          <p className="text-blue-200/70 text-sm">Instancia: {spanishInstance || 'No configurada'}</p>
          <p className="text-blue-200/70 text-sm">Token: {spanishToken || 'No configurado'}</p>
        </div>
        
        {/* Estado actual Inglés */}
        <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
          <h4 className="text-green-300 font-semibold mb-2">🇺🇸 Current English Configuration</h4>
          <p className="text-green-200/70 text-sm">Instance: {englishInstance || 'Not configured'}</p>
          <p className="text-green-200/70 text-sm">Token: {englishToken || 'Not configured'}</p>
        </div>
      </div>
    </div>
  );
};

export default InstanceSettings;