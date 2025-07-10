
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Globe } from 'lucide-react';

interface UserDomain {
  id: string;
  domain_name: string;
  subdomain_prefix: string;
  is_active: boolean;
  created_at: string;
}

const DomainManager = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<UserDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    domain_name: '',
    subdomain_prefix: ''
  });

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los dominios",
        variant: "destructive"
      });
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.domain_name || !formData.subdomain_prefix) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('user_domains')
        .insert({
          user_id: user.id,
          domain_name: formData.domain_name,
          subdomain_prefix: formData.subdomain_prefix
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Dominio agregado correctamente"
      });

      setFormData({ domain_name: '', subdomain_prefix: '' });
      loadDomains();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el dominio",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('user_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Dominio eliminado correctamente"
      });

      loadDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el dominio",
        variant: "destructive"
      });
    }
  };

  const toggleDomainStatus = async (domainId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_domains')
        .update({ is_active: !currentStatus })
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Dominio ${!currentStatus ? 'activado' : 'desactivado'} correctamente`
      });

      loadDomains();
    } catch (error) {
      console.error('Error toggling domain status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del dominio",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Agregar Nuevo Dominio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain_name" className="text-orange-200">
                  Dominio Principal
                </Label>
                <Input
                  id="domain_name"
                  placeholder="ubicacion-device.co"
                  value={formData.domain_name}
                  onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                  className="bg-black/20 border-orange-500/20 text-orange-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain_prefix" className="text-orange-200">
                  Prefijo de Subdominio
                </Label>
                <Input
                  id="subdomain_prefix"
                  placeholder="usuario1"
                  value={formData.subdomain_prefix}
                  onChange={(e) => setFormData({ ...formData, subdomain_prefix: e.target.value })}
                  className="bg-black/20 border-orange-500/20 text-orange-200"
                />
              </div>
            </div>

            <div className="text-sm text-orange-200/70 bg-orange-600/10 p-3 rounded-lg">
              URL resultante: {formData.subdomain_prefix}.{formData.domain_name}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Agregando...' : 'Agregar Dominio'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300">Mis Dominios</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-orange-200/70 text-center py-8">
              No tienes dominios configurados. Agrega uno para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="bg-black/20 border border-orange-500/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-orange-200 font-medium">
                        {domain.subdomain_prefix}.{domain.domain_name}
                      </h3>
                      <p className="text-orange-200/70 text-sm">
                        Estado: {domain.is_active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => toggleDomainStatus(domain.id, domain.is_active)}
                        size="sm"
                        variant="outline"
                        className={`border-orange-500/30 text-orange-300 hover:bg-orange-600/10 ${
                          domain.is_active ? 'bg-green-600/20' : 'bg-red-600/20'
                        }`}
                      >
                        {domain.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteDomain(domain.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-600/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainManager;
