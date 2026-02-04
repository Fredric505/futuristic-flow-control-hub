export interface SmsSender {
  api_id: number;
  sender_id: string;
  description: string;
  country: string;
  carrier: string;
}

export const smsSenders: SmsSender[] = [
  { api_id: 1, sender_id: 'Apple', description: 'Claro Perú PE (Semi Mundial)', country: 'PE', carrier: 'Claro' },
  { api_id: 2, sender_id: 'short8', description: 'Claro AR', country: 'AR', carrier: 'Claro' },
  { api_id: 3, sender_id: 'short2', description: 'Argentina AR Movistar', country: 'AR', carrier: 'Movistar' },
  { api_id: 4, sender_id: 'short6', description: 'Argentina AR Personal', country: 'AR', carrier: 'Personal' },
  { api_id: 5, sender_id: 'Apple', description: 'España ES', country: 'ES', carrier: 'All' },
  { api_id: 6, sender_id: 'info', description: 'Costa Rica CR (All Companies)', country: 'CR', carrier: 'All' },
  { api_id: 7, sender_id: 'short1', description: 'Bitel/Movistar Perú', country: 'PE', carrier: 'Bitel/Movistar' },
  { api_id: 8, sender_id: 'short1', description: 'Argentina AR Premium (Todas)', country: 'AR', carrier: 'All' },
  { api_id: 10, sender_id: 'short', description: 'El Salvador SV / Nicaragua NI', country: 'SV/NI', carrier: 'All' },
  { api_id: 11, sender_id: 'usa2', description: 'USA Long/Code', country: 'US', carrier: 'All' },
  { api_id: 12, sender_id: 'short9', description: 'Ecuador EC / Entel Perú', country: 'EC/PE', carrier: 'All/Entel' },
  { api_id: 13, sender_id: 'short0', description: 'Bolivia BO Entel', country: 'BO', carrier: 'Entel' },
  { api_id: 14, sender_id: 'Apple', description: 'Bolivia BO Nuevatel', country: 'BO', carrier: 'Nuevatel' },
  { api_id: 15, sender_id: 'Apple', description: 'Bolivia BO Tigo', country: 'BO', carrier: 'Tigo' },
  { api_id: 16, sender_id: 'Apple', description: 'Italia IT', country: 'IT', carrier: 'All' },
  { api_id: 17, sender_id: 'short5', description: 'Colombia CO (Tigo/Claro/Wom)', country: 'CO', carrier: 'Tigo/Claro/Wom' },
  { api_id: 18, sender_id: 'usa', description: 'Premium Worldwide Long/Code', country: 'WORLD', carrier: 'All' },
  { api_id: 19, sender_id: 'short', description: 'Honduras HN / Guatemala (Claro Only)', country: 'HN/GT', carrier: 'Claro' },
  { api_id: 21, sender_id: 'short', description: 'Brazil BR', country: 'BR', carrier: 'All' },
  { api_id: 22, sender_id: 'short', description: 'Dominican Republic DO (Claro Only)', country: 'DO', carrier: 'Claro' },
  { api_id: 23, sender_id: 'short', description: 'Mexico MX Premium', country: 'MX', carrier: 'All' },
  { api_id: 24, sender_id: 'short', description: 'Chile CL (All Company)', country: 'CL', carrier: 'All' },
  { api_id: 25, sender_id: 'Apple', description: 'Paraguay PY', country: 'PY', carrier: 'All' },
  { api_id: 26, sender_id: 'usa', description: 'Dominican Republic DO (All Companies)', country: 'DO', carrier: 'All' },
  { api_id: 28, sender_id: 'Apple', description: 'Mexico MX Premium', country: 'MX', carrier: 'Apple' },
  { api_id: 29, sender_id: 'Apple', description: 'Irán IR Premium', country: 'IR', carrier: 'All' },
  { api_id: 30, sender_id: 'Apple', description: 'Francia FR', country: 'FR', carrier: 'All' },
  { api_id: 31, sender_id: 'short', description: 'Panama PA', country: 'PA', carrier: 'All' },
];

export const getSenderById = (api_id: number): SmsSender | undefined => {
  return smsSenders.find(sender => sender.api_id === api_id);
};

export const getSenderLabel = (sender: SmsSender): string => {
  return `#${sender.api_id} - ${sender.description} [${sender.sender_id}]`;
};
