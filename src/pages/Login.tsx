import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Redirect based on user role
        if (session.user.email === 'fredric@gmail.com') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (session.user.email === 'fredric@gmail.com') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if account is not expired (for regular users)
        if (email !== 'fredric@gmail.com') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('expiration_date')
            .eq('id', data.user.id)
            .single();

          if (profile && profile.expiration_date && new Date() > new Date(profile.expiration_date)) {
            await supabase.auth.signOut();
            toast({
              title: "Cuenta expirada",
              description: "Tu cuenta ha expirado. Contacta al administrador.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }

        toast({
          title: "Acceso concedido",
          description: `Bienvenido ${email === 'fredric@gmail.com' ? 'al Panel Administrativo' : 'al Panel de Usuario'}`,
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.03'%3E%3Cpolygon fill='%23ffffff' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border border-blue-500/20 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            ASTRO505
          </CardTitle>
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
