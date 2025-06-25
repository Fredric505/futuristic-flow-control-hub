
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Trash2, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    
    // Configurar subscripción en tiempo real para cambios en profiles
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Profile change detected:', payload);
          loadUsers(); // Recargar usuarios cuando hay cambios
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los perfiles de la tabla profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      console.log('Profiles loaded:', profiles);
      setUsers(profiles || []);
      
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Error al cargar usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    try {
      // Usar la función edge para eliminar el usuario
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: "Usuario eliminado exitosamente",
      });
      
      // No necesitamos llamar loadUsers() porque la subscripción en tiempo real lo hará
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar usuario",
        variant: "destructive",
      });
    }
  };

  const extendExpiration = async (userId: string, currentDate: string) => {
    try {
      const newDate = new Date(currentDate || new Date());
      newDate.setMonth(newDate.getMonth() + 1);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expiration_date: newDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Fecha extendida",
        description: "Fecha de expiración extendida por 1 mes",
      });
      
      // No necesitamos llamar loadUsers() porque la subscripción en tiempo real lo hará
    } catch (error: any) {
      console.error('Error extending expiration:', error);
      toast({
        title: "Error",
        description: error.message || "Error al extender fecha",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando usuarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-blue-300">Gestionar Usuarios ({users.length} usuarios)</CardTitle>
          <Button
            onClick={loadUsers}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-blue-200/70 text-center py-8">No hay usuarios registrados</p>
          ) : (
            users.map((user: any) => (
              <div key={user.id} className="bg-blue-950/30 rounded-lg p-4 border border-blue-500/20">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-blue-200 font-medium">{user.email}</p>
                    <p className="text-blue-200/70 text-sm">ID: {user.id}</p>
                    <p className="text-blue-200/70 text-sm">Créditos: {user.credits || 0}</p>
                    <p className="text-blue-200/70 text-sm">
                      Expira: {user.expiration_date ? new Date(user.expiration_date).toLocaleDateString() : 'No definida'}
                    </p>
                    <p className="text-blue-200/70 text-sm">
                      Creado: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'No disponible'}
                    </p>
                    <p className={`text-sm font-medium ${
                      user.expiration_date && new Date() > new Date(user.expiration_date) 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      {user.expiration_date && new Date() > new Date(user.expiration_date) ? 'EXPIRADO' : 'ACTIVO'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => extendExpiration(user.id, user.expiration_date)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                      title="Extender 1 mes"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    {user.email !== 'fredric@gmail.com' && (
                      <Button
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;
