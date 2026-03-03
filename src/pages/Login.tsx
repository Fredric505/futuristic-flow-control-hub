import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Mail, Sparkles, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(session.user.email === 'fredric@gmail.com' ? '/admin/dashboard' : '/user/dashboard');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate(session.user.email === 'fredric@gmail.com' ? '/admin/dashboard' : '/user/dashboard');
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

          if (profile?.expiration_date && new Date() > new Date(profile.expiration_date)) {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl gold-gradient mb-4 glow-gold animate-float">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold gold-text tracking-wider font-['Space_Grotesk']">
            ASTRO505
          </h1>
          <p className="text-muted-foreground text-sm mt-2 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Sistema de gestión profesional
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card glow-card rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-accent/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-accent/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 h-11"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gold-gradient text-primary-foreground font-bold py-3 h-12 text-base tracking-wide hover:opacity-90 transition-all duration-300 glow-gold"
              disabled={isLoading}
            >
              {isLoading ? "Autenticando..." : "ACCEDER"}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground/50">
          <span>Contacto: +50588897925</span>
          <span>v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
