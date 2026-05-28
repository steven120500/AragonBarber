import { useState, useEffect } from 'react';

export default function Hero() {
  const [currentSet, setCurrentSet] = useState(0);

  // Textos reducidos y más directos
  const imageSets = [
  
    {
      label: "LA TÉCNICA",
      desc: "Precisión milimétrica en cada detalle.",
      images: [
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1590540179852-2110a54f813a?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512690118296-f9495fe76a16?q=80&w=1200&auto=format&fit=crop"
      ]
    },
    {
      label: "EL ESTILO",
      desc: "Un corte diseñado para tu personalidad.",
      images: [
        "https://images.unsplash.com/photo-1512864084360-7c0c4d0a081d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"
      ]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSet((prev) => (prev === imageSets.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [imageSets.length]);

  const handleReservarClick = (e) => {
    e.preventDefault();
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.href = `/#/reservar`;
    } else {
      document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    // Añadido marginBottom para dar más espacio antes de la sección "Agenda tu cita"
    <section className="hero" style={{ marginBottom: '8rem' }}>
      
      <div className="hero-left reveal visible">
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }}></div>
          <span style={{ color: 'var(--gold)', letterSpacing: '0.2em', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {imageSets[currentSet].label}
          </span>
        </div>

        <h1 className="hero-title">
          El estilo <br />
          <span className="hero-title">siempre primero</span>
        </h1>
       
        <p key={currentSet} style={{ color: 'var(--grey)', fontSize: '1.1rem', lineHeight: '1.6', margin: '1.5rem 0 2.5rem 0', animation: 'fadeInUp 0.8s ease forwards', maxWidth: '400px' }}>
          {imageSets[currentSet].desc}
        </p>

        <div className="hero-actions" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button onClick={handleReservarClick} className="btn-primary hero-btn" style={{ cursor: 'pointer' }}>
            Reservar Cita
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {imageSets.map((_, idx) => (
              <div 
                key={idx}
                onClick={() => setCurrentSet(idx)}
                style={{
                  width: currentSet === idx ? '30px' : '10px',
                  height: '3px',
                  background: currentSet === idx ? 'var(--gold)' : '#333',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hero-right">
        <div className="triptych-stage">
          {imageSets.map((set, setIndex) => (
            <div 
              key={setIndex} 
              className={`triptych-set ${setIndex === currentSet ? 'active' : ''}`}
            >
              <div className="triptych-panel-wrapper">
                {set.images.map((img, imgIndex) => (
                  <div
                    key={imgIndex}
                    className="triptych-panel"
                    style={{ backgroundImage: `url(${img})` }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="triptych-overlay"></div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}