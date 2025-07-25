import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Users, Smartphone, Plus, Bell, MessageCircle, Send } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { supabase } from '@/integrations/supabase/client';
import ProcessList from '@/components/ProcessList';
import ProcessForm from '@/components/ProcessForm';
import ManageUsers from '@/components/ManageUsers';
import InstanceSettings from '@/components/InstanceSettings';
import AdminMessageHistory from '@/components/AdminMessageHistory';
import NotificationsPanel from '@/components/NotificationsPanel';

interface Tab {
  id: string;
  label: string;
  icon: any;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('processes');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    } else {
      navigate('/login');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const tabs = [
    { id: 'processes', label: 'Procesos', icon: Smartphone },
    { id: 'add-process', label: 'Agregar Proceso', icon: Plus },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'messages', label: 'Mensajes', icon: MessageCircle },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'processes':
        return <ProcessList userType="admin" />;
      case 'add-process':
        return <ProcessForm />;
      case 'notifications':
        return <NotificationsPanel userType="admin" />;
      case 'messages':
        return <AdminMessageHistory />;
      case 'users':
        return <ManageUsers />;
      case 'settings':
        return <InstanceSettings />;
      default:
        return <ProcessList userType="admin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">
            Panel de Administrador
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} alt={user?.email} />
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-2">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/user/dashboard')}>
                Panel de Usuario
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={handleSignOut}>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-6">
            <Tabs defaultValue={activeTab} className="space-y-4">
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab} className="mt-6">
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
