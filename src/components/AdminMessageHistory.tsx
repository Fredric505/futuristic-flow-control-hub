
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
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

// Función para generar patrones de búsqueda flexible (similar a la función de notificación)
const generateSearchPatterns = (phone: string) => {
  const patterns = new Set<string>();
  const clean = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Agregar número original y limpio
  patterns.add(phone);
  patterns.add(clean);
  
  // Variantes con/sin +
  if (clean.startsWith('+')) {
    patterns.add(clean.substring(1));
  } else {
    patterns.add('+' + clean);
  }
  
  // Solo dígitos para análisis
  const onlyDigits = clean.replace(/\D/g, '');
  
  // Patrones específicos para países problemáticos (especialmente Ecuador)
  const countryMappings = {
    '593': { lengths: [9, 10], name: 'Ecuador', variations: ['0'] },
    '52': { lengths: [10, 11, 12], name: 'México', variations: ['1', '0'] },
    '57': { lengths: [10, 11, 12], name: 'Colombia', variations: ['0'] },
    '1': { lengths: [10, 11], name: 'USA/Canadá', variations: [] },
    '54': { lengths: [10, 11, 12], name: 'Argentina', variations: ['9'] },
    '55': { lengths: [10, 11, 12], name: 'Brasil', variations: [] },
    '34': { lengths: [9], name: 'España', variations: [] },
    '505': { lengths: [8], name: 'Nicaragua', variations: [] },
    '506': { lengths: [8], name: 'Costa Rica', variations: [] },
    '507': { lengths: [8], name: 'Panamá', variations: [] },
    '51': { lengths: [9], name: 'Perú', variations: [] },
    '56': { lengths: [9], name: 'Chile', variations: [] },
    '58': { lengths: [10, 11], name: 'Venezuela', variations: ['0'] },
    '503': { lengths: [8], name: 'El Salvador', variations: [] },
    '502': { lengths: [8], name: 'Guatemala', variations: [] },
    '504': { lengths: [8], name: 'Honduras', variations: [] },
  };
  
  // Detectar país y generar TODAS las variantes posibles
  let detectedCountry = null;
  for (const [countryCode, config] of Object.entries(countryMappings)) {
    if (onlyDigits.startsWith(countryCode)) {
      detectedCountry = { code: countryCode, config };
      break;
    }
  }
  
  if (detectedCountry) {
    const { code: countryCode, config } = detectedCountry;
    const withoutCountry = onlyDigits.substring(countryCode.length);
    
    // Generar TODAS las combinaciones posibles
    const allVariants = new Set<string>();
    
    // Variantes básicas
    allVariants.add(withoutCountry);
    allVariants.add(countryCode + withoutCountry);
    allVariants.add('+' + countryCode + withoutCountry);
    
    // Variantes con prefijos específicos del país
    for (const variation of config.variations) {
      if (!withoutCountry.startsWith(variation)) {
        allVariants.add(variation + withoutCountry);
        allVariants.add(countryCode + variation + withoutCountry);
        allVariants.add('+' + countryCode + variation + withoutCountry);
      }
      
      // También quitar el prefijo si ya existe
      if (withoutCountry.startsWith(variation)) {
        const withoutPrefix = withoutCountry.substring(variation.length);
        allVariants.add(withoutPrefix);
        allVariants.add(countryCode + withoutPrefix);
        allVariants.add('+' + countryCode + withoutPrefix);
      }
    }
    
    // Agregar todas las variantes generadas
    for (const variant of allVariants) {
      patterns.add(variant);
    }
  }
  
  // Patrones de longitud genéricos para casos no detectados
  if (onlyDigits.length >= 7) {
    for (let i = 7; i <= Math.min(onlyDigits.length, 15); i++) {
      const suffix = onlyDigits.slice(-i);
      patterns.add(suffix);
      if (!suffix.startsWith('+')) {
        patterns.add('+' + suffix);
      }
    }
  }
  
  return Array.from(patterns).filter(p => p && p.replace(/\D/g, '').length >= 5);
};

// Función para verificar si un mensaje coincide con el teléfono buscado
const doesMessageMatchPhone = (messagePhone: string, searchPhone: string) => {
  if (!searchPhone.trim()) return true;
  
  const searchPatterns = generateSearchPatterns(searchPhone.trim());
  const messagePatterns = generateSearchPatterns(messagePhone);
  
  // Verificar si algún patrón de búsqueda coincide con algún patrón del mensaje
  for (const searchPattern of searchPatterns) {
    for (const messagePattern of messagePatterns) {
      if (searchPattern === messagePattern ||
          searchPattern.includes(messagePattern) ||
          messagePattern.includes(searchPattern)) {
        return true;
      }
      
      // Comparación de dígitos puros para mayor flexibilidad
      const searchDigits = searchPattern.replace(/\D/g, '');
      const messageDigits = messagePattern.replace(/\D/g, '');
      
      if (searchDigits && messageDigits && 
          (searchDigits === messageDigits ||
           (searchDigits.length >= 7 && messageDigits.length >= 7 && 
            searchDigits.slice(-7) === messageDigits.slice(-7)))) {
        return true;
      }
    }
  }
  
  return false;
};

const AdminMessageHistory = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [hasSearchError, setHasSearchError] = useState(false);

  useEffect(() => {
    loadAllMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchPhone]);

  const loadAllMessages = async () => {
    try {
      setIsLoading(true);
      setHasSearchError(false);
      console.log('Loading all messages for admin...');

      // Verificar que somos admin
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.email);

      // Obtener TODOS los mensajes (las políticas RLS ahora permiten esto para admin)
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }
      
      console.log('Total messages loaded:', data?.length || 0);
      console.log('Sample messages:', data?.slice(0, 3));
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading admin messages:', error);
      setHasSearchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMessages = () => {
    if (!searchPhone.trim()) {
      setFilteredMessages(messages);
      return;
    }

    console.log('Filtering messages with phone:', searchPhone);
    const filtered = messages.filter(message =>
      doesMessageMatchPhone(message.recipient_phone, searchPhone)
    );
    
    console.log(`Filtered ${messages.length} messages to ${filtered.length} with search: "${searchPhone}"`);
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

      {hasSearchError && (
        <Card className="bg-red-900/20 border border-red-500/20">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-200">Error al cargar mensajes. Por favor, intenta actualizar.</p>
          </CardContent>
        </Card>
      )}

      {filteredMessages.length === 0 ? (
        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <p className="text-blue-200/70 text-center">
              {searchPhone ? 
                `No se encontraron mensajes para "${searchPhone}". La búsqueda incluye variantes de formato para Ecuador y otros países.` : 
                'No hay mensajes enviados aún.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {searchPhone && (
            <div className="text-sm text-blue-200/60 bg-blue-950/30 p-2 rounded">
              Mostrando mensajes que coinciden con "{searchPhone}" (incluyendo variantes de Ecuador y otros países)
            </div>
          )}
          
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
                      {message.sent_at ? formatDistanceToNow(new Date(message.sent_at), { 
                        addSuffix: true, 
                        locale: es 
                      }) : 'Fecha no disponible'}
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
