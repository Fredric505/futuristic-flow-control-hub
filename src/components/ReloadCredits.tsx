
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ReloadCredits = () => {
  const [userEmail, setUserEmail] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Buscar el usuario por email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail.toLowerCase().trim())
        .single();

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
          <div className="space-y-2">
            <Label htmlFor="userEmail" className="text-blue-200">Correo del Usuario</Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="bg-white/5 border-blue-500/30 text-white"
              placeholder="ejemplo@correo.com"
              required
            />
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
