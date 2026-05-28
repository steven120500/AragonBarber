import { useEffect, useRef, useState } from 'react';

export default function Nosotros() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, []);

  return (
    <section id="nosotros" ref={sectionRef} style={{ background: 'transparent', padding: '6rem 2rem', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
        
        {/* COLUMNA IZQUIERDA: IMAGEN */}
        <div 
          style={{ 
            flex: '1 1 400px', 
            position: 'relative',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Marco decorativo dorado detrás de la imagen */}
          <div style={{ position: 'absolute', top: '-15px', left: '-15px', right: '15px', bottom: '15px', border: '1px solid var(--gold)', borderRadius: '12px', zIndex: 0 }}></div>
          
          <img 
            // Puedes cambiar esta imagen por una foto real de José trabajando
            src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=1200&auto=format&fit=crop" 
            alt="José Aragón - Aragon Barber Studio" 
            style={{ width: '100%', height: 'auto', borderRadius: '12px', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}
          />
        </div>

        {/* COLUMNA DERECHA: TEXTO (Biografía resumida) */}
        <div 
          style={{ 
            flex: '1 1 500px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateX(0)' : 'translateX(30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }}></div>
            <span style={{ color: 'var(--gold)', letterSpacing: '0.2em', fontSize: '0.8rem', fontWeight: 'bold' }}>
              NUESTRA HISTORIA
            </span>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', color: 'var(--cream)', marginBottom: '1.5rem', lineHeight: '1.2' }}>
            Detrás de cada corte <span style={{ color: 'var(--grey)', display: 'block', fontSize: '2rem' }}>hay una historia.</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', color: '#888', fontSize: '1.05rem', lineHeight: '1.7' }}>
            <p>
              Soy <strong>José Aragón Corrales</strong>, orgullosamente de Grecia, y desde muy joven aprendí que los grandes sueños se construyen con disciplina y constancia. 
            </p>
            <p>
              Tras una valiosa etapa profesional y un viaje al extranjero en 2025 que cambió mi perspectiva, la vida me llevó de vuelta a mis raíces. Fue entonces cuando decidí transformar lo que comenzó como un pasatiempo —cortando el cabello a mis familiares— en mi verdadera vocación.
            </p>
            <p>
              Me formé profesionalmente y tuve el honor de pulir mi técnica en grandes barberías locales, entendiendo que este arte va mucho más allá de las tijeras. Hoy, mi objetivo es ofrecer un servicio basado en la calidad, el profesionalismo y la confianza.
            </p>
            <p style={{ color: 'var(--cream)', fontStyle: 'italic', borderLeft: '2px solid var(--gold)', paddingLeft: '1rem', marginTop: '1rem' }}>
              "Este proyecto representa sacrificio, fe y el deseo constante de superación. A quienes han creído en mí: gracias. Esto apenas comienza."
            </p>
          </div>
          
        </div>
      </div>
    </section>
  );
}