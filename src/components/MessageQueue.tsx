import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Clock, Send, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QueuedMessage {
  id: string;
  user_id: string;
  process_id: string;
  message_content: string;
  recipient_phone: string;
  language: string;
  status: string;
  created_at: string;
  user_email?: string;
  processes: {
    client_name: string;
  };
}

const MessageQueue = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
    
    // Subscribe to changes
    const channel = supabase
      .channel('message-queue-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'message_queue' },
        () => {
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const { data: queueData, error } = await supabase
        .from('message_queue')
        .select(`
          *,
          processes (client_name)
        `)
        .neq('status', 'sent')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(queueData?.map(q => q.user_id) || [])];
      
      // Fetch user emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Map emails to messages
      const messagesWithEmails = queueData?.map(msg => ({
        ...msg,
        user_email: profiles?.find(p => p.id === msg.user_id)?.email || 'N/A'
      })) || [];

      setQueuedMessages(messagesWithEmails);
    } catch (error: any) {
      console.error('Error loading queue:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNow = async (messageId: string) => {
    try {
      setSending(messageId);
      
      const { error } = await supabase.functions.invoke('process-message-queue', {
        body: { messageId }
      });

      if (error) throw error;

      toast({
        title: "Mensaje enviado",
        description: "El mensaje ha sido enviado inmediatamente",
      });

      await loadQueue();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje de la cola?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('message_queue')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado de la cola",
      });

      await loadQueue();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300';
      case 'sent':
        return 'bg-green-600/20 text-green-300';
      case 'failed':
        return 'bg-red-600/20 text-red-300';
      default:
        return 'bg-gray-600/20 text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En cola';
      case 'sent':
        return 'Enviado';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  const pendingCount = queuedMessages.filter(m => m.status === 'pending').length;

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70 text-center">Cargando cola de mensajes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-blue-300">Cola de Mensajes</h2>
          <p className="text-blue-200/70 text-sm mt-1">
            {pendingCount} mensaje{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} • 
            Se envía automáticamente 1 mensaje cada 5 minutos
          </p>
        </div>
        <Button
          onClick={loadQueue}
          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {queuedMessages.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <Clock className="h-12 w-12 text-blue-300/50 mx-auto mb-4" />
              <p className="text-blue-200/70 mb-2">No hay mensajes en cola</p>
              <p className="text-blue-200/50 text-sm">
                Los mensajes que se envíen aparecerán aquí
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {queuedMessages.map((message, index) => (
            <Card key={message.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-blue-300 text-lg">
                        {message.processes?.client_name}
                      </CardTitle>
                      <Badge className={getStatusColor(message.status)}>
                        {getStatusText(message.status)}
                      </Badge>
                      {message.status === 'pending' && (
                        <Badge className="bg-blue-600/20 text-blue-300">
                          Posición #{index + 1}
                        </Badge>
                      )}
                    </div>
                    <p className="text-blue-200/70 text-sm">
                      Usuario: {message.user_email}
                    </p>
                    <p className="text-blue-200/70 text-sm">
                      Destinatario: {message.recipient_phone} ({message.language})
                    </p>
                    <p className="text-blue-200/60 text-xs mt-1">
                      Agregado: {new Date(message.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {message.status === 'pending' && (
                      <Button
                        onClick={() => sendNow(message.id)}
                        disabled={sending === message.id}
                        className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                        size="sm"
                      >
                        {sending === message.id ? (
                          <>Enviando...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Ya
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteMessage(message.id)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-blue-200/80 text-sm whitespace-pre-wrap">
                    {message.message_content.substring(0, 300)}
                    {message.message_content.length > 300 && '...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageQueue;
