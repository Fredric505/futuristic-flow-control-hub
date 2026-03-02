import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (session.user.email === 'fredric@gmail.com') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      }
    };
    checkAuth();

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-primary tracking-widest">
            ASTRO505
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">Acceso al sistema de gestión</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3"
              disabled={isLoading}
            >
              {isLoading ? "Autenticando..." : "ACCEDER AL SISTEMA"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 left-4 text-muted-foreground text-xs">
        <p>Contacto Admin: +50588897925</p>
      </div>
      <div className="fixed bottom-4 right-4 text-muted-foreground text-xs">
        <p>Versión 1.0.0</p>
      </div>
    </div>
  );
};

export default Login;
