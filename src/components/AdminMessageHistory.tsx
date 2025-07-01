
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminMessage {
  id: string;
  message_content: string;
  recipient_phone: string;
  status: string;
  sent_at: string;
  user_id: string;
  processes?: {
    client_name: string;
  };
  profiles?: {
    email: string;
  };
}

const AdminMessageHistory = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    loadAllMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchPhone]);

  const loadAllMessages = async () => {
    try {
      setIsLoading(true);
      console.log('Loading all messages for admin...');

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          processes (
            client_name
          ),
          profiles (
            email
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      
      console.log('Admin messages loaded:', data?.length || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading admin messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMessages = () => {
    if (!searchPhone.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const filtered = messages.filter(message =>
      message.recipient_phone.includes(searchPhone.trim())
    );
    setFilteredMessages(filtered);
  };

  const handleSearch = () => {
    filterMessages();
  };

  const clearSearch = () => {
    setSearchPhone('');
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando historial de mensajes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-300">
          Historial de Mensajes de Usuarios ({filteredMessages.length})
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="flex gap-2 flex-1 lg:flex-initial">
            <Input
              placeholder="Buscar por número telefónico..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50 min-w-64"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
            {searchPhone && (
              <Button
                onClick={clearSearch}
                variant="outline"
                className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
                size="sm"
              >
                Limpiar
              </Button>
            )}
          </div>
          
          <Button
            onClick={loadAllMessages}
            className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <p className="text-blue-200/70 text-center">
              {searchPhone ? 'No se encontraron mensajes para este número telefónico.' : 'No hay mensajes enviados aún.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
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
                    <p className="text-blue-200/60 text-xs">
                      Usuario: {message.profiles?.email || 'Usuario desconocido'}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMessageHistory;
