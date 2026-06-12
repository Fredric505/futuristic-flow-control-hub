import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AISettings {
  id?: string;
  is_enabled: boolean;
  activation_mode: 'fallback' | 'always';
  provider: 'deepseek' | 'openai' | 'lovable';
  model: string;
  api_key: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  personality: string;
  behavior: string;
  custom_link_enabled: boolean;
  custom_link_url: string;
  custom_link_preview_text: string;
  history_limit: number;
}

const PROVIDER_DEFAULTS: Record<string, { model: string; base_url: string }> = {
  deepseek: { model: 'deepseek-chat', base_url: 'https://api.deepseek.com' },
  openai: { model: 'gpt-4o-mini', base_url: 'https://api.openai.com' },
  lovable: { model: 'google/gemini-3-flash-preview', base_url: '' },
};

export default function AIAutoresponderConfig() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_chatbot_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      toast.error('Error cargando configuración IA');
    } else if (data) {
      setSettings(data as any);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('ai_chatbot_settings')
      .update({
        is_enabled: settings.is_enabled,
        activation_mode: settings.activation_mode,
        provider: settings.provider,
        model: settings.model,
        api_key: settings.api_key,
        base_url: settings.base_url,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        system_prompt: settings.system_prompt,
        personality: settings.personality,
        behavior: settings.behavior,
        custom_link_enabled: settings.custom_link_enabled,
        custom_link_url: settings.custom_link_url,
        custom_link_preview_text: settings.custom_link_preview_text,
        history_limit: settings.history_limit,
      })
      .eq('id', settings.id!);
    setSaving(false);
    if (error) {
      toast.error('Error guardando: ' + error.message);
    } else {
      toast.success('Configuración IA guardada');
    }
  };

  const handleProviderChange = (provider: AISettings['provider']) => {
    if (!settings) return;
    const def = PROVIDER_DEFAULTS[provider];
    setSettings({
      ...settings,
      provider,
      model: def.model,
      base_url: def.base_url,
    });
  };

  if (loading || !settings) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Autoresponder con IA
        </CardTitle>
        <CardDescription>
          La IA conversa de forma natural con el cliente y lo guía hacia las opciones del menú.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-accent/30">
          <div>
            <Label className="text-base">Activar IA cuando no haya regla</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Si está activa, la IA responde cuando no exista una regla coincidente.
            </p>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(c) => setSettings({ ...settings, is_enabled: c })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Modo de activación</Label>
            <Select
              value={settings.activation_mode}
              onValueChange={(v: any) => setSettings({ ...settings, activation_mode: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fallback">Solo cuando no hay regla del menú</SelectItem>
                <SelectItem value="always">Siempre (IA controla todo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mensajes recordados (historial)</Label>
            <Input
              type="number"
              min={2}
              max={30}
              value={settings.history_limit}
              onChange={(e) => setSettings({ ...settings, history_limit: parseInt(e.target.value) || 12 })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Proveedor IA</Label>
            <Select value={settings.provider} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="lovable">Lovable AI (gratis hasta 2026)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="deepseek-chat"
            />
          </div>
        </div>

        {settings.provider !== 'lovable' && (
          <>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={settings.api_key || ''}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL (opcional)</Label>
              <Input
                value={settings.base_url || ''}
                onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                placeholder="https://api.deepseek.com"
              />
              <p className="text-xs text-muted-foreground">
                Si lo dejas vacío, usa endpoint por defecto del proveedor.
              </p>
            </div>
          </>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step={0.1}
              min={0}
              max={2}
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) || 0.7 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              value={settings.max_tokens}
              onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 350 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            rows={4}
            value={settings.system_prompt}
            onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Personalidad</Label>
          <Textarea
            rows={3}
            value={settings.personality || ''}
            onChange={(e) => setSettings({ ...settings, personality: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Comportamiento</Label>
          <Textarea
            rows={5}
            value={settings.behavior || ''}
            onChange={(e) => setSettings({ ...settings, behavior: e.target.value })}
          />
        </div>

        {/* Custom link */}
        <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Link personalizado para respuestas IA</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Si la IA detecta que debe enviar enlace, se reemplaza por este link personalizado.
              </p>
            </div>
            <Switch
              checked={settings.custom_link_enabled}
              onCheckedChange={(c) => setSettings({ ...settings, custom_link_enabled: c })}
            />
          </div>
          {settings.custom_link_enabled && (
            <>
              <div className="space-y-2">
                <Label>URL personalizada</Label>
                <Input
                  value={settings.custom_link_url || ''}
                  onChange={(e) => setSettings({ ...settings, custom_link_url: e.target.value })}
                  placeholder="https://soporte.example.com/p/abc"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto previo del link</Label>
                <Input
                  value={settings.custom_link_preview_text || ''}
                  onChange={(e) => setSettings({ ...settings, custom_link_preview_text: e.target.value })}
                  placeholder="Puedes continuar aquí con el proceso..."
                />
              </div>
            </>
          )}
        </div>

        <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar configuración IA'}
        </Button>
      </CardContent>
    </Card>
  );
}