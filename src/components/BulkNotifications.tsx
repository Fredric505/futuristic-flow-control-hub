
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Users, MessageCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
}

const BulkNotifications = () => {
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadUsersWithTelegram();
  }, []);

  const loadUsersWithTelegram = async () => {
    try {
      setIsLoading(true);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, telegram_bot_token, telegram_chat_id')
        .not('telegram_bot_token', 'is', null)
        .not('telegram_chat_id', 'is', null)
        .neq('email', 'fredric@gmail.com'); // Excluir admin

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Error al cargar usuarios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const sendNotification = async (user: User, messageText: string) => {
    try {
      const notificationMessage = `🔔 **Notificación del Sistema Astro505**

${messageText}

---
📅 ${new Date().toLocaleString('es-ES')}
🤖 Sistema Astro505`;

      const telegramUrl = `https://api.telegram.org/bot${user.telegram_bot_token}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: user.telegram_chat_id,
          text: notificationMessage,
          parse_mode: 'Markdown'
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending notification to user:', user.email, error);
      return false;
    }
  };

  const handleSendNotifications = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Por favor escribe un mensaje",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un usuario",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      const selectedUserData = users.filter(user => selectedUsers.includes(user.id));
      let successCount = 0;
      let failureCount = 0;

      // Enviar notificaciones una por una para controlar errores
      for (const user of selectedUserData) {
        const success = await sendNotification(user, message);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Pequeña pausa entre envíos para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "Notificaciones enviadas",
        description: `✅ Enviadas: ${successCount} | ❌ Fallidas: ${failureCount}`,
      });

      // Limpiar formulario si todo salió bien
      if (failureCount === 0) {
        setMessage('');
        setSelectedUsers([]);
      }
      
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      toast({
        title: "Error",
        description: "Error al enviar notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando usuarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Enviar Notificación Masiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message" className="text-blue-200">Mensaje a enviar</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe aquí el mensaje que quieres enviar a los usuarios seleccionados..."
              className="min-h-[120px] bg-white/5 border-blue-500/30 text-white resize-none"
            />
            <p className="text-xs text-blue-200/60">
              El mensaje se enviará con formato y fecha automática
            </p>
          </div>

          <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-500/20">
            <h4 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Seleccionar usuarios ({users.length} con Telegram configurado)
            </h4>
            
            {users.length > 0 ? (
              <>
                <div className="mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedUsers.length === users.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-blue-200 text-sm font-medium">
                      Seleccionar todos ({users.length})
                    </span>
                  </label>
                </div>
                
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-blue-600/10 rounded">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                        />
                        <span className="text-blue-200/90 text-sm">{user.email}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <p className="text-blue-200/70 text-sm">
                No hay usuarios con Telegram configurado
              </p>
            )}
          </div>

          <div className="bg-amber-950/30 p-4 rounded-lg border border-amber-500/20">
            <h4 className="text-amber-300 font-semibold mb-2">💡 Vista previa del mensaje:</h4>
            <div className="text-amber-200/70 text-sm whitespace-pre-wrap bg-black/20 p-3 rounded border">
              {`🔔 **Notificación del Sistema Astro505**

${message || '[Tu mensaje aparecerá aquí]'}

---
📅 ${new Date().toLocaleString('es-ES')}
🤖 Sistema Astro505`}
            </div>
          </div>

          <Button
            onClick={handleSendNotifications}
            disabled={isSending || !message.trim() || selectedUsers.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 
              `Enviando... (${selectedUsers.length} usuarios)` : 
              `Enviar Notificación (${selectedUsers.length} seleccionados)`
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkNotifications;
