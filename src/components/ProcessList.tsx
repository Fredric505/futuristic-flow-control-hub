import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Send, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Process {
  id: string;
  client_name: string;
  iphone_model: string;
  color: string;
  storage: string;
  imei: string;
  serial_number: string;
  phone_number: string;
  country_code: string;
  contact_type: string;
  owner_name?: string;
  lost_mode?: boolean;
  status?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

interface ProcessListProps {
  userType: 'admin' | 'user';
}

const ProcessList = ({ userType }: ProcessListProps) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [filteredProcesses, setFilteredProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadProcesses();
  }, []);

  useEffect(() => {
    filterProcesses();
  }, [processes, searchPhone]);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('processes')
        .select('*')
        .order('created_at', { ascending: false });

      if (userType === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setProcesses(data || []);
    } catch (error) {
      console.error('Error loading processes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los procesos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterProcesses = () => {
    if (!searchPhone.trim()) {
      setFilteredProcesses(processes);
      return;
    }

    const filtered = processes.filter(process =>
      process.phone_number.includes(searchPhone.trim())
    );
    setFilteredProcesses(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este proceso?')) return;

    try {
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Proceso eliminado",
        description: "El proceso ha sido eliminado exitosamente"
      });

      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proceso",
        variant: "destructive"
      });
    }
  };

  const handleSend = async (process: Process) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (!profile || profile.credits < 1) {
        toast({
          title: "Sin créditos",
          description: "No tienes suficientes créditos para enviar mensajes",
          variant: "destructive"
        });
        return;
      }

      const messageContent = message || `Hola, encontré tu ${process.iphone_model} ${process.color} de ${process.storage}GB. Si es tuyo, contáctame.`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          process_id: process.id,
          message_content: messageContent,
          recipient_phone: `${process.country_code}${process.phone_number}`,
          status: 'sent'
        });

      if (messageError) throw messageError;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);

      if (creditError) throw creditError;

      toast({
        title: "Mensaje enviado",
        description: "El mensaje ha sido enviado exitosamente"
      });

      setMessage('');
      setEditingProcess(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  };

  const handleSearch = () => {
    filterProcesses();
  };

  const clearSearch = () => {
    setSearchPhone('');
  };

  if (isLoading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="p-6">
          <p className="text-blue-200/70">Cargando procesos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-300">
          Mis Procesos ({filteredProcesses.length})
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
            onClick={loadProcesses}
            className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {filteredProcesses.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <p className="text-blue-200/70 text-center">
              {searchPhone ? 'No se encontraron procesos para este número telefónico.' : 'No hay procesos guardados aún.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProcesses.map((process) => (
            <Card key={process.id} className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-blue-300 text-lg">
                      {process.client_name}
                    </CardTitle>
                    <p className="text-blue-200/70 text-sm">
                      {process.iphone_model} {process.color} - {process.storage}GB
                    </p>
                    <p className="text-blue-200/60 text-xs">
                      Tel: {process.country_code}{process.phone_number}
                    </p>
                    <p className="text-blue-200/60 text-xs">
                      IMEI: {process.imei} | SN: {process.serial_number}
                    </p>
                    {process.lost_mode && (
                      <Badge className="bg-red-600 text-white mt-1">
                        Modo Perdido Activado
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingProcess(process)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(process.id)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {editingProcess && (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-300">
              Enviar Mensaje a {editingProcess.client_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-blue-200">Mensaje</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hola, encontré tu ${editingProcess.iphone_model} ${editingProcess.color} de ${editingProcess.storage}GB. Si es tuyo, contáctame.`}
                className="bg-black/20 border-blue-500/20 text-blue-200 placeholder:text-blue-200/50"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSend(editingProcess)}
                className="bg-green-600/20 hover:bg-green-600/30 text-green-300"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensaje
              </Button>
              <Button
                onClick={() => setEditingProcess(null)}
                variant="outline"
                className="border-blue-500/20 text-blue-300 hover:bg-blue-600/10"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessList;
