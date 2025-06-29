
// Mapeo de modelos y colores a nombres de archivos de imágenes
export const getIphoneImageUrl = (model: string, color: string): string => {
  // Normalizar el nombre del modelo y color para crear el nombre del archivo
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/\s+/g, '-')
      .replace(/iphone-/g, '')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n');
  };

  const modelKey = normalizeString(model);
  const colorKey = normalizeString(color);
  
  // Mapeo específico de modelos
  const modelMappings: { [key: string]: string } = {
    '16-pro-max': '16-pro-max',
    '16-pro': '16-pro',
    '16-plus': '16-plus',
    '16': '16',
    '15-pro-max': '15-pro-max',
    '15-pro': '15-pro',
    '15-plus': '15-plus',
    '15': '15',
    '14-pro-max': '14-pro-max',
    '14-pro': '14-pro',
    '14-plus': '14-plus',
    '14': '14',
    '13-pro-max': '13-pro-max',
    '13-pro': '13-pro',
    '13-mini': '13-mini',
    '13': '13',
    '12-pro-max': '12-pro-max',
    '12-pro': '12-pro',
    '12-mini': '12-mini',
    '12': '12'
  };

  // Mapeo específico de colores
  const colorMappings: { [key: string]: string } = {
    'ultramarino': 'ultramarino',
    'verde-azulado': 'verde-azulado',
    'rosa': 'rosa',
    'blanco': 'blanco',
    'negro': 'negro',
    'titanio-natural': 'titanio-natural',
    'titanio-azul': 'titanio-azul',
    'titanio-blanco': 'titanio-blanco',
    'titanio-negro': 'titanio-negro',
    'amarillo': 'amarillo',
    'verde': 'verde',
    'azul': 'azul',
    'medianoche': 'medianoche',
    'purpura-intenso': 'purpura-intenso',
    'oro': 'oro',
    'plata': 'plata',
    'grafito': 'grafito',
    'purpura': 'purpura',
    'luz-de-estrella': 'luz-de-estrella',
    'productred': 'productred',
    'sierra-blue': 'sierra-blue',
    'azul-pacifico': 'azul-pacifico',
    'verde-noche': 'verde-noche',
    'gris-espacial': 'gris-espacial',
    'oro-rosa': 'oro-rosa'
  };

  const finalModel = modelMappings[modelKey] || modelKey;
  const finalColor = colorMappings[colorKey] || colorKey;
  
  // Generar la URL de la imagen
  const imageFileName = `iphone-${finalModel}-${finalColor}.jpg`;
  
  // URL base para las imágenes (puedes cambiar esto según donde guardes las imágenes)
  const baseUrl = 'https://jclbkyyujtrpfqgrmdhl.supabase.co/storage/v1/object/public/iphone-images/';
  
  return `${baseUrl}${imageFileName}`;
};

// Función para verificar si existe una imagen para el modelo y color
export const hasIphoneImage = (model: string, color: string): boolean => {
  // Por ahora, asumimos que tenemos imágenes para los modelos más populares
  const popularModels = [
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 12 Pro Max'
  ];
  
  return popularModels.includes(model);
};

// Función para obtener imagen por defecto si no existe la específica
export const getDefaultIphoneImage = (): string => {
  const baseUrl = 'https://jclbkyyujtrpfqgrmdhl.supabase.co/storage/v1/object/public/iphone-images/';
  return `${baseUrl}iphone-default.jpg`;
};
