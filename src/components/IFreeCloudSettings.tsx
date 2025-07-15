
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const IFreeCloudSettings = () => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingApi, setTestingApi] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['ifree_username', 'ifree_key']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setUsername(settings?.ifree_username || '');
      setApiKey(settings?.ifree_key || '');
    } catch (error) {
      console.error('Error loading iFreeCloud settings:', error);
      toast({
        title: "Error",
        description: "Error al cargar configuraciones de iFreeCloud",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const settings = [
        { key: 'ifree_username', value: username },
        { key: 'ifree_key', value: apiKey }
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
        description: "Configuración de iFreeCloud actualizada exitosamente",
      });
    } catch (error: any) {
      console.error('Error saving iFreeCloud settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar configuración de iFreeCloud",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    if (!username || !apiKey) {
      toast({
        title: "Datos incompletos",
        description: "Por favor ingresa el usuario y la clave API de iFreeCloud",
        variant: "destructive",
      });
      return;
    }

    try {
      setTestingApi(true);
      setLastTestResult(null);
      
      // Usar un IMEI de prueba para verificar la conexión
      const testImei = "353869224422213";
      
      console.log('Testing iFreeCloud API connection...');
      
      // Usar la función Edge de Supabase en lugar de llamar directamente a la API
      const { data, error } = await supabase.functions.invoke('check-imei', {
        body: {
          searchValue: testImei,
          searchType: 'imei'
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Test response:', data);
      
      if (data.success) {
        setLastTestResult({success: true, message: 'Conexión exitosa con iFreeCloud API'});
        toast({
          title: "✅ Conexión exitosa",
          description: "Las credenciales de iFreeCloud son válidas y funcionan correctamente",
        });
      } else {
        // Manejar diferentes tipos de errores
        const errorMsg = data.error || 'Error desconocido';
        
        if (errorMsg.includes('Insufficient') || errorMsg.includes('credits')) {
          setLastTestResult({success: true, message: 'Credenciales válidas (sin créditos suficientes)'});
          toast({
            title: "✅ Credenciales válidas",
            description: "Las credenciales son correctas pero no tienes créditos suficientes en iFreeCloud",
          });
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('authentication')) {
          setLastTestResult({success: false, message: 'Credenciales inválidas'});
          toast({
            title: "❌ Credenciales inválidas",
            description: "Usuario o clave API incorrectos",
            variant: "destructive",
          });
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Error testing iFreeCloud API:', error);
      setLastTestResult({success: false, message: error.message});
      toast({
        title: "❌ Error de conexión",
        description: `No se pudo conectar: ${error.message}`,
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
        .in('setting_key', ['ifree_username', 'ifree_key']);

      if (error) throw error;

      setUsername('');
      setApiKey('');
      setLastTestResult(null);
      
      toast({
        title: "Configuración eliminada",
        description: "Configuración de iFreeCloud eliminada",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Error deleting iFreeCloud settings:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar configuración de iFreeCloud",
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
    <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
      <CardHeader>
        <CardTitle className="text-green-300">Configuración API iFreeCloud</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-500/20">
            <p className="text-blue-200/70 text-sm">
              <strong>Instrucciones:</strong> Ingresa tus credenciales de iFreeCloud API. 
              Puedes obtenerlas desde tu panel de iFreeCloud.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-blue-200">Usuario iFreeCloud</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Tu usuario de iFreeCloud"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-blue-200">Clave API iFreeCloud</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Tu clave API de iFreeCloud"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={testConnection}
              disabled={testingApi || !username || !apiKey}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            >
              {testingApi ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                'Probar Conexión'
              )}
            </Button>
            
            <Button 
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Guardar iFreeCloud
            </Button>
            
            <Button 
              onClick={handleDelete}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Eliminar
            </Button>
          </div>

          {lastTestResult && (
            <div className={`p-3 rounded-lg border ${
              lastTestResult.success 
                ? 'bg-green-950/30 border-green-500/20' 
                : 'bg-red-950/30 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {lastTestResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <p className={`text-sm ${
                  lastTestResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {lastTestResult.message}
                </p>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
            <h4 className="text-green-300 font-semibold mb-2">Configuración Actual iFreeCloud</h4>
            <div className="space-y-1">
              <p className="text-blue-200/70 text-sm">Usuario: {username || 'No configurado'}</p>
              <p className="text-blue-200/70 text-sm">API Key: {apiKey ? '••••••••••••' : 'No configurada'}</p>
              <p className="text-blue-200/70 text-sm">Servicio: All-in-one (ID: 205) - Costo: $0.25</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IFreeCloudSettings;
