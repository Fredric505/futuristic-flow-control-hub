import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SafeSelect from '@/components/SafeSelect';
import { SelectItem } from '@/components/ui/select';

const IMEIChecker = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState('imei');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    loadUserCredits();
  }, []);

  const loadUserCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      setUserCredits(profile?.credits || 0);
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const checkIMEI = async () => {
    if (!searchValue.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa un IMEI o número de serie",
        variant: "destructive",
      });
      return;
    }

    if (userCredits < 0.25) {
      toast({
        title: "Créditos insuficientes",
        description: "Necesitas al menos 0.25 créditos para realizar una verificación",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChecking(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('check-imei', {
        body: {
          searchValue: searchValue.trim(),
          searchType: searchType
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setResult(data.data);
        setUserCredits(prev => prev - 0.25);
        toast({
          title: "Verificación exitosa",
          description: "IMEI verificado correctamente",
        });
      } else {
        throw new Error(data.error || 'Error en la verificación');
      }

    } catch (error: any) {
      console.error('Error checking IMEI:', error);
      toast({
        title: "Error de verificación",
        description: error.message || "Error al verificar IMEI/Serie",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center justify-between">
            Verificador IMEI/Serie
            <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
              Créditos: {userCredits.toFixed(2)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-200">Tipo de búsqueda</Label>
                <SafeSelect 
                  value={searchType} 
                  onValueChange={setSearchType}
                  placeholder="Selecciona tipo"
                  className="bg-white/5 border-blue-500/30 text-white"
                >
                  <SelectItem value="imei">IMEI</SelectItem>
                  <SelectItem value="serial">Número de Serie</SelectItem>
                </SafeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchValue" className="text-blue-200">
                  {searchType === 'imei' ? 'IMEI' : 'Número de Serie'}
                </Label>
                <Input
                  id="searchValue"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="bg-white/5 border-blue-500/30 text-white"
                  placeholder={searchType === 'imei' ? 'Ingresa el IMEI' : 'Ingresa el número de serie'}
                />
              </div>
            </div>

            <Button 
              onClick={checkIMEI}
              disabled={isChecking || userCredits < 0.25}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Verificar ({searchType === 'imei' ? 'IMEI' : 'Serie'}) - 0.25 créditos
                </>
              )}
            </Button>

            {userCredits < 0.25 && (
              <div className="p-3 bg-red-950/30 rounded-lg border border-red-500/20">
                <p className="text-red-300 text-sm">
                  No tienes créditos suficientes. Contacta al administrador para recargar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-300">Resultado de Verificación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-200">Nombre del Dispositivo</Label>
                <p className="text-white">{result.device_name || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Modelo</Label>
                <p className="text-white">{result.model || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Color</Label>
                <p className="text-white">{result.color || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Almacenamiento</Label>
                <p className="text-white">{result.storage || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Operador</Label>
                <p className="text-white">{result.carrier || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Garantía</Label>
                <p className="text-white">{result.warranty || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Find My iPhone</Label>
                <Badge variant={result.find_my_iphone ? "destructive" : "secondary"}>
                  {result.find_my_iphone ? 'Activado' : 'Desactivado'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Activation Lock</Label>
                <Badge variant={result.activation_lock ? "destructive" : "secondary"}>
                  {result.activation_lock ? 'Activado' : 'Desactivado'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-200">Estado de Lista Negra</Label>
                <p className="text-white">{result.blacklist_status || 'No disponible'}</p>
              </div>
              
              {result.serial_number && (
                <div className="space-y-2">
                  <Label className="text-blue-200">Número de Serie</Label>
                  <p className="text-white">{result.serial_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IMEIChecker;