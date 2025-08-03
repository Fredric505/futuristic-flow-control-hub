
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TelegramBotConfig = () => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadTelegramConfig();
  }, []);

  const loadTelegramConfig = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_bot_token, telegram_chat_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBotToken((profile as any).telegram_bot_token || '');
        setChatId((profile as any).telegram_chat_id || '');
      }
    } catch (error) {
      console.error('Error loading Telegram config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para activar el bot automáticamente
  const activateBot = async (token: string, chat: string) => {
    try {
      const activationMessage = `🤖 **Bot de Telegram Activado**

✅ ¡Tu bot está ahora configurado y listo para recibir notificaciones!

📅 Fecha de activación: ${new Date().toLocaleString('es-ES')}
🔧 Sistema: Astro505
👤 Estado: Activo

Este mensaje confirma que tu bot de Telegram está correctamente configurado y puede recibir notificaciones de códigos de verificación automáticamente.

🚀 **Tu bot ya está funcionando** - No necesitas hacer nada más.`;

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chat,
          text: activationMessage,
          parse_mode: 'Markdown'
        }),
      });

      const result = await response.json();
      return response.ok;
    } catch (error) {
      console.error('Error activating bot:', error);
      return false;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botToken.trim() || !chatId.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primero activar el bot para establecer la comunicación
      console.log('Activating Telegram bot for first-time setup...');
      const botActivated = await activateBot(botToken.trim(), chatId.trim());

      if (!botActivated) {
        toast({
          title: "Error de configuración",
          description: "No se pudo conectar con tu bot de Telegram. Verifica tu token y Chat ID.",
          variant: "destructive",
        });
        return;
      }

      // Si la activación fue exitosa, guardar la configuración
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_bot_token: botToken.trim(),
          telegram_chat_id: chatId.trim()
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "¡Configuración guardada y bot activado!",
        description: "Tu bot de Telegram ha sido configurado correctamente y está listo para recibir notificaciones automáticamente.",
      });
    } catch (error: any) {
      console.error('Error saving Telegram config:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa y guarda la configuración antes de probar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    try {
      const testMessage = `🧪 **Mensaje de Prueba Manual**

✅ ¡Tu bot está funcionando correctamente!

📅 Fecha: ${new Date().toLocaleString('es-ES')}
🔧 Sistema: Astro505
👤 Usuario: Prueba manual

Este es un mensaje de prueba manual para verificar que tu bot de Telegram puede recibir mensajes correctamente.

💡 **Nota**: Tu bot ya se activó automáticamente cuando guardaste la configuración, por lo que debería recibir notificaciones sin problemas.`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: 'Markdown'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "¡Prueba exitosa!",
          description: "El mensaje de prueba se envió correctamente a tu bot de Telegram",
        });
      } else {
        console.error('Telegram API error:', result);
        toast({
          title: "Error en la prueba",
          description: result.description || "Error al enviar el mensaje de prueba",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error testing Telegram bot:', error);
      toast({
        title: "Error en la prueba",
        description: "Error al conectar con el bot de Telegram",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-blue-300">Configuración Bot de Telegram</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken" className="text-blue-200">Token del Bot</Label>
            <Input
              id="botToken"
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="bg-white/5 border-blue-500/30 text-white"
              required
              disabled={isSaving}
            />
            <p className="text-xs text-blue-200/60">
              Obtén tu token de @BotFather en Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-blue-200">Chat ID</Label>
            <Input
              id="chatId"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              className="bg-white/5 border-blue-500/30 text-white"
              required
              disabled={isSaving}
            />
            <p className="text-xs text-blue-200/60">
              Tu Chat ID personal (envía /start a @userinfobot para obtenerlo)
            </p>
          </div>

          <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-2">📋 Instrucciones:</h4>
            <ol className="text-blue-200/70 text-sm space-y-1">
              <li>1. Habla con @BotFather en Telegram</li>
              <li>2. Envía /newbot y sigue las instrucciones</li>
              <li>3. Copia el token que te proporcione</li>
              <li>4. Envía /start a @userinfobot para obtener tu Chat ID</li>
              <li>5. Pega ambos valores aquí y guarda</li>
            </ol>
          </div>

          <div className="bg-green-950/30 p-4 rounded-lg border border-green-500/20">
            <h4 className="text-green-300 font-semibold mb-2">✨ Activación Automática:</h4>
            <p className="text-green-200/70 text-sm">
              Cuando guardes tu configuración, el bot se activará automáticamente enviando un mensaje de confirmación. 
              Esto garantiza que las futuras notificaciones lleguen sin problemas desde el primer uso.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando y Activando...' : 'Guardar y Activar Bot'}
            </Button>
            
            <Button 
              type="button"
              onClick={handleTest}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              disabled={isTesting || !botToken || !chatId}
            >
              {isTesting ? 'Enviando...' : 'Prueba Manual'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TelegramBotConfig;
