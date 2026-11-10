import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal reutilizable del panel.
 * - icon / iconTone: círculo superior opcional (tone: 'green' | 'red' | 'amber' | 'blue')
 * - center: centra el texto (para confirmaciones y alertas)
 * - onClose: muestra la X y permite cerrar con Escape
 */
export default function AdminModal({ open, onClose, title, icon, iconTone, center = false, width, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="adm-overlay" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className={`adm-modal ${center ? 'adm-modal--center' : ''}`} style={width ? { maxWidth: width } : undefined}>
        {onClose && (
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        )}
        {icon && <div className={`adm-modal-icon ${iconTone ? `bg-${iconTone}` : ''}`}>{icon}</div>}
        {title && <h3 className="adm-modal-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
