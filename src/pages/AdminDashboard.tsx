import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, User, Users, CreditCard, Wrench, MessageSquare, Smartphone, Bell, Clock, FileEdit, Bot, Globe, Send, ArrowRight, Sparkles, Zap, Activity } from 'lucide-react';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import AddUserForm from '@/components/AddUserForm';
import ManageUsers from '@/components/ManageUsers';
import ReloadCredits from '@/components/ReloadCredits';
import InstanceSettings from '@/components/InstanceSettings';
import MessageHistory from '@/components/MessageHistory';
import AdminMessageHistory from '@/components/AdminMessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import BulkNotifications from '@/components/BulkNotifications';
import MessageQueue from '@/components/MessageQueue';
import MessageTemplates from '@/components/MessageTemplates';
import ChatbotConfig from '@/components/ChatbotConfig';
import GlobalChatbotUrls from '@/components/GlobalChatbotUrls';
import SmsSender from '@/components/SmsSender';
import TopNavbar from '@/components/TopNavbar';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProcesses: 0,
    messagesSent: 0,
    systemCredits: 0
  });

  useEffect(() => {
    checkAuth();
    loadStats();
  }, [activeSection]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== 'fredric@gmail.com') {
      navigate('/login');
    }
  };

  const loadStats = async () => {
    try {
      const { data: users } = await supabase.from('profiles').select('credits');
      const { data: { user } } = await supabase.auth.getUser();
      const { data: processes } = await supabase.from('processes').select('id').eq('user_id', user?.id || '');
      const { data: messages } = await supabase.from('messages').select('id').eq('user_id', user?.id || '');
      const totalCredits = users?.reduce((sum: number, u: any) => sum + (u.credits || 0), 0) || 0;
      setStats({
        totalUsers: users?.length || 0,
        activeProcesses: processes?.length || 0,
        messagesSent: messages?.length || 0,
        systemCredits: totalCredits
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const menuGroups = [
    {
      label: 'Inicio',
      items: [
        { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Pantalla de inicio' },
      ]
    },
    {
      label: 'Procesos',
      items: [
        { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Crear nuevo proceso' },
        { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Procesos guardados' },
        { id: 'message-queue', icon: Clock, label: 'Cola de Mensajes', description: 'Mensajes pendientes' },
      ]
    },
    {
      label: 'Mensajes',
      items: [
        { id: 'history', icon: History, label: 'Mi Historial', description: 'Mis mensajes enviados' },
        { id: 'admin-messages', icon: History, label: 'Historial Usuarios', description: 'Mensajes de todos' },
        { id: 'templates', icon: FileEdit, label: 'Plantillas', description: 'Plantillas de mensajes' },
        { id: 'bulk-notifications', icon: Bell, label: 'Notificaciones', description: 'Envío masivo' },
      ]
    },
    {
      label: 'Configuración',
      items: [
        { id: 'telegram-config', icon: MessageSquare, label: 'Telegram', description: 'Bot de notificaciones' },
        { id: 'chatbot-config', icon: Bot, label: 'Chatbot WhatsApp', description: 'Respuestas automáticas' },
        { id: 'global-urls', icon: Globe, label: 'URLs Globales', description: 'URLs del chatbot' },
        { id: 'webhook-config', icon: Smartphone, label: 'Webhook', description: 'Config UltraMSG' },
        { id: 'settings', icon: Settings, label: 'Instancia', description: 'Token y ajustes' },
      ]
    },
    {
      label: 'Usuarios',
      items: [
        { id: 'add-user', icon: User, label: 'Añadir Usuario', description: 'Crear nuevo usuario' },
        { id: 'manage-users', icon: Users, label: 'Gestionar', description: 'Editar y borrar' },
        { id: 'reload-credits', icon: CreditCard, label: 'Créditos', description: 'Recargar créditos' },
        { id: 'admin-access', icon: Wrench, label: 'Accesos Admin', description: 'Información admin' },
      ]
    },
  ];

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeSection);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const shortcuts = [
    { id: 'add-process', icon: Plus, label: 'Nuevo Proceso', color: 'text-success', bg: 'bg-success/10' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos', color: 'text-info', bg: 'bg-info/10' },
    { id: 'manage-users', icon: Users, label: 'Usuarios', color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'templates', icon: FileEdit, label: 'Plantillas', color: 'text-warning', bg: 'bg-warning/10' },
    { id: 'bulk-notifications', icon: Bell, label: 'Notificaciones', color: 'text-destructive', bg: 'bg-destructive/10' },
    { id: 'reload-credits', icon: CreditCard, label: 'Créditos', color: 'text-info', bg: 'bg-info/10' },
    { id: 'chatbot-config', icon: Bot, label: 'Chatbot', color: 'text-success', bg: 'bg-success/10' },
    { id: 'settings', icon: Settings, label: 'Ajustes', color: 'text-muted-foreground', bg: 'bg-accent' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Usuarios', value: stats.totalUsers, icon: Users, color: 'text-info', bg: 'bg-info/10' },
                { label: 'Procesos', value: stats.activeProcesses, icon: Activity, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Mensajes', value: stats.messagesSent, icon: Send, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Créditos', value: stats.systemCredits, icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            {/* Welcome card */}
            <div className="glass-card glow-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center shrink-0 glow-gold">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-['Space_Grotesk']">Panel de Control</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Administra todos los aspectos de la plataforma ASTRO505 desde este panel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'add-process': return <ProcessForm userType="admin" />;
      case 'view-processes': return <ProcessList userType="admin" />;
      case 'message-queue': return <MessageQueue />;
      case 'history': return <MessageHistory />;
      case 'admin-messages': return <AdminMessageHistory />;
      case 'telegram-config': return <TelegramBotConfig />;
      case 'bulk-notifications': return <BulkNotifications />;
      case 'chatbot-config': return <ChatbotConfig />;
      case 'global-urls': return <GlobalChatbotUrls />;
      case 'templates': return <MessageTemplates />;

      case 'webhook-config':
        return (
          <Card className="glass-card glow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Configuración Webhook — UltraMSG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 text-muted-foreground">
                <div className="p-4 rounded-xl border border-success/20 bg-success/5">
                  <p className="text-success font-semibold mb-1">✅ Estado del Sistema:</p>
                  <p className="text-sm">El webhook está configurado y funcionando correctamente.</p>
                </div>
                <div>
                  <h4 className="text-foreground font-semibold mb-2">URL del Webhook:</h4>
                  <div className="p-3 rounded-xl bg-accent/50 border border-border/50">
                    <code className="text-sm text-primary break-all font-mono">
                      https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/ultramsg-webhook
                    </code>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-accent/30">
                  <p className="text-foreground font-semibold mb-2">Funcionamiento:</p>
                  <ul className="text-sm space-y-1.5">
                    <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> UltraMSG recibe mensajes de WhatsApp</li>
                    <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> El webhook procesa las respuestas automáticamente</li>
                    <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> Se identifica el proceso por IMEI/Serie/Teléfono</li>
                    <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-primary shrink-0" /> Se envía notificación al bot de Telegram del usuario</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'admin-access':
        return (
          <Card className="glass-card glow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Accesos Administrativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>Este es el panel de accesos administrativos del sistema.</p>
                <p>Desde aquí se pueden gestionar los permisos y configuraciones avanzadas.</p>
                <p>Solo los administradores tienen acceso a estas funcionalidades.</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'add-user': return <AddUserForm />;
      case 'manage-users': return <ManageUsers />;
      case 'reload-credits': return <ReloadCredits />;
      case 'settings': return <InstanceSettings />;

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
        title="ASTRO505 ADMIN"
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

      <footer className="border-t border-border/40 py-3 px-4 flex items-center justify-between text-[11px] text-muted-foreground/50">
        <a href="https://wa.me/50588897925" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-success/70 hover:text-success transition-colors">
          <MessageSquare className="h-4 w-4" />
          <span className="text-[11px]">Soporte</span>
        </a>
        <span>ASTRO505 v2.0</span>
      </footer>
    </div>
  );
};

export default AdminDashboard;
