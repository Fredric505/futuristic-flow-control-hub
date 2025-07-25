
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
      console.log('Loading users with new RLS policies...');
      
      // Verificar que el usuario actual esté autenticado
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.email);
      
      if (!session) {
        console.log('No active session');
        setUsers([]);
        return;
      }

      // Cargar todos los perfiles (las nuevas políticas RLS permiten al admin ver todos)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Profiles query result:', { profiles, profileError });
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        toast({
          title: "Error",
          description: `Error al cargar usuarios: ${profileError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Users loaded successfully:', profiles?.length || 0);
      setUsers(profiles || []);
      
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: `Error al cargar usuarios: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'fredric@gmail.com') {
      toast({
        title: "Error",
        description: "No puedes eliminar la cuenta de administrador",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar el usuario ${userEmail}?`)) {
      return;
    }

    try {
      console.log('Deleting user:', userId);
      
      // Usar la función edge para eliminar el usuario
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        console.error('Error from delete-user function:', error);
        throw error;
      }

      toast({
        title: "Usuario eliminado",
        description: "Usuario eliminado exitosamente",
      });
      
      // Recargar usuarios después de eliminar
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar usuario",
        variant: "destructive",
      });
    }
  };

  const extendExpiration = async (userId: string, currentDate: string, userEmail: string) => {
    if (userEmail === 'fredric@gmail.com') {
      toast({
        title: "Info",
        description: "El administrador no necesita extensión de fecha",
        variant: "default",
      });
      return;
    }

    try {
      console.log('Extending expiration for user:', userId);
      
      const newDate = new Date(currentDate || new Date());
      newDate.setMonth(newDate.getMonth() + 1);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expiration_date: newDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error extending expiration:', error);
        throw error;
      }

      toast({
        title: "Fecha extendida",
        description: `Fecha de expiración extendida por 1 mes para ${userEmail}`,
      });
      
      // Recargar usuarios después de actualizar
      await loadUsers();
    } catch (error: any) {
      console.error('Error extending expiration:', error);
      toast({
        title: "Error",
        description: error.message || "Error al extender fecha",
        variant: "destructive",
      });
    }
  };

  const isAdmin = (userEmail: string) => userEmail === 'fredric@gmail.com';

  const getExpirationStatus = (user: any) => {
    if (isAdmin(user.email)) {
      return { text: 'ADMIN - SIN EXPIRACIÓN', className: 'text-blue-400' };
    }
    
    if (!user.expiration_date) {
      return { text: 'No definida', className: 'text-yellow-400' };
    }

    const isExpired = new Date() > new Date(user.expiration_date);
    return {
      text: isExpired ? 'EXPIRADO' : 'ACTIVO',
      className: isExpired ? 'text-red-400' : 'text-green-400'
    };
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
            <div className="text-center py-8">
              <p className="text-blue-200/70 mb-4">No hay usuarios registrados o no tienes permisos para verlos</p>
              <p className="text-blue-200/50 text-sm">
                Si hay usuarios registrados, puede ser un problema de permisos. Contacta al administrador del sistema.
              </p>
            </div>
          ) : (
            users.map((user: any) => {
              const expirationStatus = getExpirationStatus(user);
              
              return (
                <div key={user.id} className="bg-blue-950/30 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <p className="text-blue-200 font-medium">
                        {user.email}
                        {isAdmin(user.email) && (
                          <span className="ml-2 px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded-full">
                            ADMINISTRADOR
                          </span>
                        )}
                      </p>
                      <p className="text-blue-200/70 text-sm">ID: {user.id}</p>
                      <p className="text-blue-200/70 text-sm">Créditos: {user.credits || 0}</p>
                      <p className="text-blue-200/70 text-sm">
                        Expira: {isAdmin(user.email) ? 'N/A (Admin)' : (user.expiration_date ? new Date(user.expiration_date).toLocaleDateString() : 'No definida')}
                      </p>
                      <p className="text-blue-200/70 text-sm">
                        Creado: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'No disponible'}
                      </p>
                      <p className={`text-sm font-medium ${expirationStatus.className}`}>
                        {expirationStatus.text}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      {!isAdmin(user.email) && (
                        <Button
                          size="sm"
                          onClick={() => extendExpiration(user.id, user.expiration_date, user.email)}
                          className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                          title="Extender 1 mes"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      )}
                      {!isAdmin(user.email) && (
                        <Button
                          size="sm"
                          onClick={() => deleteUser(user.id, user.email)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;
