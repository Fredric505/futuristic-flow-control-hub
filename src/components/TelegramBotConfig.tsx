
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Save, TestTube } from 'lucide-react';

const TelegramBotConfig = () => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data && !error) {
        setBotToken(data.bot_token);
        setChatId(data.chat_id);
        setHasExistingConfig(true);
      }
    } catch (error) {
      console.log('No existing config found');
    }
  };

  const testTelegramBot = async () => {
    if (!botToken || !chatId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tanto el token del bot como el chat ID",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const testMessage = `🔔 Alerta de proceso de WhatsApp... 👩🏽‍💻👩🏽‍💻Server Astro 🤖Bot Astro online🟢

✅ Test de configuración exitoso
📱 Tu bot de Telegram está funcionando correctamente
🕐 ${new Date().toLocaleString()}`;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "✅ Test exitoso",
          description: "El mensaje de prueba se envío correctamente a Telegram",
        });
      } else {
        throw new Error(result.description || 'Error en la API de Telegram');
      }
    } catch (error: any) {
      console.error('Error testing Telegram bot:', error);
      toast({
        title: "❌ Error en el test",
        description: `No se pudo enviar el mensaje: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!botToken || !chatId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      if (hasExistingConfig) {
        // Actualizar configuración existente
        const { error } = await supabase
          .from('telegram_bots')
          .update({
            bot_token: botToken,
            chat_id: chatId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await supabase
          .from('telegram_bots')
          .insert({
            user_id: session.user.id,
            bot_token: botToken,
            chat_id: chatId
          });

        if (error) throw error;
        setHasExistingConfig(true);
      }

      toast({
        title: "✅ Configuración guardada",
        description: "Tu bot de Telegram ha sido configurado correctamente",
      });
    } catch (error: any) {
      console.error('Error saving Telegram config:', error);
      toast({
        title: "❌ Error",
        description: `Error al guardar configuración: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Configuración de Bot de Telegram
        </CardTitle>
        <p className="text-blue-200/70 text-sm">
          Configura tu bot personal de Telegram para recibir notificaciones de respuestas a tus procesos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="botToken" className="text-blue-200">
            Token del Bot de Telegram
          </Label>
          <Input
            id="botToken"
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="bg-white/5 border-blue-500/30 text-white"
          />
          <p className="text-xs text-blue-200/60">
            Obtén tu token creando un bot con @BotFather en Telegram
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatId" className="text-blue-200">
            Chat ID
          </Label>
          <Input
            id="chatId"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="123456789"
            className="bg-white/5 border-blue-500/30 text-white"
          />
          <p className="text-xs text-blue-200/60">
            Tu Chat ID personal. Usa @userinfobot en Telegram para obtenerlo
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testTelegramBot}
            disabled={isTesting || !botToken || !chatId}
            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300"
          >
            {isTesting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-300"></div>
                Probando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Probar Bot
              </div>
            )}
          </Button>

          <Button
            onClick={saveConfig}
            disabled={isLoading || !botToken || !chatId}
            className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-300"></div>
                Guardando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {hasExistingConfig ? 'Actualizar' : 'Guardar'}
              </div>
            )}
          </Button>
        </div>

        <div className="bg-blue-900/20 p-4 rounded-lg">
          <h4 className="text-blue-300 font-medium mb-2">📋 Instrucciones:</h4>
          <ol className="text-sm text-blue-200/80 space-y-1 list-decimal list-inside">
            <li>Busca @BotFather en Telegram y crea un nuevo bot</li>
            <li>Copia el token que te proporciona BotFather</li>
            <li>Busca @userinfobot en Telegram para obtener tu Chat ID</li>
            <li>Pega ambos valores aquí y prueba la configuración</li>
            <li>Una vez funcionando, guarda la configuración</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramBotConfig;
