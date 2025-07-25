
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, MessageCircle, Phone, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface IncomingMessage {
  id: string;
  user_id: string;
  recipient_phone: string;
  message_content: string;
  sent_at: string;
  status: string;
  process_id?: string;
}

interface NotificationsPanelProps {
  userType: 'admin' | 'user';
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ userType }) => {
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    
    // Configurar subscripción en tiempo real
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('Message change detected:', payload);
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userType]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from('messages')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      // Solo mostrar mensajes del usuario actual si no es admin
      if (userType !== 'admin') {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Error al cargar mensajes",
          variant: "destructive",
        });
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+')) {
      return phone;
    }
    return `+${phone}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-600">Enviado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-600">Pendiente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando mensajes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-300">
          Mensajes ({messages.length})
        </h2>
        <Button
          onClick={loadMessages}
          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-blue-300/30 mx-auto mb-4" />
              <p className="text-blue-200/70 mb-4">No hay mensajes</p>
              <p className="text-blue-200/50 text-sm">
                Los mensajes aparecerán aquí cuando se envíen.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-blue-300" />
                    <div>
                      <CardTitle className="text-blue-300 text-lg">
                        {formatPhoneNumber(message.recipient_phone)}
                      </CardTitle>
                      <p className="text-blue-200/70 text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(message.sent_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(message.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-blue-200/50 text-sm mb-1">Mensaje:</p>
                    <p className="text-blue-200 bg-blue-900/20 p-3 rounded border border-blue-500/20">
                      {message.message_content}
                    </p>
                  </div>
                  
                  {message.process_id && (
                    <div>
                      <p className="text-blue-200/50 text-sm mb-1">Proceso ID:</p>
                      <p className="text-blue-200/70 bg-gray-900/20 p-2 rounded text-xs">
                        {message.process_id}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
