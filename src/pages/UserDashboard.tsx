
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import MessageHistory from '@/components/MessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import MessageTemplates from '@/components/MessageTemplates';
import MobileSidebar from '@/components/MobileSidebar';
import { supabase } from '@/integrations/supabase/client';

const UserDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    activeProcesses: 0,
    messagesSent: 0,
    creditsRemaining: 0
  });

  useEffect(() => {
    checkAuth();
    loadStats();
  }, [activeSection]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's processes
      const { data: processes } = await supabase
        .from('processes')
        .select('id')
        .eq('user_id', user.id);

      // Load user's messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', user.id);

      // Load user's credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      setStats({
        activeProcesses: processes?.length || 0,
        messagesSent: messages?.length || 0,
        creditsRemaining: profile?.credits || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Panel principal' },
    { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Crear nuevo proceso' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Mis procesos guardados' },
    { id: 'templates', icon: FileText, label: 'Plantillas', description: 'Gestionar plantillas de mensajes' },
    { id: 'history', icon: History, label: 'Historial', description: 'Mensajes enviados' },
    { id: 'telegram-config', icon: MessageSquare, label: 'Config. Bot Telegram', description: 'Configurar notificaciones' },
    { id: 'settings', icon: Settings, label: 'Configuración', description: 'Ajustes de cuenta' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Procesos</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.activeProcesses}</p>
                    </div>
                    <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Mensajes</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.messagesSent}</p>
                    </div>
                    <History className="h-6 w-6 lg:h-8 lg:w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-600 to-orange-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Créditos</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.creditsRemaining}</p>
                    </div>
                    <Settings className="h-6 w-6 lg:h-8 lg:w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300">Panel de Usuario Astro505</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-200/70">
                  Bienvenido a tu panel de usuario. Desde aquí puedes gestionar tus procesos y configurar las notificaciones.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'add-process':
        return <ProcessForm userType="user" />;
      
      case 'view-processes':
        return <ProcessList userType="user" />;
      
      case 'templates':
        return <MessageTemplates />;
      
      case 'history':
        return <MessageHistory />;
      
      case 'telegram-config':
        return (
          <div className="space-y-6">
            <TelegramBotConfig />
            
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300">ℹ️ Información Importante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-blue-200/70">
                  <p className="text-blue-300 font-semibold">
                    🤖 Configura tu bot personal de Telegram para recibir notificaciones automáticas
                  </p>
                  <p>
                    Una vez configurado tu bot, recibirás notificaciones automáticas cuando lleguen 
                    respuestas o códigos relacionados con tus procesos de WhatsApp.
                  </p>
                  <p className="text-sm text-blue-200/60">
                    El sistema identificará automáticamente tus procesos usando el IMEI, número de serie 
                    o teléfono y te enviará las notificaciones correspondientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'settings':
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-300">Configuración de Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-blue-200/70">
                <p>Configuraciones de tu cuenta están disponibles aquí.</p>
                <p>Próximamente más opciones de personalización.</p>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-300">Sección en Desarrollo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-200/70">Esta sección estará disponible próximamente.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.03'%3E%3Cpolygon fill='%23ffffff' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 bg-black/30 backdrop-blur-xl border-r border-blue-500/20">
          <div className="flex-shrink-0 p-6 mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ASTRO505 USER
            </h1>
          </div>
          
          <ScrollArea className="flex-1 px-6">
            <nav className="space-y-2 pb-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                        : 'text-blue-200/70 hover:bg-blue-600/10 hover:text-blue-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
          
          <div className="flex-shrink-0 p-6 pt-4 border-t border-blue-500/20">
            <Button 
              onClick={handleLogout}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          menuItems={menuItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={handleLogout}
          title="ASTRO505 USER"
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 lg:p-8 pt-16 lg:pt-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-blue-200/70 text-sm lg:text-base">
                  {menuItems.find(item => item.id === activeSection)?.description}
                </p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 lg:p-8 pt-0">
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
