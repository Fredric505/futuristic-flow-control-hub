import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Link, Loader2, Info } from 'lucide-react';

interface UserUrl {
  id: string;
  url_key: string;
  url_value: string;
  created_at: string;
}

const AVAILABLE_URL_KEYS = [
  { key: 'url_option_1', label: 'URL Opción 1', description: 'URL para la opción 1 del menú' },
  { key: 'url_option_2', label: 'URL Opción 2', description: 'URL para la opción 2 del menú (ubicación web)' },
  { key: 'url_option_3', label: 'URL Opción 3', description: 'URL para la opción 3 del menú' },
  { key: 'url_option_4', label: 'URL Opción 4', description: 'URL para la opción 4 del menú' },
  { key: 'url_option_5', label: 'URL Opción 5', description: 'URL para la opción 5 del menú' },
  { key: 'url_custom_1', label: 'URL Personalizada 1', description: 'URL personalizada adicional' },
  { key: 'url_custom_2', label: 'URL Personalizada 2', description: 'URL personalizada adicional' },
];

const UserChatbotUrls = () => {
  const [urls, setUrls] = useState<UserUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<UserUrl | null>(null);
  const [formData, setFormData] = useState({ url_key: '', url_value: '' });

  useEffect(() => {
    loadUrls();
  }, []);

  const loadUrls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_chatbot_urls')
        .select('*')
        .eq('user_id', user.id)
        .order('url_key');

      if (error) throw error;
      setUrls(data || []);
    } catch (error) {
      console.error('Error loading URLs:', error);
      toast.error('Error al cargar las URLs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.url_key || !formData.url_value) {
      toast.error('Completa todos los campos');
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url_value);
    } catch {
      toast.error('Ingresa una URL válida (debe comenzar con http:// o https://)');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      if (editingUrl) {
        // Update existing
        const { error } = await supabase
          .from('user_chatbot_urls')
          .update({ url_value: formData.url_value })
          .eq('id', editingUrl.id);

        if (error) throw error;
        toast.success('URL actualizada correctamente');
      } else {
        // Check if key already exists
        const existing = urls.find(u => u.url_key === formData.url_key);
        if (existing) {
          toast.error('Ya tienes una URL configurada para esta opción');
          setSaving(false);
          return;
        }

        // Insert new
        const { error } = await supabase
          .from('user_chatbot_urls')
          .insert({
            user_id: user.id,
            url_key: formData.url_key,
            url_value: formData.url_value
          });

        if (error) throw error;
        toast.success('URL agregada correctamente');
      }

      setDialogOpen(false);
      setEditingUrl(null);
      setFormData({ url_key: '', url_value: '' });
      loadUrls();
    } catch (error: any) {
      console.error('Error saving URL:', error);
      toast.error(error.message || 'Error al guardar la URL');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta URL?')) return;

    try {
      const { error } = await supabase
        .from('user_chatbot_urls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('URL eliminada');
      loadUrls();
    } catch (error) {
      console.error('Error deleting URL:', error);
      toast.error('Error al eliminar la URL');
    }
  };

  const openAddDialog = () => {
    setEditingUrl(null);
    setFormData({ url_key: '', url_value: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (url: UserUrl) => {
    setEditingUrl(url);
    setFormData({ url_key: url.url_key, url_value: url.url_value });
    setDialogOpen(true);
  };

  const getAvailableKeys = () => {
    const usedKeys = urls.map(u => u.url_key);
    return AVAILABLE_URL_KEYS.filter(k => !usedKeys.includes(k.key));
  };

  const getKeyLabel = (key: string) => {
    return AVAILABLE_URL_KEYS.find(k => k.key === key)?.label || key;
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-900/20 backdrop-blur-xl border border-blue-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-300 flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            ¿Cómo funcionan las URLs personalizadas?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-200/70 text-sm space-y-2">
            <p>
              El chatbot global usa placeholders como <code className="bg-blue-800/40 px-1 rounded">{'{{url_option_2}}'}</code> en sus respuestas.
            </p>
            <p>
              Al configurar tus URLs personalizadas, el sistema reemplazará automáticamente esos placeholders con tus URLs cuando respondan a procesos de tu cuenta.
            </p>
            <p className="text-blue-300/80 font-medium">
              Si no configuras una URL, se usará la URL por defecto del chatbot global.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* URLs Table */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Link className="h-5 w-5" />
            Mis URLs del Chatbot
          </CardTitle>
          <Button 
            onClick={openAddDialog}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={getAvailableKeys().length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar URL
          </Button>
        </CardHeader>
        <CardContent>
          {urls.length === 0 ? (
            <div className="text-center py-8 text-blue-200/60">
              <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes URLs personalizadas configuradas</p>
              <p className="text-sm mt-2">Se usarán las URLs por defecto del chatbot global</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/20">
                  <TableHead className="text-blue-300">Placeholder</TableHead>
                  <TableHead className="text-blue-300">Tu URL</TableHead>
                  <TableHead className="text-blue-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.id} className="border-blue-500/20">
                    <TableCell className="text-blue-200 font-mono">
                      {`{{${url.url_key}}}`}
                    </TableCell>
                    <TableCell className="text-blue-200/80 max-w-xs truncate">
                      <a 
                        href={url.url_value} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-300 hover:underline"
                      >
                        {url.url_value}
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(url)}
                          className="text-blue-300 hover:text-blue-200 hover:bg-blue-800/30"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(url.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-800/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-blue-500/30">
          <DialogHeader>
            <DialogTitle className="text-blue-300">
              {editingUrl ? 'Editar URL' : 'Agregar URL Personalizada'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingUrl && (
              <div className="space-y-2">
                <Label className="text-blue-200">Seleccionar Placeholder</Label>
                <select
                  value={formData.url_key}
                  onChange={(e) => setFormData({ ...formData, url_key: e.target.value })}
                  className="w-full bg-slate-800 border border-blue-500/30 rounded-md px-3 py-2 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {getAvailableKeys().map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editingUrl && (
              <div className="space-y-2">
                <Label className="text-blue-200">Placeholder</Label>
                <Input
                  value={getKeyLabel(formData.url_key)}
                  disabled
                  className="bg-slate-800/50 border-blue-500/30 text-blue-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-blue-200">Tu URL</Label>
              <Input
                value={formData.url_value}
                onChange={(e) => setFormData({ ...formData, url_value: e.target.value })}
                placeholder="https://tudominio.com/pagina"
                className="bg-slate-800 border-blue-500/30 text-blue-100"
              />
              <p className="text-xs text-blue-200/60">
                Ingresa la URL completa incluyendo https://
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-blue-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserChatbotUrls;
