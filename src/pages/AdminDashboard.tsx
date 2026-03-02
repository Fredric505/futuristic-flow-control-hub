import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, User, Users, CreditCard, Wrench, MessageSquare, Smartphone, Bell, Clock, FileEdit, Bot, Globe, Send } from 'lucide-react';
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

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Usuarios</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-info/15 flex items-center justify-center">
                      <Users className="h-5 w-5 text-info" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Procesos</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.activeProcesses}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-success" />
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
                    <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Créditos</p>
                      <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{stats.systemCredits}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Panel de Control — ASTRO505</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Bienvenido al sistema de gestión. Desde aquí puedes administrar todos los aspectos de la plataforma.
                </p>
              </CardContent>
            </Card>
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
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">🔗 Configuración Webhook — UltraMSG</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 text-muted-foreground">
                <div className="p-4 rounded-lg border border-success/30 bg-success/5">
                  <p className="text-success font-semibold mb-1">✅ Estado del Sistema:</p>
                  <p className="text-sm">El webhook está configurado y funcionando correctamente.</p>
                </div>
                <div>
                  <h4 className="text-foreground font-semibold mb-2">📋 URL del Webhook:</h4>
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <code className="text-sm text-foreground break-all font-mono">
                      https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/ultramsg-webhook
                    </code>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/50">
                  <p className="text-foreground font-semibold mb-2">🔧 Funcionamiento:</p>
                  <ul className="text-sm space-y-1">
                    <li>• UltraMSG recibe mensajes de WhatsApp</li>
                    <li>• El webhook procesa las respuestas automáticamente</li>
                    <li>• Se identifica el proceso por IMEI/Serie/Teléfono</li>
                    <li>• Se envía notificación al bot de Telegram del usuario</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'admin-access':
        return (
          <Card className="bg-card border-border">
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
        title="ASTRO505 ADMIN"
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

      <footer className="border-t border-border py-3 px-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Contacto Admin: +50588897925</span>
        <span>Versión 1.0.0</span>
      </footer>
    </div>
  );
};

export default AdminDashboard;
