import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  Smartphone,
  Plus,
  Bell,
  MessageCircle,
  Send,
  Settings,
  Users,
  RefreshCw,
} from "lucide-react"
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProcessList from '@/components/ProcessList';
import ProcessForm from '@/components/ProcessForm';
import MessageHistory from '@/components/MessageHistory';
import TelegramBotConfig from '@/components/TelegramBotConfig';
import NotificationsPanel from '@/components/NotificationsPanel';

interface NavItemProps {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState<string>('processes');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!session && !error) {
      console.log('No hay sesión, redirigiendo a /login');
      navigate('/login');
    } else {
      console.log('Sesión activa:', session?.user.email);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    } else {
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'processes', label: 'Procesos', icon: Smartphone },
    { id: 'add-process', label: 'Agregar Proceso', icon: Plus },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'messages', label: 'Mensajes', icon: MessageCircle },
    { id: 'telegram', label: 'Bot Telegram', icon: Send },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'processes':
        return <ProcessList userType="user" />;
      case 'add-process':
        return <ProcessForm />;
      case 'notifications':
        return <NotificationsPanel userType="user" />;
      case 'messages':
        return <MessageHistory />;
      case 'telegram':
        return <TelegramBotConfig />;
      default:
        return <ProcessList userType="user" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96 bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <RefreshCw className="h-10 w-10 text-blue-300/50 mx-auto animate-spin mb-4" />
              <CardTitle className="text-blue-300">Cargando...</CardTitle>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-blue-500/20 flex flex-col">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-blue-300">Dashboard</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul>
            {tabs.map((tab) => (
              <li key={tab.id} className="mb-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-lg ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-400 hover:text-blue-300'}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4">
          <Button
            onClick={handleSignOut}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default UserDashboard;
