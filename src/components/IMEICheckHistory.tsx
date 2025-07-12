
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<IMEICheck | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('imei_checks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChecks(data || []);
    } catch (error) {
      console.error('Error loading IMEI check history:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Verificaciones IMEI
            <Button
              onClick={loadHistory}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="ml-auto border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <div className="text-center py-8 text-blue-200/70">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay verificaciones en el historial</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-500/20">
                    <TableHead className="text-blue-200">Fecha</TableHead>
                    <TableHead className="text-blue-200">Tipo</TableHead>
                    <TableHead className="text-blue-200">Valor</TableHead>
                    <TableHead className="text-blue-200">Dispositivo</TableHead>
                    <TableHead className="text-blue-200">Estado</TableHead>
                    <TableHead className="text-blue-200">Créditos</TableHead>
                    <TableHead className="text-blue-200">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check) => (
                    <TableRow key={check.id} className="border-blue-500/20 hover:bg-blue-600/5">
                      <TableCell className="text-blue-200">
                        {formatDate(check.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-600/20 text-blue-300">
                          {check.search_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200 font-mono">
                        {check.search_value}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {check.device_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={check.status === 'success' 
                            ? 'bg-green-600/20 text-green-300' 
                            : 'bg-red-600/20 text-red-300'
                          }
                        >
                          {check.status === 'success' ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200">
                        -{check.credits_deducted}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => setSelectedCheck(check)}
                          variant="outline"
                          size="sm"
                          className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
                        >
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCheck && (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center justify-between">
              Detalles de Verificación
              <Button
                onClick={() => setSelectedCheck(null)}
                variant="outline"
                size="sm"
                className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
              >
                Cerrar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCheck.status === 'success' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-blue-200/70 text-sm">Dispositivo</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.device_name}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Modelo</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.model}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Color</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.color}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Almacenamiento</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.storage}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Operadora</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.carrier}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Garantía</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.warranty}</p>
                </div>
                <div>
                  <Label className="text-blue-200/70 text-sm">Número de Serie</Label>
                  <p className="text-blue-200 font-medium">{selectedCheck.serial_number}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/30 p-4 rounded-lg border border-red-500/20">
                <Label className="text-red-300 text-sm font-medium">Error</Label>
                <p className="text-red-200 mt-1">{selectedCheck.error_message}</p>
              </div>
            )}

            {selectedCheck.status === 'success' && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge 
                  className={selectedCheck.find_my_iphone ? 'bg-red-600' : 'bg-green-600'}
                >
                  Find My iPhone: {selectedCheck.find_my_iphone ? 'Activado' : 'Desactivado'}
                </Badge>
                <Badge 
                  className={selectedCheck.activation_lock ? 'bg-red-600' : 'bg-green-600'}
                >
                  Activation Lock: {selectedCheck.activation_lock ? 'Activado' : 'Desactivado'}
                </Badge>
                <Badge 
                  className={selectedCheck.blacklist_status === 'Clean' ? 'bg-green-600' : 'bg-red-600'}
                >
                  Estado: {selectedCheck.blacklist_status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IMEICheckHistory;
