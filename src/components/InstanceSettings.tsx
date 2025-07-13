
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InstanceSettings = () => {
  const [instance, setInstance] = useState('');
  const [token, setToken] = useState('');
  const [ifreeUsername, setIfreeUsername] = useState('');
  const [ifreeKey, setIfreeKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingApi, setTestingApi] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token', 'ifree_username', 'ifree_key']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setInstance(settings?.whatsapp_instance || '');
      setToken(settings?.whatsapp_token || '');
      setIfreeUsername(settings?.ifree_username || '');
      setIfreeKey(settings?.ifree_key || '');
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
      const settings = [
        { key: 'whatsapp_instance', value: instance },
        { key: 'whatsapp_token', value: token },
        { key: 'ifree_username', value: ifreeUsername },
        { key: 'ifree_key', value: ifreeKey }
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

  const testIfreeApi = async () => {
    if (!ifreeUsername || !ifreeKey) {
      toast({
        title: "Datos incompletos",
        description: "Por favor ingresa el usuario y la clave de iFreeCloud",
        variant: "destructive",
      });
      return;
    }

    try {
      setTestingApi(true);
      
      // Test con un IMEI de ejemplo
      const testImei = "123456789012345";
      const response = await fetch(`https://ifreecloud.com/api/v2/imei-check/${testImei}?username=${ifreeUsername}&key=${ifreeKey}&service=205`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success || data.result) {
          toast({
            title: "Conexión exitosa",
            description: "Las credenciales de iFreeCloud son válidas",
          });
        } else {
          throw new Error('Respuesta inválida de la API');
        }
      } else {
        throw new Error(`Error ${response.status}: No se pudo conectar con la API de iFreeCloud. Verifique sus credenciales.`);
      }
    } catch (error: any) {
      console.error('Error testing iFree API:', error);
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con la API de iFreeCloud. Verifique sus credenciales.",
        variant: "destructive",
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token', 'ifree_username', 'ifree_key']);

      if (error) throw error;

      setInstance('');
      setToken('');
      setIfreeUsername('');
      setIfreeKey('');
      
      toast({
        title: "Configuración eliminada",
        description: "Instancia y token eliminados",
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
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Configuraciones de Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* WhatsApp Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-300">Configuración de WhatsApp</h3>
            <div className="space-y-2">
              <Label htmlFor="instance" className="text-blue-200">ID de Instancia</Label>
              <Input
                id="instance"
                type="text"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el ID de instancia"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token" className="text-blue-200">Token</Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa el token"
              />
            </div>
          </div>

          {/* iFreeCloud API Settings */}
          <div className="space-y-4 border-t border-blue-500/20 pt-6">
            <h3 className="text-lg font-semibold text-blue-300">Configuración API iFreeCloud</h3>
            <div className="space-y-2">
              <Label htmlFor="ifreeUsername" className="text-blue-200">Usuario iFreeCloud</Label>
              <Input
                id="ifreeUsername"
                type="text"
                value={ifreeUsername}
                onChange={(e) => setIfreeUsername(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa tu usuario de iFreeCloud"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ifreeKey" className="text-blue-200">Clave API iFreeCloud</Label>
              <Input
                id="ifreeKey"
                type="text"
                value={ifreeKey}
                onChange={(e) => setIfreeKey(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white"
                placeholder="Ingresa tu clave API de iFreeCloud"
              />
            </div>
            
            <Button 
              onClick={testIfreeApi}
              disabled={testingApi || !ifreeUsername || !ifreeKey}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            >
              {testingApi ? 'Probando...' : 'Probar Conexión API'}
            </Button>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Guardar Cambios
            </Button>
            <Button 
              onClick={handleDelete}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Eliminar
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-2">Configuración Actual</h4>
            <div className="space-y-1">
              <p className="text-blue-200/70 text-sm">Instancia WhatsApp: {instance || 'No configurada'}</p>
              <p className="text-blue-200/70 text-sm">Token WhatsApp: {token || 'No configurado'}</p>
              <p className="text-blue-200/70 text-sm">Usuario iFreeCloud: {ifreeUsername || 'No configurado'}</p>
              <p className="text-blue-200/70 text-sm">API iFreeCloud: {ifreeKey ? 'Configurada' : 'No configurada'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstanceSettings;
