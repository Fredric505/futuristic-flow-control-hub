
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, MessageCircle, Eye, EyeOff } from 'lucide-react';

interface TelegramBot {
  id: string;
  bot_token: string;
  chat_id: string;
  is_active: boolean;
  created_at: string;
}

const TelegramBotManager = () => {
  const { toast } = useToast();
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokens, setShowTokens] = useState<{[key: string]: boolean}>({});
  const [formData, setFormData] = useState({
    bot_token: '',
    chat_id: ''
  });

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Error loading bots:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los bots de Telegram",
        variant: "destructive"
      });
    }
  };

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bot_token || !formData.chat_id) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('telegram_bots')
        .insert({
          user_id: user.id,
          bot_token: formData.bot_token,
          chat_id: formData.chat_id
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Bot de Telegram agregado correctamente"
      });

      setFormData({ bot_token: '', chat_id: '' });
      loadBots();
    } catch (error) {
      console.error('Error adding bot:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el bot de Telegram",
        variant: "destructive"
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
        title: "Éxito",
        description: "Bot de Telegram eliminado correctamente"
      });

      loadBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el bot de Telegram",
        variant: "destructive"
      });
    }
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('telegram_bots')
        .update({ is_active: !currentStatus })
        .eq('id', botId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Bot ${!currentStatus ? 'activado' : 'desactivado'} correctamente`
      });

      loadBots();
    } catch (error) {
      console.error('Error toggling bot status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del bot",
        variant: "destructive"
      });
    }
  };

  const toggleTokenVisibility = (botId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [botId]: !prev[botId]
    }));
  };

  const maskToken = (token: string, botId: string) => {
    if (showTokens[botId]) {
      return token;
    }
    return token.substring(0, 10) + '...' + token.substring(token.length - 6);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300 flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Agregar Bot de Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot_token" className="text-orange-200">
                Token del Bot
              </Label>
              <Input
                id="bot_token"
                placeholder="123456789:ABCdefGHijklMNopQRstUVwxyz"
                value={formData.bot_token}
                onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                className="bg-black/20 border-orange-500/20 text-orange-200"
              />
              <p className="text-xs text-orange-200/70">
                Obtén el token de @BotFather en Telegram
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat_id" className="text-orange-200">
                Chat ID
              </Label>
              <Input
                id="chat_id"
                placeholder="-1001234567890"
                value={formData.chat_id}
                onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                className="bg-black/20 border-orange-500/20 text-orange-200"
              />
              <p className="text-xs text-orange-200/70">
                ID del chat donde se enviarán los mensajes
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Agregando...' : 'Agregar Bot'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-orange-300">Mis Bots de Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          {bots.length === 0 ? (
            <p className="text-orange-200/70 text-center py-8">
              No tienes bots de Telegram configurados. Agrega uno para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-black/20 border border-orange-500/20 rounded-lg p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-orange-200 font-medium">
                          Bot ID: {bot.chat_id}
                        </h3>
                        <p className="text-orange-200/70 text-sm">
                          Estado: {bot.is_active ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                          size="sm"
                          variant="outline"
                          className={`border-orange-500/30 text-orange-300 hover:bg-orange-600/10 ${
                            bot.is_active ? 'bg-green-600/20' : 'bg-red-600/20'
                          }`}
                        >
                          {bot.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        
                        <Button
                          onClick={() => handleDeleteBot(bot.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-300 hover:bg-red-600/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-orange-200/70 text-sm font-mono">
                        {maskToken(bot.bot_token, bot.id)}
                      </span>
                      <Button
                        onClick={() => toggleTokenVisibility(bot.id)}
                        size="sm"
                        variant="ghost"
                        className="text-orange-300 hover:bg-orange-600/10"
                      >
                        {showTokens[bot.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramBotManager;
