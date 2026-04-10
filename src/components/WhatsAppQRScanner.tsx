import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { QrCode, Wifi, WifiOff, RefreshCw, Trash2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WhatsAppQRScanner = () => {
  const [status, setStatus] = useState<'disconnected' | 'qr_pending' | 'connected'>('disconnected');
  const [qrData, setQrData] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSessionStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadSessionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session } = await supabase
        .from('user_whatsapp_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (session) {
        setStatus(session.session_status as any);
        setConnectedPhone(session.connected_phone);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const callProxy = async (action: string) => {
    const { data, error } = await supabase.functions.invoke('whatsapp-webjs-proxy', {
      body: { action },
    });
    if (error) throw error;
    return data;
  };

  const startSession = async () => {
    try {
      setLoading(true);
      await callProxy('start-session');
      setStatus('qr_pending');
      startPolling();
      // Fetch QR immediately
      await fetchQR();
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo iniciar la sesión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQR = async () => {
    try {
      const data = await callProxy('get-qr');
      if (data?.qr) {
        setQrData(data.qr);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const data = await callProxy('get-status');
      const newStatus = data?.status || 'disconnected';
      setStatus(newStatus);
      setConnectedPhone(data?.phone || null);

      if (newStatus === 'connected') {
        stopPolling();
        setQrData(null);
        toast({
          title: '✅ WhatsApp Conectado',
          description: `Sesión vinculada${data?.phone ? ` al número ${data.phone}` : ''}`,
        });
      } else if (newStatus === 'qr_pending') {
        await fetchQR();
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPolling(true);
    pollRef.current = setInterval(checkStatus, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const destroySession = async () => {
    try {
      setLoading(true);
      stopPolling();
      await callProxy('destroy-session');
      setStatus('disconnected');
      setQrData(null);
      setConnectedPhone(null);
      toast({
        title: 'Sesión desconectada',
        description: 'Tu WhatsApp personal ha sido desvinculado. Se usará la API global.',
      });
    } catch (error: any) {
      console.error('Error destroying session:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar la sesión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      bg: 'bg-secondary',
      label: 'Desconectado',
      badgeClass: 'bg-secondary text-secondary-foreground',
    },
    qr_pending: {
      icon: QrCode,
      color: 'text-warning',
      bg: 'bg-warning/10',
      label: 'Esperando escaneo',
      badgeClass: 'bg-warning/20 text-warning border-warning/30',
    },
    connected: {
      icon: Wifi,
      color: 'text-success',
      bg: 'bg-success/10',
      label: 'Conectado',
      badgeClass: 'bg-success/20 text-success border-success/30',
    },
  };

  const cfg = statusConfig[status] || statusConfig['disconnected'];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            WhatsApp Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicator */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-accent/30">
            <div className={`h-12 w-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <StatusIcon className={`h-6 w-6 ${cfg.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{cfg.label}</span>
                <Badge variant="outline" className={cfg.badgeClass}>
                  {status}
                </Badge>
              </div>
              {connectedPhone && (
                <p className="text-sm text-muted-foreground mt-1">
                  📱 Número vinculado: <span className="text-foreground font-mono">{connectedPhone}</span>
                </p>
              )}
              {status === 'disconnected' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Los mensajes se envían usando la API global (UltraMSG)
                </p>
              )}
              {status === 'connected' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Los mensajes se envían desde tu WhatsApp personal
                </p>
              )}
            </div>
          </div>

          {/* QR Code */}
          {status === 'qr_pending' && qrData && (
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl border border-warning/30 bg-warning/5">
              <p className="text-sm text-foreground font-medium">
                Escanea este código QR con tu WhatsApp
              </p>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img
                  src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
              </p>
              {polling && (
                <div className="flex items-center gap-2 text-xs text-warning">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Verificando conexión...
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {status === 'disconnected' && (
              <Button
                onClick={startSession}
                disabled={loading}
                className="gold-gradient text-primary-foreground"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Vincular WhatsApp
              </Button>
            )}

            {status === 'qr_pending' && (
              <>
                <Button
                  onClick={fetchQR}
                  variant="outline"
                  disabled={loading}
                  className="border-warning/30 text-warning hover:bg-warning/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar QR
                </Button>
                <Button
                  onClick={destroySession}
                  variant="outline"
                  disabled={loading}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Cancelar
                </Button>
              </>
            )}

            {status === 'connected' && (
              <>
                <Button
                  onClick={checkStatus}
                  variant="outline"
                  disabled={loading}
                  className="border-success/30 text-success hover:bg-success/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Estado
                </Button>
                <Button
                  onClick={destroySession}
                  variant="outline"
                  disabled={loading}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            💡 ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">1.</span> Haz clic en "Vincular WhatsApp" para generar un código QR.
            </p>
            <p>
              <span className="text-foreground font-medium">2.</span> Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo.
            </p>
            <p>
              <span className="text-foreground font-medium">3.</span> Escanea el QR que aparece en pantalla.
            </p>
            <p>
              <span className="text-foreground font-medium">4.</span> Una vez conectado, los mensajes se enviarán desde tu número personal.
            </p>
            <div className="p-3 rounded-lg bg-info/10 border border-info/20 mt-4">
              <p className="text-info text-xs">
                <strong>Fallback automático:</strong> Si tu sesión se desconecta, el sistema usará automáticamente la API global (UltraMSG) para no perder envíos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppQRScanner;
