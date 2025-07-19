
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import MessageHistory from '@/components/MessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import { LogOut, User, MessageSquare, Send, Bot } from 'lucide-react';

const UserDashboard = () => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userCredits, setUserCredits] = useState<number>(0);
  const [userExpirationDate, setUserExpirationDate] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits, expiration_date')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserCredits(profile.credits || 0);
        setUserExpirationDate(profile.expiration_date || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatExpirationDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha de vencimiento';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getDaysUntilExpiration = (dateString: string) => {
    if (!dateString) return null;
    const expirationDate = new Date(dateString);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration(userExpirationDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Panel de Usuario</h1>
            <p className="text-blue-200/70">Bienvenido, {userEmail}</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-300 text-sm">Créditos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{userCredits}</p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-300 text-sm">Estado de Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">Activa</p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-300 text-sm">Vencimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white">{formatExpirationDate(userExpirationDate)}</p>
              {daysUntilExpiration !== null && (
                <p className={`text-xs mt-1 ${daysUntilExpiration <= 7 ? 'text-red-400' : 'text-blue-200/70'}`}>
                  {daysUntilExpiration > 0 
                    ? `${daysUntilExpiration} días restantes`
                    : 'Cuenta expirada'
                  }
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="processes" className="space-y-6">
          <TabsList className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <TabsTrigger 
              value="processes" 
              className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300"
            >
              <Send className="h-4 w-4 mr-2" />
              Procesos
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensajes
            </TabsTrigger>
            <TabsTrigger 
              value="telegram" 
              className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300"
            >
              <Bot className="h-4 w-4 mr-2" />
              Bot Telegram
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="space-y-6">
            <ProcessForm userType="user" />
            <ProcessList userType="user" />
          </TabsContent>

          <TabsContent value="messages">
            <MessageHistory />
          </TabsContent>

          <TabsContent value="telegram">
            <TelegramBotConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
