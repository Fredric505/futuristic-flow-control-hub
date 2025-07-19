
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Bot, Plus } from 'lucide-react';

interface TelegramBot {
  id: string;
  bot_token: string;
  chat_id: string;
  bot_name: string;
  is_active: boolean;
  created_at: string;
}

interface UserDomain {
  id: string;
  subdomain_prefix: string;
  domain_name: string;
  is_active: boolean;
}

const TelegramBotConfig = () => {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [userDomain, setUserDomain] = useState<UserDomain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bot_token: '',
    chat_id: '',
    bot_name: '',
    subdomain_prefix: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar bots del usuario
      const { data: botsData } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (botsData) setBots(botsData);

      // Cargar dominio del usuario
      const { data: domainData } = await supabase
        .from('user_domains')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (domainData) setUserDomain(domainData);

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const generateSubdomain = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generar un subdominio único basado en el email del usuario
    const emailPrefix = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `${emailPrefix}${randomSuffix}`;
    
    setFormData(prev => ({ ...prev, subdomain_prefix: subdomain }));
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar token del bot
      const botResponse = await fetch(`https://api.telegram.org/bot${formData.bot_token}/getMe`);
      if (!botResponse.ok) {
        throw new Error('Token de bot inválido');
      }

      // Guardar el bot
      const { error: botError } = await supabase
        .from('telegram_bots')
        .insert({
          user_id: user.id,
          bot_token: formData.bot_token,
          chat_id: formData.chat_id,
          bot_name: formData.bot_name || 'Mi Bot'
        });

      if (botError) throw botError;

      // Si no existe dominio, crear uno
      if (!userDomain && formData.subdomain_prefix) {
        const domainName = `${formData.subdomain_prefix}.astro505.com`;
        const { error: domainError } = await supabase
          .from('user_domains')
          .insert({
            user_id: user.id,
            subdomain_prefix: formData.subdomain_prefix,
            domain_name: domainName
          });

        if (domainError) throw domainError;
      }

      toast({
        title: "Bot configurado",
        description: "Tu bot de Telegram ha sido configurado exitosamente",
      });

      setFormData({
        bot_token: '',
        chat_id: '',
        bot_name: '',
        subdomain_prefix: ''
      });

      loadUserData();

    } catch (error: any) {
      console.error('Error saving bot:', error);
      toast({
        title: "Error",
        description: error.message || "Error al configurar el bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      const { error } = await supabase
        .from('telegram_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Bot eliminado",
        description: "El bot ha sido eliminado exitosamente",
      });

      loadUserData();

    } catch (error: any) {
      console.error('Error deleting bot:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el bot",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuración de Bot de Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userDomain && (
              <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
                <h4 className="text-blue-300 font-semibold mb-2">Tu Dominio Asignado</h4>
                <p className="text-blue-200/70 text-sm">
                  <strong>Subdominio:</strong> {userDomain.subdomain_prefix}
                </p>
                <p className="text-blue-200/70 text-sm">
                  <strong>Dominio completo:</strong> {userDomain.domain_name}
                </p>
                <p className="text-xs text-blue-200/50 mt-2">
                  Este dominio se usará para identificar tus respuestas de WhatsApp
                </p>
              </div>
            )}

            <form onSubmit={handleSaveBot} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bot_name" className="text-blue-200">Nombre del Bot</Label>
                  <Input
                    id="bot_name"
                    value={formData.bot_name}
                    onChange={(e) => setFormData(prev => ({...prev, bot_name: e.target.value}))}
                    className="bg-white/5 border-blue-500/30 text-white"
                    placeholder="Mi Bot Personal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bot_token" className="text-blue-200">Token del Bot</Label>
                  <Input
                    id="bot_token"
                    value={formData.bot_token}
                    onChange={(e) => setFormData(prev => ({...prev, bot_token: e.target.value}))}
                    className="bg-white/5 border-blue-500/30 text-white"
                    placeholder="1234567890:ABCdefGhIjKlMnOpQrStUvWxYz"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chat_id" className="text-blue-200">Chat ID</Label>
                  <Input
                    id="chat_id"
                    value={formData.chat_id}
                    onChange={(e) => setFormData(prev => ({...prev, chat_id: e.target.value}))}
                    className="bg-white/5 border-blue-500/30 text-white"
                    placeholder="-1001234567890"
                    required
                  />
                </div>

                {!userDomain && (
                  <div className="space-y-2">
                    <Label htmlFor="subdomain_prefix" className="text-blue-200">Subdominio</Label>
                    <div className="flex gap-2">
                      <Input
                        id="subdomain_prefix"
                        value={formData.subdomain_prefix}
                        onChange={(e) => setFormData(prev => ({...prev, subdomain_prefix: e.target.value}))}
                        className="bg-white/5 border-blue-500/30 text-white"
                        placeholder="cliente1"
                        required
                      />
                      <Button
                        type="button"
                        onClick={generateSubdomain}
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                      >
                        Generar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={isLoading}
              >
                {isLoading ? 'Configurando...' : 'Configurar Bot'}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <h4 className="text-blue-300 font-semibold">Instrucciones:</h4>
              <div className="text-blue-200/70 text-sm space-y-2">
                <p>1. Crea un bot en Telegram hablando con @BotFather</p>
                <p>2. Copia el token que te da @BotFather</p>
                <p>3. Agrega tu bot al canal/grupo donde quieres recibir notificaciones</p>
                <p>4. Obtén el Chat ID del canal/grupo (puedes usar @userinfobot)</p>
                <p>5. Completa el formulario arriba con estos datos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {bots.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300">Bots Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bots.map((bot) => (
                <div key={bot.id} className="flex items-center justify-between p-3 bg-blue-950/30 rounded-lg border border-blue-500/20">
                  <div>
                    <p className="text-blue-200 font-medium">{bot.bot_name}</p>
                    <p className="text-blue-200/60 text-sm">
                      Token: {bot.bot_token.substring(0, 10)}... | Chat ID: {bot.chat_id}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteBot(bot.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TelegramBotConfig;
