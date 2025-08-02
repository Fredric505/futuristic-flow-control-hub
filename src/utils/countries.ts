
export interface Country {
  code: string;
  name: string;
  flag: string;
  language: 'es' | 'en';
}

export const countries: Country[] = [
  // Países de habla española
  { code: '+1', name: 'Estados Unidos (Puerto Rico)', flag: '🇵🇷', language: 'es' },
  { code: '+34', name: 'España', flag: '🇪🇸', language: 'es' },
  { code: '+52', name: 'México', flag: '🇲🇽', language: 'es' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', language: 'es' },
  { code: '+56', name: 'Chile', flag: '🇨🇱', language: 'es' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴', language: 'es' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪', language: 'es' },
  { code: '+51', name: 'Perú', flag: '🇵🇪', language: 'es' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨', language: 'es' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴', language: 'es' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾', language: 'es' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾', language: 'es' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷', language: 'es' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦', language: 'es' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻', language: 'es' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹', language: 'es' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳', language: 'es' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮', language: 'es' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺', language: 'es' },
  { code: '+1', name: 'República Dominicana', flag: '🇩🇴', language: 'es' },
  { code: '+240', name: 'Guinea Ecuatorial', flag: '🇬🇶', language: 'es' },

  // Países de habla inglesa
  { code: '+1', name: 'Estados Unidos', flag: '🇺🇸', language: 'en' },
  { code: '+1', name: 'Canadá', flag: '🇨🇦', language: 'en' },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧', language: 'en' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', language: 'en' },
  { code: '+64', name: 'Nueva Zelanda', flag: '🇳🇿', language: 'en' },
  { code: '+27', name: 'Sudáfrica', flag: '🇿🇦', language: 'en' },
  { code: '+353', name: 'Irlanda', flag: '🇮🇪', language: 'en' },
  { code: '+1', name: 'Jamaica', flag: '🇯🇲', language: 'en' },
  { code: '+1', name: 'Trinidad y Tobago', flag: '🇹🇹', language: 'en' },
  { code: '+1', name: 'Barbados', flag: '🇧🇧', language: 'en' },
  { code: '+1', name: 'Bahamas', flag: '🇧🇸', language: 'en' },
  { code: '+501', name: 'Belice', flag: '🇧🇿', language: 'en' },
  { code: '+592', name: 'Guyana', flag: '🇬🇾', language: 'en' },
  { code: '+91', name: 'India', flag: '🇮🇳', language: 'en' },
  { code: '+63', name: 'Filipinas', flag: '🇵🇭', language: 'en' },
  { code: '+65', name: 'Singapur', flag: '🇸🇬', language: 'en' },
  { code: '+60', name: 'Malasia', flag: '🇲🇾', language: 'en' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', language: 'en' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', language: 'en' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭', language: 'en' },
  { code: '+254', name: 'Kenia', flag: '🇰🇪', language: 'en' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬', language: 'en' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿', language: 'en' },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

export const getLanguageByCountryCode = (code: string): 'es' | 'en' => {
  const country = getCountryByCode(code);
  return country?.language || 'es';
};
