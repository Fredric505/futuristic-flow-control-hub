
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Trash2, Edit, Calendar } from 'lucide-react';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    setUsers(registeredUsers);
  };

  const deleteUser = (userId: string) => {
    const updatedUsers = users.filter((user: any) => user.id !== userId);
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    toast({
      title: "Usuario eliminado",
      description: "Usuario eliminado exitosamente",
    });
  };

  const extendExpiration = (userId: string) => {
    const updatedUsers = users.map((user: any) => {
      if (user.id === userId) {
        const currentDate = new Date(user.expirationDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        return { ...user, expirationDate: currentDate.toISOString().split('T')[0] };
      }
      return user;
    });
    
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    toast({
      title: "Fecha extendida",
      description: "Fecha de expiración extendida por 1 mes",
    });
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Gestionar Usuarios</CardTitle>
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
                    <p className="text-blue-200/70 text-sm">Créditos: {user.credits}</p>
                    <p className="text-blue-200/70 text-sm">
                      Expira: {new Date(user.expirationDate).toLocaleDateString()}
                    </p>
                    <p className={`text-sm ${new Date() > new Date(user.expirationDate) ? 'text-red-400' : 'text-green-400'}`}>
                      {new Date() > new Date(user.expirationDate) ? 'Expirado' : 'Activo'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => extendExpiration(user.id)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => deleteUser(user.id)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
