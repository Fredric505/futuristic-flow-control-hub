
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, MessageCircle, Phone, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface IncomingMessage {
  id: string;
  phone_number: string;
  message_content: string;
  source: string;
  received_at: string;
  processed: boolean;
  telegram_sent: boolean;
  metadata: any;
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
      .channel('incoming-messages-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'incoming_messages' },
        (payload) => {
          console.log('New message received:', payload);
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
        .from('incoming_messages')
        .select('*')
        .order('received_at', { ascending: false })
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

  const getStatusBadge = (processed: boolean, telegram_sent: boolean) => {
    if (!processed) {
      return <Badge variant="secondary" className="bg-yellow-600">Procesando</Badge>;
    }
    if (telegram_sent) {
      return <Badge variant="default" className="bg-green-600">Enviado</Badge>;
    }
    return <Badge variant="destructive">No enviado</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando notificaciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-300">
          Notificaciones WhatsApp ({messages.length})
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
              <p className="text-blue-200/70 mb-4">No hay notificaciones</p>
              <p className="text-blue-200/50 text-sm">
                Las notificaciones de WhatsApp aparecerán aquí cuando lleguen.
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
                        {formatPhoneNumber(message.phone_number)}
                      </CardTitle>
                      <p className="text-blue-200/70 text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(message.received_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-blue-300">
                      {message.source}
                    </Badge>
                    {getStatusBadge(message.processed, message.telegram_sent)}
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
                  
                  {message.metadata && Object.keys(message.metadata).length > 0 && (
                    <div>
                      <p className="text-blue-200/50 text-sm mb-1">Datos adicionales:</p>
                      <pre className="text-blue-200/70 bg-gray-900/20 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(message.metadata, null, 2)}
                      </pre>
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
