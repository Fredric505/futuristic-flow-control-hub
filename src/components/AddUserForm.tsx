
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AddUserForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    credits: '',
    expirationDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Starting user creation process...');
      
      // Get admin session to use admin methods
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || session.user.email !== 'fredric@gmail.com') {
        throw new Error('No tienes permisos de administrador');
      }

      console.log('Admin verification passed, calling edge function...');

      // Use edge function to create user (admin only)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          credits: formData.credits,
          expirationDate: formData.expirationDate
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Error calling edge function');
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Usuario agregado",
        description: `Usuario ${formData.email} agregado exitosamente`,
      });
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        credits: '',
        expirationDate: ''
      });

    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Error al crear el usuario";
      
      if (error.message?.includes('Failed to send a request')) {
        errorMessage = "Error de conexión con el servidor. Verifica que la función esté desplegada correctamente.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Agregar Nuevo Usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-blue-200">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="bg-white/5 border-blue-500/30 text-white"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-blue-200">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="bg-white/5 border-blue-500/30 text-white"
              required
              minLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="credits" className="text-blue-200">Créditos</Label>
            <Input
              id="credits"
              type="number"
              value={formData.credits}
              onChange={(e) => setFormData({...formData, credits: e.target.value})}
              className="bg-white/5 border-blue-500/30 text-white"
              min="0"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expirationDate" className="text-blue-200">Fecha de Expiración</Label>
            <Input
              id="expirationDate"
              type="date"
              value={formData.expirationDate}
              onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
              className="bg-white/5 border-blue-500/30 text-white"
              required
            />
          </div>
          
          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {isLoading ? "Creando usuario..." : "Agregar Usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;
