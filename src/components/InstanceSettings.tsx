
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const InstanceSettings = () => {
  const [instance, setInstance] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Load default instance and token
    const savedInstance = localStorage.getItem('systemInstance') || 'instance126876';
    const savedToken = localStorage.getItem('systemToken') || '4ecj8581tubua7ry';
    
    setInstance(savedInstance);
    setToken(savedToken);
    
    // Set defaults if not exists
    if (!localStorage.getItem('systemInstance')) {
      localStorage.setItem('systemInstance', 'instance126876');
      localStorage.setItem('systemToken', '4ecj8581tubua7ry');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('systemInstance', instance);
    localStorage.setItem('systemToken', token);
    
    toast({
      title: "Configuración guardada",
      description: "Instancia y token actualizados exitosamente",
    });
  };

  const handleDelete = () => {
    setInstance('');
    setToken('');
    localStorage.removeItem('systemInstance');
    localStorage.removeItem('systemToken');
    
    toast({
      title: "Configuración eliminada",
      description: "Instancia y token eliminados",
      variant: "destructive",
    });
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Configuraciones de Sistema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
            <p className="text-blue-200/70 text-sm">Instancia: {instance || 'No configurada'}</p>
            <p className="text-blue-200/70 text-sm">Token: {token || 'No configurado'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstanceSettings;
