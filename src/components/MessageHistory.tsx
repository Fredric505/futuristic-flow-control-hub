
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  message_content: string;
  recipient_phone: string;
  status: string;
  sent_at: string;
  processes?: {
    client_name: string;
  };
}

const MessageHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          processes (
            client_name
          )
        `)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <p className="text-blue-200/70">No hay mensajes enviados aún.</p>
          </CardContent>
        </Card>
      ) : (
        messages.map((message) => (
          <Card key={message.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-blue-300 text-lg">
                    {message.processes?.client_name || 'Cliente'}
                  </CardTitle>
                  <p className="text-blue-200/70 text-sm">
                    Para: {message.recipient_phone}
                  </p>
                  <p className="text-blue-200/70 text-xs">
                    {formatDistanceToNow(new Date(message.sent_at), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </p>
                </div>
                <Badge 
                  variant={message.status === 'sent' ? 'default' : 'secondary'}
                  className={message.status === 'sent' ? 'bg-green-600' : 'bg-yellow-600'}
                >
                  {message.status === 'sent' ? 'Enviado' : 'Pendiente'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-950/30 p-3 rounded-lg border border-blue-500/20">
                <pre className="text-blue-200 text-sm whitespace-pre-wrap">
                  {message.message_content}
                </pre>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default MessageHistory;
