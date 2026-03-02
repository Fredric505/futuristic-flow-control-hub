import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, MessageSquare, Link } from 'lucide-react';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import MessageHistory from '@/components/MessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import MessageTemplates from '@/components/MessageTemplates';
import UserChatbotUrls from '@/components/UserChatbotUrls';
import TopNavbar from '@/components/TopNavbar';
import { supabase } from '@/integrations/supabase/client';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({ activeProcesses: 0, messagesSent: 0, creditsRemaining: 0 });

  useEffect(() => {
    checkAuth();
    loadStats();
  }, [activeSection]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    if (session.user.email !== 'fredric@gmail.com') {
      const { data: profile } = await supabase.from('profiles').select('expiration_date').eq('id', session.user.id).single();
      if (profile?.expiration_date && new Date() > new Date(profile.expiration_date)) {
        await supabase.auth.signOut();
        navigate('/login');
      }
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: processes } = await supabase.from('processes').select('id').eq('user_id', user.id);
      const { data: messages } = await supabase.from('messages').select('id').eq('user_id', user.id);
      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      setStats({
        activeProcesses: processes?.length || 0,
        messagesSent: messages?.length || 0,
        creditsRemaining: profile?.credits || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const menuGroups = [
    {
      label: 'Inicio',
      items: [{ id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Panel principal' }]
    },
    {
      label: 'Procesos',
      items: [
        { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Crear nuevo proceso' },
        { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Mis procesos guardados' },
      ]
    },
    {
      label: 'Mensajes',
      items: [
        { id: 'templates', icon: FileText, label: 'Plantillas', description: 'Plantillas de mensajes' },
        { id: 'history', icon: History, label: 'Historial', description: 'Mensajes enviados' },
      ]
    },
    {
      label: 'Configuración',
      items: [
        { id: 'telegram-config', icon: MessageSquare, label: 'Bot Telegram', description: 'Configurar notificaciones' },
        { id: 'chatbot-urls', icon: Link, label: 'URLs Chatbot', description: 'Personalizar URLs' },
        { id: 'settings', icon: Settings, label: 'Cuenta', description: 'Ajustes de cuenta' },
      ]
    },
  ];

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeSection);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Procesos</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.activeProcesses}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-info/15 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-info" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Mensajes</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.messagesSent}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
                      <History className="h-5 w-5 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Créditos</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.creditsRemaining}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Panel de Usuario — ASTRO505</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Bienvenido a tu panel. Desde aquí puedes gestionar tus procesos y configurar las notificaciones.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'add-process': return <ProcessForm userType="user" />;
      case 'view-processes': return <ProcessList userType="user" />;
      case 'templates': return <MessageTemplates />;
      case 'history': return <MessageHistory />;
      case 'telegram-config':
        return (
          <div className="space-y-6">
            <TelegramBotConfig />
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">ℹ️ Información Importante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-muted-foreground">
                  <p className="text-primary font-semibold">
                    🤖 Configura tu bot personal de Telegram para recibir notificaciones automáticas
                  </p>
                  <p>
                    Una vez configurado tu bot, recibirás notificaciones automáticas cuando lleguen
                    respuestas o códigos relacionados con tus procesos de WhatsApp.
                  </p>
                  <p className="text-sm opacity-70">
                    El sistema identificará automáticamente tus procesos usando el IMEI, número de serie
                    o teléfono y te enviará las notificaciones correspondientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'chatbot-urls': return <UserChatbotUrls />;
      case 'settings':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configuración de Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>Configuraciones de tu cuenta están disponibles aquí.</p>
                <p>Próximamente más opciones de personalización.</p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Sección en Desarrollo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Esta sección estará disponible próximamente.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar
        title="ASTRO505"
        menuGroups={menuGroups}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
          <div className="mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">{activeItem?.label}</h2>
            <p className="text-muted-foreground text-sm mt-1">{activeItem?.description}</p>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
