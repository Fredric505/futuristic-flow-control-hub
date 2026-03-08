
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, User, Search } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  credits: number;
}

const ReloadCredits = () => {
  const [userEmail, setUserEmail] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, credits')
      .order('email', { ascending: true });
    
    if (!error && data) {
      setUsers(data);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectUser = (email: string) => {
    setUserEmail(email);
    setShowDropdown(false);
    setSearchFilter('');
  };

  const handleReloadCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail || !creditsAmount) {
      toast({
        title: "Error",
        description: "Ingresa el correo del usuario y cantidad de créditos",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(creditsAmount) <= 0) {
      toast({
        title: "Error",
        description: "La cantidad de créditos debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Reloading credits for:', userEmail);

      // Buscar el usuario por email usando las nuevas políticas RLS
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail.toLowerCase().trim())
        .single();

      console.log('User lookup result:', { user, userError });

      if (userError || !user) {
        console.error('User not found:', userError);
        toast({
          title: "Error",
          description: "Usuario no encontrado. Verifica el correo electrónico.",
          variant: "destructive",
        });
        return;
      }

      // Sumar los créditos existentes con los nuevos
      const newCredits = (user.credits || 0) + parseInt(creditsAmount);

      console.log('Updating credits:', { userId: user.id, currentCredits: user.credits, addingCredits: parseInt(creditsAmount), newTotal: newCredits });

      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating credits:', error);
        throw error;
      }

      toast({
        title: "Créditos recargados",
        description: `Se agregaron ${creditsAmount} créditos a ${userEmail}. Total: ${newCredits} créditos`,
      });

      // Limpiar formulario
      setUserEmail('');
      setCreditsAmount('');

    } catch (error: any) {
      console.error('Error reloading credits:', error);
      toast({
        title: "Error",
        description: error.message || "Error al recargar créditos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Recargar Créditos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReloadCredits} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="userEmail" className="text-blue-200">Seleccionar Usuario</Label>
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-between bg-white/5 border border-blue-500/30 text-white rounded-md px-3 py-2 cursor-pointer hover:border-blue-400/50 transition-colors"
            >
              <span className={userEmail ? 'text-white' : 'text-muted-foreground'}>
                {userEmail || 'Selecciona un usuario...'}
              </span>
              <ChevronDown className={`h-4 w-4 text-blue-300 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-[hsl(220,30%,12%)] border border-blue-500/30 rounded-lg shadow-2xl max-h-64 overflow-hidden">
                <div className="p-2 border-b border-blue-500/20">
                  <div className="flex items-center gap-2 bg-white/5 rounded-md px-3 py-2">
                    <Search className="h-4 w-4 text-blue-300" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar usuario..."
                      className="bg-transparent text-white text-sm outline-none w-full placeholder:text-blue-200/40"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredUsers.length === 0 ? (
                    <p className="text-blue-200/50 text-sm text-center py-3">No se encontraron usuarios</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => selectUser(user.email)}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors hover:bg-blue-500/10 ${
                          userEmail === user.email ? 'bg-blue-500/20 border-l-2 border-blue-400' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-400" />
                          <span className="text-white text-sm">{user.email}</span>
                        </div>
                        <span className="text-blue-300/70 text-xs">{user.credits} créditos</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits" className="text-blue-200">Cantidad de Créditos</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Ingresa la cantidad"
              required
            />
          </div>
          
          <Button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {loading ? 'Recargando...' : 'Recargar Créditos'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReloadCredits;
