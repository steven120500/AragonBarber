import { useState, useEffect } from 'react';

export default function Hero() {
  const [currentSet, setCurrentSet] = useState(0);

  // Definimos SETS de imágenes cohesivas (Tripticos)
  // Cada set cuenta una pequeña historia visual complementaria.
  const imageSets = [
    {
      label: "El Ritual", // Un gran número o texto editorial
      images: [
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1200&auto=format&fit=crop", // Afeitado close-up
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop", // Interior de la barbería
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1200&auto=format&fit=crop"  // Tijeras y herramientas
      ]
    },
    {
      label: "La Técnica",
      images: [
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1200&auto=format&fit=crop", // Barbero trabajando (wide)
        "https://images.unsplash.com/photo-1590540179852-2110a54f813a?q=80&w=1200&auto=format&fit=crop", // Detalle de la navaja
        "https://images.unsplash.com/photo-1512690118296-f9495fe76a16?q=80&w=1200&auto=format&fit=crop"  // Cliente en la silla
      ]
    },
    {
      label: "El Estilo",
      images: [
        "https://images.unsplash.com/photo-1512864084360-7c0c4d0a081d?q=80&w=1200&auto=format&fit=crop", // Resultado final (perfil)
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1200&auto=format&fit=crop", // Herramientas en orden
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"  // Letrero de la barbería
      ]
    }
  ];

  // Lógica de rotación automática (cada 6 segundos, para dar tiempo a la animación)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSet((prev) => (prev === imageSets.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [imageSets.length]);

  return (
    <section className="hero">
      {/* Lado Izquierdo: Textos Editoriales (2fr de ancho) */}
      <div className="hero-left reveal visible">
        
        <h1 className="hero-title">
          El estilo <br />
          <span className="hero-title">siempre primero</span>
        </h1>
       
        
        <div className="hero-actions">
          <a href="#reservar" className="btn-primary hero-btn">Reservar Cita</a>
          
        </div>
      </div>

      {/* Lado Derecho: Triptico Expansivo Animado (3fr de ancho) */}
      <div className="hero-right">
        <div className="triptych-stage">
          {imageSets.map((set, setIndex) => (
            <div 
              key={setIndex} 
              className={`triptych-set ${setIndex === currentSet ? 'active' : ''}`}
            >
              {/* Texto decorativo editorial grande detrás de los paneles */}
          

              {/* Los 3 paneles del triptico */}
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
          {/* Sombra para integrar la imagen con el fondo negro */}
          <div className="triptych-overlay"></div>
        </div>
      </div>
    </section>
  );
}