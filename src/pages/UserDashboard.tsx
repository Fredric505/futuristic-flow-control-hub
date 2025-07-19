
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import MessageHistory from '@/components/MessageHistory';
import MobileSidebar from '@/components/MobileSidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const UserDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({
    processes: 0,
    messagesSent: 0,
    credits: 0
  });
  const [instanceConfig, setInstanceConfig] = useState({
    instance: '',
    token: ''
  });
  const [userExpired, setUserExpired] = useState(false);

  useEffect(() => {
    checkAuth();
    loadUserData();
    loadInstanceConfig();
  }, [activeSection]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('User auth check:', session?.user?.email);
    if (!session) {
      navigate('/login');
      return;
    }

    // Verificar si el usuario está expirado (solo si no es admin)
    if (session.user.email !== 'fredric@gmail.com') {
      await checkUserExpiration(session.user.id);
    }
  };

  const checkUserExpiration = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('expiration_date')
        .eq('id', userId)
        .single();

      if (profile && profile.expiration_date) {
        const expirationDate = new Date(profile.expiration_date);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        expirationDate.setHours(0, 0, 0, 0);

        if (currentDate > expirationDate) {
          setUserExpired(true);
          toast({
            title: "Cuenta Expirada",
            description: "Tu cuenta ha expirado. Contacta al administrador para renovar tu acceso.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error checking user expiration:', error);
    }
  };

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      // Load user processes
      const { data: processes } = await supabase
        .from('processes')
        .select('id')
        .eq('user_id', user.id);

      // Load user messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', user.id);

      console.log('User data loaded:', { profile, processes, messages });

      setUserData({
        processes: processes?.length || 0,
        messagesSent: messages?.length || 0,
        credits: profile?.credits || 0
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadInstanceConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token']);

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setInstanceConfig({
        instance: settings?.whatsapp_instance || 'instance126876',
        token: settings?.whatsapp_token || '4ecj8581tubua7ry'
      });
    } catch (error) {
      console.error('Error loading instance config:', error);
      // Fallback to default values
      setInstanceConfig({
        instance: 'instance126876',
        token: '4ecj8581tubua7ry'
      });
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Pantalla de inicio' },
    { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Agregar formulario para luego guardar' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Procesos guardados y listos para enviar' },
    { id: 'history', icon: History, label: 'Historial', description: 'Historial de mensajes enviados' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderContent = () => {
    if (userExpired) {
      return (
        <Card className="bg-black/20 backdrop-blur-xl border border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-300">Cuenta Expirada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-red-200/70">
                Tu cuenta ha expirado y no puedes acceder a las funcionalidades del sistema.
              </p>
              <p className="text-blue-200/70">
                Contacta al administrador para renovar tu acceso: +50588897925
              </p>
              <p className="text-blue-200/50 text-sm">
                Todos tus datos están seguros y serán restaurados cuando se renueve tu cuenta.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Mis Procesos</p>
                      <p className="text-2xl lg:text-3xl font-bold">{userData.processes}</p>
                    </div>
                    <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Mensajes Enviados</p>
                      <p className="text-2xl lg:text-3xl font-bold">{userData.messagesSent}</p>
                    </div>
                    <History className="h-6 w-6 lg:h-8 lg:w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-none sm:col-span-2 lg:col-span-1">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Créditos Disponibles</p>
                      <p className="text-2xl lg:text-3xl font-bold">{userData.credits}</p>
                    </div>
                    <Plus className="h-6 w-6 lg:h-8 lg:w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300">Panel de Usuario Astro505</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-200/70 mb-4">
                  Bienvenido a tu panel personal Astro505. Aquí puedes gestionar tus procesos y revisar tu historial.
                </p>
                <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-300 font-semibold mb-2">Configuración Actual</h4>
                  <p className="text-blue-200/70 text-sm break-all">Instancia: {instanceConfig.instance}</p>
                  <p className="text-blue-200/70 text-sm break-all">Token: {instanceConfig.token}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'add-process':
        return <ProcessForm userType="user" />;
      
      case 'view-processes':
        return <ProcessList userType="user" />;
      
      case 'history':
        return <MessageHistory />;
      
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
                    onClick={() => !userExpired && setActiveSection(item.id)}
                    disabled={userExpired}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      userExpired 
                        ? 'text-gray-500 cursor-not-allowed opacity-50'
                        : activeSection === item.id
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
          onSectionChange={(section) => {
            if (!userExpired) setActiveSection(section);
          }}
          onLogout={handleLogout}
          title="ASTRO505 USER"
        />
        
        {/* Main Content with ScrollArea */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 lg:p-8 pt-16 lg:pt-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {userExpired ? 'Cuenta Expirada' : menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-blue-200/70 text-sm lg:text-base">
                  {userExpired ? 'Acceso restringido por expiración' : menuItems.find(item => item.id === activeSection)?.description}
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
      
      <div className="fixed bottom-4 left-4 text-blue-200/50 text-xs">
        <p>Contacto Admin: +50588897925</p>
      </div>
      
      <div className="fixed bottom-4 right-4 text-blue-200/50 text-xs">
        <p>Versión 1.0.0</p>
      </div>
    </div>
  );
};

export default UserDashboard;
