import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectItem } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, Edit2, X } from 'lucide-react';
import SafeSelect from '@/components/SafeSelect';

interface Template {
  id: string;
  name: string;
  template_content: string;
  language: string;
  created_at: string;
}

const MessageTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    template_content: '',
    language: 'spanish'
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión",
          variant: "destructive",
        });
        return;
      }

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update({
            name: formData.name,
            template_content: formData.template_content,
            language: formData.language,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Plantilla actualizada",
          description: "La plantilla se actualizó correctamente",
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('message_templates')
          .insert({
            user_id: session.user.id,
            name: formData.name,
            template_content: formData.template_content,
            language: formData.language,
          });

        if (error) throw error;

        toast({
          title: "Plantilla creada",
          description: "La plantilla se creó correctamente",
        });
      }

      setFormData({ name: '', template_content: '', language: 'spanish' });
      setEditingTemplate(null);
      setShowForm(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la plantilla",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_content: template.template_content,
      language: template.language,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se eliminó correctamente",
      });

      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la plantilla",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', template_content: '', language: 'spanish' });
    setEditingTemplate(null);
    setShowForm(false);
  };

  if (isLoading) {
    return <div className="text-white">Cargando plantillas...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-300">Plantillas de Mensajes</CardTitle>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName" className="text-blue-200">Nombre de la Plantilla</Label>
                <Input
                  id="templateName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white/5 border-blue-500/30 text-white"
                  required
                  placeholder="Ej: Mensaje para propietarios"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-blue-200">Idioma</Label>
                <SafeSelect
                  value={formData.language}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  placeholder="Selecciona idioma"
                  className="bg-white/5 border-blue-500/30 text-white"
                >
                  <SelectItem value="spanish">Español</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SafeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateContent" className="text-blue-200">
                  Contenido de la Plantilla
                </Label>
                <p className="text-xs text-blue-200/60 mb-2">
                  Puedes usar estas variables: {'{client_name}'}, {'{phone_number}'}, {'{iphone_model}'}, {'{storage}'}, 
                  {'{color}'}, {'{imei}'}, {'{serial_number}'}, {'{owner_name}'}, {'{url}'}
                </p>
                <Textarea
                  id="templateContent"
                  value={formData.template_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                  className="bg-white/5 border-blue-500/30 text-white min-h-[200px]"
                  required
                  placeholder="Escribe tu mensaje aquí..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="border-blue-500/30 text-blue-200 hover:bg-blue-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-blue-200/60 text-center py-8">
                  No hay plantillas creadas. Crea tu primera plantilla para empezar.
                </p>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="bg-white/5 border-blue-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-blue-100 font-semibold">{template.name}</h3>
                          <p className="text-xs text-blue-200/60">
                            {template.language === 'spanish' ? 'Español' : 'English'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(template)}
                            className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-blue-100/80 text-sm whitespace-pre-wrap mt-2 p-3 bg-black/20 rounded border border-blue-500/10">
                        {template.template_content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageTemplates;