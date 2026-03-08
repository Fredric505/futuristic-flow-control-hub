import React from 'react';

interface SmsPreviewProps {
  message: string;
  senderName?: string;
  time?: string;
  isOverLimit?: boolean;
}

const SmsPreview: React.FC<SmsPreviewProps> = ({
  message,
  senderName = 'Unknown',
  time,
  isOverLimit = false,
}) => {
  const now = time || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl overflow-hidden border border-border/30" style={{ background: '#000000' }}>
      {/* iOS Header */}
      <div className="flex flex-col items-center pt-3 pb-2 px-4" style={{ background: '#1c1c1e' }}>
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold mb-1" style={{ background: '#636366', color: '#fff' }}>
          {senderName.charAt(0).toUpperCase()}
        </div>
        <p className="text-xs font-semibold" style={{ color: '#ffffff' }}>{senderName}</p>
        <p className="text-[10px]" style={{ color: '#8e8e93' }}>SMS/MMS</p>
      </div>

      {/* Messages area */}
      <div className="px-4 py-4 min-h-[100px] flex flex-col justify-end" style={{ background: '#000000' }}>
        {message ? (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-end gap-1.5 max-w-[80%]">
              <div
                className={`rounded-2xl rounded-bl-md px-3 py-2 shadow-sm ${isOverLimit ? 'ring-1 ring-red-500' : ''}`}
                style={{ background: '#262628' }}
              >
                <p className="text-[13px] leading-[1.4] whitespace-pre-wrap break-words" style={{ color: '#ffffff' }}>
                  {message}
                </p>
              </div>
            </div>
            <span className="text-[10px] ml-1 mt-0.5" style={{ color: '#8e8e93' }}>{now}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-xs italic" style={{ color: '#8e8e93' }}>El mensaje aparecerá aquí...</p>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#1c1c1e' }}>
        <div className="flex items-center" style={{ color: '#8e8e93' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        </div>
        <div className="flex-1 rounded-full px-3 py-1.5 border" style={{ borderColor: '#3a3a3c', background: 'transparent' }}>
          <span className="text-xs" style={{ color: '#8e8e93' }}>Mensaje de Texto</span>
        </div>
        <div className="flex items-center" style={{ color: '#30d158' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
      </div>
    </div>
  );
};

export default SmsPreview;
