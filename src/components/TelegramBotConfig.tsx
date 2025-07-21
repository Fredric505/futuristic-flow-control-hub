
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

      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_bot_token: botToken.trim(),
          telegram_chat_id: chatId.trim()
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Tu bot de Telegram ha sido configurado correctamente",
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
      const testMessage = `🤖 **Prueba de Bot de Telegram**

✅ ¡Tu bot está funcionando correctamente!

📅 Fecha: ${new Date().toLocaleString('es-ES')}
🔧 Sistema: Astro505
👤 Usuario: Admin

Este es un mensaje de prueba para verificar que tu bot de Telegram está configurado correctamente y puede recibir notificaciones.`;

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

          <div className="flex gap-2">
            <Button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            
            <Button 
              type="button"
              onClick={handleTest}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              disabled={isTesting || !botToken || !chatId}
            >
              {isTesting ? 'Enviando...' : 'Probar Bot'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TelegramBotConfig;
