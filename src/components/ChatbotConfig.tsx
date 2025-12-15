import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bot, Plus, Trash2, Edit2, Save, X, MessageSquare, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ChatbotResponse {
  id: string;
  keyword: string;
  response_es: string;
  response_en: string;
  is_menu: boolean;
  menu_order: number;
  is_active: boolean;
}

interface ChatbotSettings {
  chatbot_enabled: boolean;
  default_language: string;
  fallback_response_es: string;
  fallback_response_en: string;
}

export default function ChatbotConfig() {
  const [responses, setResponses] = useState<ChatbotResponse[]>([]);
  const [settings, setSettings] = useState<ChatbotSettings>({
    chatbot_enabled: true,
    default_language: 'es',
    fallback_response_es: '',
    fallback_response_en: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newResponse, setNewResponse] = useState<Partial<ChatbotResponse>>({
    keyword: '',
    response_es: '',
    response_en: '',
    is_menu: false,
    menu_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('chatbot_responses')
        .select('*')
        .order('menu_order', { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('chatbot_settings')
        .select('*');

      if (settingsError) throw settingsError;

      if (settingsData) {
        const settingsMap: Record<string, string> = {};
        settingsData.forEach((s: { setting_key: string; setting_value: string | null }) => {
          settingsMap[s.setting_key] = s.setting_value || '';
        });

        setSettings({
          chatbot_enabled: settingsMap['chatbot_enabled'] === 'true',
          default_language: settingsMap['default_language'] || 'es',
          fallback_response_es: settingsMap['fallback_response_es'] || '',
          fallback_response_en: settingsMap['fallback_response_en'] || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading chatbot data:', error);
      toast.error('Error al cargar configuración del chatbot');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { setting_key: 'chatbot_enabled', setting_value: settings.chatbot_enabled ? 'true' : 'false' },
        { setting_key: 'default_language', setting_value: settings.default_language },
        { setting_key: 'fallback_response_es', setting_value: settings.fallback_response_es },
        { setting_key: 'fallback_response_en', setting_value: settings.fallback_response_en },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('chatbot_settings')
          .update({ setting_value: setting.setting_value })
          .eq('setting_key', setting.setting_key);

        if (error) throw error;
      }

      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const addResponse = async () => {
    if (!newResponse.keyword || !newResponse.response_es || !newResponse.response_en) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('chatbot_responses')
        .insert({
          keyword: newResponse.keyword.toLowerCase().trim(),
          response_es: newResponse.response_es,
          response_en: newResponse.response_en,
          is_menu: newResponse.is_menu || false,
          menu_order: newResponse.menu_order || 0,
          is_active: newResponse.is_active !== false,
        });

      if (error) throw error;

      toast.success('Respuesta agregada exitosamente');
      setShowAddDialog(false);
      setNewResponse({
        keyword: '',
        response_es: '',
        response_en: '',
        is_menu: false,
        menu_order: 0,
        is_active: true,
      });
      loadData();
    } catch (error: any) {
      console.error('Error adding response:', error);
      toast.error('Error al agregar respuesta');
    }
  };

  const updateResponse = async (response: ChatbotResponse) => {
    try {
      const { error } = await supabase
        .from('chatbot_responses')
        .update({
          keyword: response.keyword.toLowerCase().trim(),
          response_es: response.response_es,
          response_en: response.response_en,
          is_menu: response.is_menu,
          menu_order: response.menu_order,
          is_active: response.is_active,
        })
        .eq('id', response.id);

      if (error) throw error;

      toast.success('Respuesta actualizada');
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating response:', error);
      toast.error('Error al actualizar respuesta');
    }
  };

  const deleteResponse = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta respuesta?')) return;

    try {
      const { error } = await supabase
        .from('chatbot_responses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Respuesta eliminada');
      loadData();
    } catch (error: any) {
      console.error('Error deleting response:', error);
      toast.error('Error al eliminar respuesta');
    }
  };

  const toggleActive = async (response: ChatbotResponse) => {
    try {
      const { error } = await supabase
        .from('chatbot_responses')
        .update({ is_active: !response.is_active })
        .eq('id', response.id);

      if (error) throw error;

      loadData();
    } catch (error: any) {
      console.error('Error toggling response:', error);
      toast.error('Error al cambiar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración General del Chatbot
          </CardTitle>
          <CardDescription>
            Activa o desactiva el chatbot y configura las respuestas por defecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Chatbot Activo</Label>
              <p className="text-sm text-muted-foreground">
                Habilita las respuestas automáticas por WhatsApp
              </p>
            </div>
            <Switch
              checked={settings.chatbot_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, chatbot_enabled: checked })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Respuesta por defecto (Español)</Label>
              <Textarea
                value={settings.fallback_response_es}
                onChange={(e) => setSettings({ ...settings, fallback_response_es: e.target.value })}
                placeholder="Mensaje cuando no se reconoce el comando..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Respuesta por defecto (Inglés)</Label>
              <Textarea
                value={settings.fallback_response_en}
                onChange={(e) => setSettings({ ...settings, fallback_response_en: e.target.value })}
                placeholder="Default message when command not recognized..."
                rows={3}
              />
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </CardContent>
      </Card>

      {/* Responses Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Respuestas del Chatbot
              </CardTitle>
              <CardDescription>
                Gestiona las palabras clave y sus respuestas automáticas
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Respuesta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Palabra Clave</TableHead>
                <TableHead>Respuesta ES</TableHead>
                <TableHead>Respuesta EN</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {response.keyword}
                      </code>
                      {response.is_menu && (
                        <Badge variant="secondary">Menú</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {response.response_es.substring(0, 50)}...
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {response.response_en.substring(0, 50)}...
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={response.is_active}
                      onCheckedChange={() => toggleActive(response)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(response.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteResponse(response.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Respuesta</DialogTitle>
            <DialogDescription>
              Configura una palabra clave y las respuestas en español e inglés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Palabra Clave</Label>
                <Input
                  value={newResponse.keyword}
                  onChange={(e) => setNewResponse({ ...newResponse, keyword: e.target.value })}
                  placeholder="ej: hola, menu, ayuda"
                />
              </div>
              <div className="space-y-2">
                <Label>Orden en Menú</Label>
                <Input
                  type="number"
                  value={newResponse.menu_order}
                  onChange={(e) => setNewResponse({ ...newResponse, menu_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Respuesta en Español</Label>
              <Textarea
                value={newResponse.response_es}
                onChange={(e) => setNewResponse({ ...newResponse, response_es: e.target.value })}
                placeholder="Escribe la respuesta en español..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Respuesta en Inglés</Label>
              <Textarea
                value={newResponse.response_en}
                onChange={(e) => setNewResponse({ ...newResponse, response_en: e.target.value })}
                placeholder="Write the response in English..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newResponse.is_menu}
                  onCheckedChange={(checked) => setNewResponse({ ...newResponse, is_menu: checked })}
                />
                <Label>Es opción de menú</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newResponse.is_active !== false}
                  onCheckedChange={(checked) => setNewResponse({ ...newResponse, is_active: checked })}
                />
                <Label>Activo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addResponse}>
              Agregar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingId && (
        <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Respuesta</DialogTitle>
            </DialogHeader>
            {(() => {
              const response = responses.find(r => r.id === editingId);
              if (!response) return null;

              return (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Palabra Clave</Label>
                      <Input
                        value={response.keyword}
                        onChange={(e) => {
                          setResponses(responses.map(r => 
                            r.id === editingId ? { ...r, keyword: e.target.value } : r
                          ));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Orden en Menú</Label>
                      <Input
                        type="number"
                        value={response.menu_order}
                        onChange={(e) => {
                          setResponses(responses.map(r => 
                            r.id === editingId ? { ...r, menu_order: parseInt(e.target.value) || 0 } : r
                          ));
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Respuesta en Español</Label>
                    <Textarea
                      value={response.response_es}
                      onChange={(e) => {
                        setResponses(responses.map(r => 
                          r.id === editingId ? { ...r, response_es: e.target.value } : r
                        ));
                      }}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Respuesta en Inglés</Label>
                    <Textarea
                      value={response.response_en}
                      onChange={(e) => {
                        setResponses(responses.map(r => 
                          r.id === editingId ? { ...r, response_en: e.target.value } : r
                        ));
                      }}
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={response.is_menu}
                        onCheckedChange={(checked) => {
                          setResponses(responses.map(r => 
                            r.id === editingId ? { ...r, is_menu: checked } : r
                          ));
                        }}
                      />
                      <Label>Es opción de menú</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => updateResponse(response)}>
                      Guardar Cambios
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}