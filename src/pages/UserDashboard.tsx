import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, MessageSquare, Link, Sparkles, Send, Zap, Activity, QrCode } from 'lucide-react';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import MessageHistory from '@/components/MessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import MessageTemplates from '@/components/MessageTemplates';
import UserChatbotUrls from '@/components/UserChatbotUrls';
import WhatsAppQRScanner from '@/components/WhatsAppQRScanner';
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

  const shortcuts = [
    { id: 'add-process', icon: Plus, label: 'Nuevo Proceso', color: 'text-success', bg: 'bg-success/10' },
    { id: 'view-processes', icon: FileText, label: 'Mis Procesos', color: 'text-info', bg: 'bg-info/10' },
    { id: 'templates', icon: FileText, label: 'Plantillas', color: 'text-warning', bg: 'bg-warning/10' },
    { id: 'history', icon: History, label: 'Historial', color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'telegram-config', icon: MessageSquare, label: 'Telegram', color: 'text-info', bg: 'bg-info/10' },
    { id: 'chatbot-urls', icon: Link, label: 'URLs', color: 'text-success', bg: 'bg-success/10' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Procesos', value: stats.activeProcesses, icon: Activity, color: 'text-info', bg: 'bg-info/10' },
                { label: 'Mensajes', value: stats.messagesSent, icon: Send, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Créditos', value: stats.creditsRemaining, icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="stat-card p-4 lg:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-[0.15em] font-semibold">{stat.label}</p>
                        <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1 font-['Space_Grotesk']">{stat.value}</p>
                      </div>
                      <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shortcuts */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Accesos Directos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shortcuts.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setActiveSection(sc.id)}
                      className="shortcut-card group flex flex-col items-center gap-2 text-center"
                    >
                      <div className={`h-12 w-12 rounded-xl ${sc.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-5 w-5 ${sc.color}`} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{sc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Welcome */}
            <div className="glass-card glow-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center shrink-0 glow-gold">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-['Space_Grotesk']">Tu Panel</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Gestiona tus procesos y configura las notificaciones desde aquí.
                  </p>
                </div>
              </div>
            </div>
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
            <Card className="glass-card glow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Información Importante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-muted-foreground">
                  <p className="text-primary font-semibold">
                    Configura tu bot personal de Telegram para recibir notificaciones automáticas
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
          <Card className="glass-card glow-card">
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
          <Card className="glass-card glow-card">
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
          {activeSection !== 'dashboard' && (
            <div className="mb-6 flex items-center gap-3">
              {activeItem && (
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {React.createElement(activeItem.icon, { className: "h-5 w-5 text-primary" })}
                </div>
              )}
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-foreground font-['Space_Grotesk']">{activeItem?.label}</h2>
                <p className="text-muted-foreground text-xs mt-0.5">{activeItem?.description}</p>
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
