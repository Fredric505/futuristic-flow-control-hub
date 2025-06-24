
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ReloadCredits = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Error al cargar usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReloadCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !creditsAmount) {
      toast({
        title: "Error",
        description: "Selecciona un usuario y cantidad de créditos",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = users.find((u: any) => u.id === selectedUser);
      const newCredits = (user as any).credits + parseInt(creditsAmount);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser);

      if (error) throw error;

      toast({
        title: "Créditos recargados",
        description: `Se agregaron ${creditsAmount} créditos a ${(user as any)?.email}`,
      });

      setSelectedUser('');
      setCreditsAmount('');
      loadUsers(); // Refresh the list

    } catch (error: any) {
      console.error('Error reloading credits:', error);
      toast({
        title: "Error",
        description: error.message || "Error al recargar créditos",
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
        <CardTitle className="text-blue-300">Recargar Créditos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReloadCredits} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-blue-200">Seleccionar Usuario</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="bg-white/5 border-blue-500/30 text-white">
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} (Créditos actuales: {user.credits})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="credits" className="text-blue-200">Cantidad de Créditos</Label>
            <Input
              id="credits"
              type="number"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="Ingresa la cantidad"
              required
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            Recargar Créditos
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReloadCredits;
