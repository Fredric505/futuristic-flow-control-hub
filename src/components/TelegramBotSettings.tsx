
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Save, TestTube, ExternalLink } from 'lucide-react';

const TelegramBotSettings = () => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadBotSettings();
  }, []);

  const loadBotSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading bot settings:', error);
        throw error;
      }

      if (data) {
        setBotToken(data.bot_token || '');
        setChatId(data.chat_id || '');
        setIsActive(data.is_active ?? true);
      }
    } catch (error: any) {
      console.error('Error loading bot settings:', error);
      toast({
        title: "Error",
        description: "Error al cargar configuración del bot",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBotSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const botData = {
        user_id: user.id,
        bot_token: botToken.trim(),
        chat_id: chatId.trim(),
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('telegram_bots')
        .upsert(botData);

      if (error) {
        console.error('Error saving bot settings:', error);
        throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración de tu bot personal ha sido guardada exitosamente",
      });
    } catch (error: any) {
      console.error('Error saving bot settings:', error);
      toast({
        title: "Error",
        description: "Error al guardar configuración del bot",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testBotConnection = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el Token del Bot y Chat ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setTesting(true);
      
      const testMessage = `🤖 *Prueba de Bot Personal*\n\n✅ Tu bot de Telegram está configurado correctamente\n\n🕐 ${new Date().toLocaleString()}`;
      
      const response = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: testMessage,
          parse_mode: 'Markdown'
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "¡Conexión exitosa!",
          description: "El mensaje de prueba se ha enviado correctamente a tu bot",
        });
      } else {
        throw new Error(result.description || 'Error en la API de Telegram');
      }
    } catch (error: any) {
      console.error('Error testing bot:', error);
      toast({
        title: "Error de conexión",
        description: `No se pudo conectar con el bot: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Personal de Telegram
          </CardTitle>
          <p className="text-blue-200/70 text-sm">
            Configura tu bot personal para recibir notificaciones privadas de tus envíos
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="botToken" className="text-blue-300">
                Token del Bot
              </Label>
              <Input
                id="botToken"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="bg-black/30 border-blue-500/30 text-blue-200"
              />
              <p className="text-blue-200/50 text-xs">
                Token obtenido de @BotFather en Telegram
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatId" className="text-blue-300">
                Chat ID
              </Label>
              <Input
                id="chatId"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890 o 123456789"
                className="bg-black/30 border-blue-500/30 text-blue-200"
              />
              <p className="text-blue-200/50 text-xs">
                ID del chat o grupo donde quieres recibir las notificaciones
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
              <div>
                <Label htmlFor="isActive" className="text-blue-300">
                  Bot Activo
                </Label>
                <p className="text-blue-200/50 text-xs">
                  Habilitar/deshabilitar notificaciones en este bot
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={saveBotSettings}
              disabled={saving}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            
            <Button
              onClick={testBotConnection}
              disabled={testing || !botToken.trim() || !chatId.trim()}
              variant="outline"
              className="border-green-500/30 text-green-300 hover:bg-green-600/10 flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {testing ? 'Probando...' : 'Probar Conexión'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 text-lg">
            ¿Cómo configurar tu bot personal?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-blue-200/70 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">1</span>
              <div>
                <p className="font-medium text-blue-300">Crear un bot en Telegram</p>
                <p>Habla con @BotFather en Telegram y usa /newbot para crear tu bot personal</p>
                <Button
                  variant="link"
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs"
                  onClick={() => window.open('https://t.me/botfather', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir @BotFather
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">2</span>
              <div>
                <p className="font-medium text-blue-300">Obtener el Chat ID</p>
                <p>Envía un mensaje a tu bot y usa @userinfobot para obtener tu Chat ID, o usa @GetIDBot</p>
                <Button
                  variant="link"
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs"
                  onClick={() => window.open('https://t.me/userinfobot', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir @userinfobot
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">3</span>
              <div>
                <p className="font-medium text-blue-300">Configurar en el panel</p>
                <p>Copia el token del bot y tu Chat ID en los campos de arriba, luego guarda la configuración</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">4</span>
              <div>
                <p className="font-medium text-green-300">¡Listo!</p>
                <p>Ahora recibirás notificaciones privadas de todos tus envíos en tu bot personal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramBotSettings;
