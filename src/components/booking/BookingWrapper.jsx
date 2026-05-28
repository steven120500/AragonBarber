import { useState, useEffect, useRef } from 'react';
import BookingForm from './BookingForm';

export default function BookingWrapper() {
  const [step, setStep] = useState('selection');
  const [selectedService, setSelectedService] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  const services = [
    { id: 'Corte', name: 'Corte', duration: '1h', price: '4000', delay: '0.1s', direction: 'translateX(-50px)' },
    { id: 'Barba', name: 'Barba', duration: '30min', price: '2000', delay: '0.3s', direction: 'translateY(50px)' },
    { id: 'Combo', name: 'Corte y Barba', duration: '1h', price: '6000', delay: '0.5s', direction: 'translateX(50px)' }
  ];

  // Lógica para detectar cuando el usuario hace scroll y ve esta sección
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 } // Se activa cuando el 10% del componente es visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', overflow: 'hidden' }}>
      {step === 'selection' ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '3rem', opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(-20px)', transition: 'all 0.6s ease-out' }}>
            <p style={{ color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', marginBottom: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Elige el servicio
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {services.map((s) => (
              <div 
                key={s.id} 
                onClick={() => {
                  setSelectedService(s);
                  setStep('form');
                }}
                style={{
                  background: '#111',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translate(0)' : s.direction,
                  transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${s.delay}`,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h4 style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: '2rem', 
                  color: 'var(--cream)', 
                  marginBottom: '1rem',
                  fontWeight: 'normal'
                }}>
                  {s.name}
                </h4>
                
                {/* Duración y Precio */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  <p style={{ color: 'var(--grey)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
                    {s.duration}
                  </p>
                  <p style={{ color: 'var(--gold)', fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                    ₡{parseInt(s.price).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ 
          animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          opacity: 0,
          transform: 'translateY(20px)'
        }}>
          <button 
            onClick={() => setStep('selection')} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--gold)', 
              cursor: 'pointer', 
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            ← Cambiar servicio
          </button>
          
          {/* Tu formulario actual */}
          <BookingForm selectedService={selectedService.name} />
          
          {/* Inyección de keyframe directamente para el formulario */}
          <style>{`
            @keyframes fadeInUp {
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}