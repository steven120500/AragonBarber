import { useState, useEffect } from 'react';

export default function Hero() {
  const [currentSet, setCurrentSet] = useState(0);

  const imageSets = [
    {
      label: "El Ritual",
      images: [
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1200&auto=format&fit=crop"
      ]
    },
    {
      label: "La Técnica",
      images: [
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1590540179852-2110a54f813a?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512690118296-f9495fe76a16?q=80&w=1200&auto=format&fit=crop"
      ]
    },
    {
      label: "El Estilo",
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

  // Misma función de navegación que en Navbar
  const handleReservarClick = (e) => {
    e.preventDefault();
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.href = `/#/reservar`;
    } else {
      document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero">
      <div className="hero-left reveal visible">
        <h1 className="hero-title">
          El estilo <br />
          <span className="hero-title">siempre primero</span>
        </h1>
       
        <div className="hero-actions">
          {/* Usamos un botón con el evento de scroll personalizado */}
          <button onClick={handleReservarClick} className="btn-primary hero-btn" style={{ cursor: 'pointer' }}>
            Reservar Cita
          </button>
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
    </section>
  );
}