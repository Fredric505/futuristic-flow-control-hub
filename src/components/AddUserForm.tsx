
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const AddUserForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    credits: '',
    expirationDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get existing users
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    
    // Check if user already exists
    if (existingUsers.find((user: any) => user.email === formData.email)) {
      toast({
        title: "Error",
        description: "Ya existe un usuario con este correo electrónico",
        variant: "destructive",
      });
      return;
    }
    
    // Add new user
    const newUser = {
      id: Date.now().toString(),
      email: formData.email,
      password: formData.password,
      credits: parseInt(formData.credits),
      expirationDate: formData.expirationDate,
      createdAt: new Date().toISOString()
    };
    
    existingUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
    
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
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            Agregar Usuario
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;
