
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Usuarios predefinidos
  const users = {
    'admin@admin.com': { password: 'admin123', role: 'admin' },
    'usuario@demo.com': { password: 'user123', role: 'user' }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular autenticación
    setTimeout(() => {
      const user = users[email as keyof typeof users];
      
      if (user && user.password === password) {
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('userEmail', email);
        
        toast({
          title: "Acceso concedido",
          description: `Bienvenido al sistema ${user.role === 'admin' ? 'Administrador' : 'Usuario'}`,
        });
        
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
      } else {
        toast({
          title: "Error de autenticación",
          description: "Credenciales incorrectas",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cg fill-opacity="0.03"%3E%3Cpolygon fill="%23ffffff" points="50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40"/%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border border-blue-500/20 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            SISTEMA EJECUTIVO
          </CardTitle>
          <p className="text-blue-200/70 mt-2">Panel de Control Futurista</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50 focus:border-blue-400"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/50 focus:border-blue-400"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3"
              disabled={isLoading}
            >
              {isLoading ? "Autenticando..." : "ACCEDER AL SISTEMA"}
            </Button>
          </form>
          
          <div className="mt-8 p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
            <p className="text-xs text-blue-200/70 mb-2">Credenciales de prueba:</p>
            <p className="text-xs text-blue-300">Admin: admin@admin.com / admin123</p>
            <p className="text-xs text-blue-300">Usuario: usuario@demo.com / user123</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="fixed bottom-4 left-4 text-blue-200/50 text-xs">
        <p>Contacto Admin: +50588897925</p>
      </div>
      
      <div className="fixed bottom-4 right-4 text-blue-200/50 text-xs">
        <p>Versión 1.0.0</p>
      </div>
    </div>
  );
};

export default Login;
