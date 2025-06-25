
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
      console.log('Loading all users from admin panel...');
      
      // Verificar que somos admin
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current admin session:', session?.user?.email);
      
      if (!session || session.user.email !== 'fredric@gmail.com') {
        console.log('Not admin user');
        setUsers([]);
        return;
      }

      // Cargar TODOS los perfiles sin filtros
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('All profiles query result:', { profiles, profileError });
      
      if (profileError) {
        console.error('Error fetching all profiles:', profileError);
        throw profileError;
      }

      console.log('All profiles loaded for admin:', profiles?.length || 0);
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
              <p className="text-blue-200/70 mb-4">No hay usuarios registrados</p>
              <p className="text-blue-200/50 text-sm">
                Los usuarios registrados aparecerán aquí. Verifica la conexión con la base de datos.
              </p>
            </div>
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
                      onClick={() => extendExpiration(user.id, user.expiration_date, user.email)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                      title="Extender 1 mes"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    {user.email !== 'fredric@gmail.com' && (
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageUsers;
