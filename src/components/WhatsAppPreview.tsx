import React from 'react';
import { Check } from 'lucide-react';

interface WhatsAppPreviewProps {
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  contactName?: string;
  time?: string;
}

const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({
  message,
  buttonText,
  buttonUrl,
  contactName = 'iPhone Support',
  time,
}) => {
  const now = time || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl overflow-hidden border border-border/30" style={{ background: '#0b141a' }}>
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#1f2c34' }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#00a884', color: '#fff' }}>
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#e9edef' }}>{contactName}</p>
          <p className="text-[10px]" style={{ color: '#8696a0' }}>en línea</p>
        </div>
        <div className="flex items-center gap-3" style={{ color: '#aebac1' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
      </div>

      {/* Chat wallpaper area */}
      <div className="px-3 py-4 min-h-[120px] flex flex-col justify-end" style={{ background: '#0b141a', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        
        {message ? (
          <div className="flex justify-start max-w-[85%]">
            <div className="relative">
              {/* Message bubble */}
              <div className="rounded-lg px-3 py-2 shadow-md" style={{ background: '#005c4b', minWidth: '140px' }}>
                {/* Tail */}
                <div className="absolute -left-2 top-0 w-3 h-3 overflow-hidden">
                  <div className="w-4 h-4 rotate-45 transform origin-bottom-right" style={{ background: '#005c4b' }} />
                </div>
                
                <p className="text-[13px] leading-[1.35] whitespace-pre-wrap break-words" style={{ color: '#e9edef' }}>
                  {message}
                </p>
                
                <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5">
                  <span className="text-[10px]" style={{ color: '#ffffff99' }}>{now}</span>
                  <div className="flex" style={{ color: '#53bdeb' }}>
                    <Check className="h-3 w-3 -mr-1.5" strokeWidth={2.5} />
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              
              {/* Interactive button */}
              {buttonText && buttonUrl && (
                <div className="mt-1 rounded-lg shadow-md overflow-hidden" style={{ background: '#1f2c34' }}>
                  <button className="w-full py-2 text-center flex items-center justify-center gap-2 text-sm font-medium" style={{ color: '#53bdeb' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    {buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-xs italic" style={{ color: '#8696a0' }}>El mensaje aparecerá aquí...</p>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: '#1f2c34' }}>
        <div className="flex items-center gap-2 px-3" style={{ color: '#8696a0' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        </div>
        <div className="flex-1 rounded-full px-3 py-1.5" style={{ background: '#2a3942' }}>
          <span className="text-xs" style={{ color: '#8696a0' }}>Mensaje</span>
        </div>
        <div className="flex items-center gap-2 px-2" style={{ color: '#8696a0' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPreview;
