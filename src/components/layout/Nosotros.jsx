import { useEffect, useRef, useState } from 'react';
import { MapPin, Scissors, Award, HeartHandshake } from 'lucide-react';
import './nosotros.css';

const pilares = [
  { Icon: Scissors, titulo: 'Calidad', texto: 'En cada detalle' },
  { Icon: Award, titulo: 'Profesionalismo', texto: 'Técnica y formación' },
  { Icon: HeartHandshake, titulo: 'Confianza', texto: 'Trato cercano' },
];

export default function Nosotros() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    const nodo = sectionRef.current;
    if (nodo) observer.observe(nodo);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="nosotros" ref={sectionRef} className={`ns ${isVisible ? 'is-visible' : ''}`}>
      <div className="ns-grid">

        {/* COLUMNA IZQUIERDA: IMAGEN */}
        <div className="ns-media ns-reveal" style={{ '--d': '0s' }}>
          <div className="ns-frame" aria-hidden="true" />
          <div className="ns-photo">
            <img
              // Puedes cambiar esta imagen por una foto real de José trabajando
              src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=1200&auto=format&fit=crop"
              alt="José Aragón - Aragon Barber Studio"
              loading="lazy"
            />
            <div className="ns-photo-card">
              <span className="ns-photo-name">José Aragón Corrales</span>
              <span className="ns-photo-role">Fundador · Barbero</span>
            </div>
          </div>
          <div className="ns-badge">
            <MapPin size={15} />
            Grecia, Costa Rica
          </div>
        </div>

        {/* COLUMNA DERECHA: TEXTO (Biografía resumida) */}
        <div className="ns-content">
          <div className="ns-eyebrow ns-reveal" style={{ '--d': '0.1s' }}>
            <i aria-hidden="true" /> Nuestra historia
          </div>

          <h2 className="ns-title ns-reveal" style={{ '--d': '0.18s' }}>
            Detrás de cada corte
            <em>hay una historia.</em>
          </h2>

          <div className="ns-text ns-reveal" style={{ '--d': '0.26s' }}>
            <p className="ns-lead">
              Soy <strong>José Aragón Corrales</strong>, orgullosamente de Grecia, y desde muy joven aprendí que los grandes sueños se construyen con disciplina y constancia.
            </p>
            <p>
              Tras una valiosa etapa profesional y un viaje al extranjero en 2025 que cambió mi perspectiva, la vida me llevó de vuelta a mis raíces. Fue entonces cuando decidí transformar lo que comenzó como un pasatiempo —cortando el cabello a mis familiares— en mi verdadera vocación.
            </p>
            <p>
              Me formé profesionalmente y tuve el honor de pulir mi técnica en grandes barberías locales, entendiendo que este arte va mucho más allá de las tijeras. Hoy, mi objetivo es ofrecer un servicio basado en la calidad, el profesionalismo y la confianza.
            </p>
          </div>

          <ul className="ns-pillars ns-reveal" style={{ '--d': '0.34s' }}>
            {pilares.map(({ Icon, titulo, texto }) => (
              <li key={titulo}>
                <span className="ns-pillar-icon"><Icon size={18} /></span>
                <span>
                  <strong>{titulo}</strong>
                  <small>{texto}</small>
                </span>
              </li>
            ))}
          </ul>

          <figure className="ns-quote ns-reveal" style={{ '--d': '0.42s' }}>
            <span className="ns-quote-mark" aria-hidden="true">“</span>
            <blockquote>
              Este proyecto representa sacrificio, fe y el deseo constante de superación. A quienes han creído en mí: gracias. Esto apenas comienza.
            </blockquote>
            <figcaption>— José Aragón</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
