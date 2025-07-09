
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2, FileText } from 'lucide-react';

interface SmsTemplate {
  id: string;
  name: string;
  message_text: string;
  created_at: string;
}

const SmsTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    message_text: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('setting_key', 'sms_template_%');

      if (error) throw error;

      const templateData: SmsTemplate[] = [];
      data?.forEach(item => {
        try {
          const template = JSON.parse(item.setting_value);
          templateData.push({
            id: item.id,
            name: template.name,
            message_text: template.message_text,
            created_at: item.created_at
          });
        } catch (e) {
          console.error('Error parsing template:', e);
        }
      });

      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message_text) {
      toast({
        title: "Error",
        description: "Por favor completa el nombre y el texto del mensaje",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const templateKey = `sms_template_${Date.now()}`;
      const templateValue = JSON.stringify(newTemplate);

      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: templateKey,
          setting_value: templateValue
        });

      if (error) throw error;

      toast({
        title: "Plantilla guardada",
        description: "La plantilla SMS se ha guardado correctamente"
      });

      setNewTemplate({
        name: '',
        message_text: ''
      });

      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se ha eliminado correctamente"
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Crear Nueva Plantilla SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_name" className="text-blue-200">
              Nombre de la Plantilla *
            </Label>
            <Input
              id="template_name"
              placeholder="Nombre de la plantilla"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_message" className="text-blue-200">
              Texto del Mensaje *
            </Label>
            <Textarea
              id="template_message"
              placeholder="Escribe aquí el texto del mensaje SMS..."
              value={newTemplate.message_text}
              onChange={(e) => setNewTemplate({ ...newTemplate, message_text: e.target.value })}
              className="bg-black/20 border-blue-500/20 text-blue-200 min-h-[100px]"
              rows={4}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveTemplate}
              disabled={isLoading}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-300">Mis Plantillas Guardadas</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-blue-200/70 text-center py-4">No hay plantillas guardadas</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="bg-black/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-blue-200 font-medium">{template.name}</h3>
                      <div className="text-sm text-blue-200/70 bg-black/20 p-3 rounded border border-blue-500/10">
                        <p className="whitespace-pre-wrap">{template.message_text}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteTemplate(template.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-300 hover:bg-red-600/10 ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsTemplates;
