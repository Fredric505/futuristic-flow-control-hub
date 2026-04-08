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

  // 🔥 FIX IMPORTANTE (AQUÍ ESTABA EL PROBLEMA)
  const callProxy = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
      'https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/whatsapp-webjs-proxy',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return res.json();
  };

  const startSession = async () => {
    try {
      setLoading(true);
      await callProxy('start-session');
      setStatus('qr_pending');
      startPolling();
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
        description: 'Tu WhatsApp personal ha sido desvinculado.',
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

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      <Card className="glass-card glow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            WhatsApp Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-accent/30">
            <div className={`h-12 w-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <StatusIcon className={`h-6 w-6 ${cfg.color}`} />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-foreground">{cfg.label}</span>
              {connectedPhone && (
                <p className="text-sm text-muted-foreground mt-1">
                  📱 {connectedPhone}
                </p>
              )}
            </div>
          </div>

          {status === 'qr_pending' && qrData && (
            <div className="text-center">
              <img src={qrData} alt="QR" className="w-64 mx-auto" />
            </div>
          )}

          <div className="flex gap-3">
            {status === 'disconnected' && (
              <Button onClick={startSession}>
                Conectar WhatsApp
              </Button>
            )}

            {status === 'connected' && (
              <Button onClick={destroySession} variant="destructive">
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppQRScanner;
