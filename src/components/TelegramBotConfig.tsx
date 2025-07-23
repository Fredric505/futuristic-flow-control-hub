
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
  const [isValidating, setIsValidating] = useState(false);

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
        .select('telegram_bot_token, telegram_chat_id, email')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBotToken(profile.telegram_bot_token || '');
        setChatId(profile.telegram_chat_id || '');
      }
    } catch (error) {
      console.error('Error loading Telegram config:', error);
      toast({
        title: "Error",
        description: "Error al cargar la configuración de Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateBotConfig = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos antes de validar",
        variant: "destructive",
      });
      return false;
    }

    setIsValidating(true);
    
    try {
      // Validar que el bot token sea válido
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botInfo = await botInfoResponse.json();
      
      if (!botInfoResponse.ok) {
        throw new Error(botInfo.description || 'Token de bot inválido');
      }

      console.log('Bot info:', botInfo);
      
      // Validar que el chat ID sea accesible
      const chatInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId
        }),
      });
      
      const chatInfo = await chatInfoResponse.json();
      
      if (!chatInfoResponse.ok) {
        throw new Error(chatInfo.description || 'Chat ID inválido o bot no tiene acceso');
      }

      console.log('Chat info:', chatInfo);
      
      toast({
        title: "✅ Configuración válida",
        description: `Bot: ${botInfo.result.first_name} | Chat: ${chatInfo.result.first_name || chatInfo.result.title || chatId}`,
      });
      
      return true;
      
    } catch (error: any) {
      console.error('Error validating bot config:', error);
      toast({
        title: "Error de validación",
        description: error.message || "Error al validar la configuración del bot",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsValidating(false);
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

    // Validar configuración antes de guardar
    const isValid = await validateBotConfig();
    if (!isValid) return;

    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_bot_token: botToken.trim(),
          telegram_chat_id: chatId.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "✅ Configuración guardada",
        description: "Tu bot de Telegram ha sido configurado y validado correctamente",
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
      // Probar enviando notificación via edge function
      console.log('Testing notification via edge function...');
      
      const { data, error } = await supabase.functions.invoke('telegram-notification', {
        body: JSON.stringify({
          NotificationTitle: 'Número de prueba',
          NotificationMessage: `Prueba masiva del sistema - ${new Date().toLocaleString('es-ES')}`
        })
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Edge function response:', data);

      if (data.success) {
        toast({
          title: "✅ Prueba exitosa",
          description: "El sistema de notificaciones masivas está funcionando correctamente",
        });
      } else {
        throw new Error(data.message || 'Error en la prueba');
      }

    } catch (error: any) {
      console.error('Error testing notification:', error);
      toast({
        title: "Error en la prueba",
        description: error.message || "Error al probar el sistema de notificaciones",
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
        <p className="text-blue-200/70 text-sm">Sistema optimizado para notificaciones masivas</p>
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
              disabled={isSaving || isValidating}
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
              disabled={isSaving || isValidating}
            />
            <p className="text-xs text-blue-200/60">
              Tu Chat ID personal (envía /start a @userinfobot para obtenerlo)
            </p>
          </div>

          <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-2">🚀 Sistema Masivo</h4>
            <ul className="text-blue-200/70 text-sm space-y-1">
              <li>• Maneja múltiples usuarios simultáneamente</li>
              <li>• Notificaciones privadas por usuario</li>
              <li>• Optimizado para respuestas masivas de WhatsApp</li>
              <li>• Cada usuario recibe solo sus notificaciones</li>
            </ul>
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

          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={validateBotConfig}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isValidating || isSaving}
            >
              {isValidating ? 'Validando...' : 'Validar Config'}
            </Button>
            
            <Button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              disabled={isSaving || isValidating}
            >
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            
            <Button 
              type="button"
              onClick={handleTest}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              disabled={isTesting || !botToken || !chatId}
            >
              {isTesting ? 'Probando...' : 'Probar Sistema'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TelegramBotConfig;
