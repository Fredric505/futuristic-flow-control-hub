import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IMEICheck {
  id: string;
  search_type: string;
  search_value: string;
  device_name: string | null;
  model: string | null;
  color: string | null;
  storage: string | null;
  carrier: string | null;
  warranty: string | null;
  find_my_iphone: boolean | null;
  activation_lock: boolean | null;
  blacklist_status: string | null;
  serial_number: string | null;
  credits_deducted: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

const IMEICheckHistory = () => {
  const [checks, setChecks] = useState<IMEICheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('imei_checks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChecks(data || []);
    } catch (error: any) {
      console.error('Error loading IMEI check history:', error);
      toast({
        title: "Error",
        description: "Error al cargar el historial de verificaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-300">
          Historial de Verificaciones IMEI ({checks.length})
        </h2>
        <Button
          onClick={loadHistory}
          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {checks.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <Search className="h-12 w-12 text-blue-300/50 mx-auto mb-4" />
              <p className="text-blue-200/70 mb-2">No hay verificaciones registradas</p>
              <p className="text-blue-200/50 text-sm">
                Las verificaciones de IMEI y números de serie aparecerán aquí.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checks.map((check) => (
            <Card key={check.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-blue-300 flex items-center gap-2">
                      {check.search_type === 'imei' ? 'IMEI' : 'Serie'}: {check.search_value}
                      {check.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                    </CardTitle>
                    <p className="text-blue-200/70 text-sm">
                      {formatDate(check.created_at)} • Créditos: {check.credits_deducted}
                    </p>
                  </div>
                  <Badge 
                    variant={check.status === 'success' ? 'default' : 'destructive'}
                    className={check.status === 'success' ? 'bg-green-600' : 'bg-red-600'}
                  >
                    {check.status === 'success' ? 'Exitoso' : 'Error'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {check.status === 'success' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-blue-200/60 text-xs">Dispositivo</p>
                      <p className="text-white text-sm">{check.device_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200/60 text-xs">Modelo</p>
                      <p className="text-white text-sm">{check.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200/60 text-xs">Color</p>
                      <p className="text-white text-sm">{check.color || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200/60 text-xs">Almacenamiento</p>
                      <p className="text-white text-sm">{check.storage || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200/60 text-xs">Operador</p>
                      <p className="text-white text-sm">{check.carrier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200/60 text-xs">Garantía</p>
                      <p className="text-white text-sm">{check.warranty || 'N/A'}</p>
                    </div>
                    
                    <div className="md:col-span-3 flex gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-200/60 text-xs">Find My iPhone:</span>
                        <Badge variant={check.find_my_iphone ? "destructive" : "secondary"} className="text-xs">
                          {check.find_my_iphone ? 'Activado' : 'Desactivado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-200/60 text-xs">Activation Lock:</span>
                        <Badge variant={check.activation_lock ? "destructive" : "secondary"} className="text-xs">
                          {check.activation_lock ? 'Activado' : 'Desactivado'}
                        </Badge>
                      </div>
                      {check.blacklist_status && (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-200/60 text-xs">Lista Negra:</span>
                          <span className="text-white text-xs">{check.blacklist_status}</span>
                        </div>
                      )}
                    </div>
                    
                    {check.serial_number && (
                      <div className="md:col-span-3">
                        <p className="text-blue-200/60 text-xs">Número de Serie</p>
                        <p className="text-white text-sm font-mono">{check.serial_number}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-red-950/30 rounded-lg border border-red-500/20">
                    <p className="text-red-300 text-sm">
                      {check.error_message || 'Error desconocido en la verificación'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IMEICheckHistory;