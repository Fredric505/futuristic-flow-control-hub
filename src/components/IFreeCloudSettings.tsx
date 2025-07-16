
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const IFreeCloudSettings = () => {
  const [loading, setLoading] = useState(true);
  const [testingApi, setTestingApi] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(false);
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

  const testConnection = async () => {
    try {
      setTestingApi(true);
      setLastTestResult(null);
      
      // Usar un IMEI de prueba para verificar la conexión
      const testImei = "353869224422213";
      
      console.log('Testing iFreeCloud API connection...');
      
      // Usar la función Edge de Supabase
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
          description: "La API de iFreeCloud está funcionando correctamente",
        });
      } else {
        // Manejar diferentes tipos de errores
        const errorMsg = data.error || 'Error desconocido';
        
        if (errorMsg.includes('Insufficient') || errorMsg.includes('credits')) {
          setLastTestResult({success: true, message: 'Conexión válida (sin créditos suficientes)'});
          toast({
            title: "✅ Conexión válida",
            description: "La API funciona pero no tienes créditos suficientes",
          });
        } else if (errorMsg.includes('Connection failed') || errorMsg.includes('Network error')) {
          setLastTestResult({success: false, message: 'Error de conectividad - Verificando múltiples endpoints'});
          toast({
            title: "⚠️ Problema de conectividad",
            description: "Se están probando múltiples endpoints. Esto puede ser temporal.",
            variant: "destructive",
          });
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('authentication')) {
          setLastTestResult({success: false, message: 'Error de autenticación con la API'});
          toast({
            title: "❌ Error de autenticación",
            description: "Problema con las credenciales de la API",
            variant: "destructive",
          });
        } else {
          setLastTestResult({success: false, message: errorMsg});
          toast({
            title: "❌ Error de conexión",
            description: errorMsg,
            variant: "destructive",
          });
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
              <strong>Configuración mejorada:</strong> La API ahora prueba múltiples endpoints 
              y métodos de conexión para asegurar la máxima disponibilidad del servicio.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={testConnection}
              disabled={testingApi}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30"
            >
              {testingApi ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Probando múltiples endpoints...
                </>
              ) : (
                'Probar Conexión API'
              )}
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
                ) : lastTestResult.message.includes('conectividad') ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <p className={`text-sm ${
                  lastTestResult.success ? 'text-green-300' : 
                  lastTestResult.message.includes('conectividad') ? 'text-yellow-300' : 'text-red-300'
                }`}>
                  {lastTestResult.message}
                </p>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-green-950/30 rounded-lg border border-green-500/20">
            <h4 className="text-green-300 font-semibold mb-2">Configuración Actual iFreeCloud</h4>
            <div className="space-y-1 text-sm">
              <p className="text-blue-200/70">Endpoints principales: api.ifreicloud.co.uk</p>
              <p className="text-blue-200/70">Métodos: POST y GET (fallback)</p>
              <p className="text-blue-200/70">Servicio: All-in-one (ID: 205)</p>
              <p className="text-blue-200/70">Clave API: FSV-NW9-V4F-ZJC-QQM-H34-5N6-KR1</p>
              <p className="text-blue-200/70">Timeout: 30 segundos por endpoint</p>
              <p className="text-blue-200/70">Costo: $0.25 por verificación exitosa</p>
            </div>
          </div>

          <div className="p-3 bg-yellow-950/30 rounded-lg border border-yellow-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-200/70">
                <p className="font-medium">Mejoras implementadas:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Prueba múltiples endpoints automáticamente</li>
                  <li>• Timeout extendido de 30 segundos</li>
                  <li>• Fallback POST → GET si es necesario</li>
                  <li>• Mejor manejo de respuestas JSON y texto plano</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IFreeCloudSettings;
