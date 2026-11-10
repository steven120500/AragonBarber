import { useEffect, useRef, useState } from 'react';
import './hero.css';

const img = (id) => `https://images.unsplash.com/${id}?q=75&w=1920&auto=format&fit=crop`;

const slides = [
  {
    label: 'La técnica',
    desc: 'Precisión milimétrica en cada detalle.',
    image: img('photo-1585747860715-2ba37e788b70'),
  },
  {
    label: 'El estilo',
    desc: 'Un corte diseñado para tu personalidad.',
    image: img('photo-1621605815971-fbc98d665033'),
  },
  {
    label: 'El detalle',
    desc: 'Acabados limpios que hablan por ti.',
    image: img('photo-1503951914875-452162b0f3f1'),
  },
];

const marquee = ['Cortes', 'Barba', 'Precisión', 'Estilo', 'Detalle', 'Aragon Barber Studio'];

const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export default function Hero({ ready = true }) {
  const [current, setCurrent] = useState(0);
  const mediaRef = useRef(null);

  // Precarga las imágenes para que el cambio de slide no parpadee
  useEffect(() => {
    slides.forEach((s) => { const i = new Image(); i.src = s.image; });
  }, []);

  // Parallax suave del fondo al hacer scroll (solo mientras el hero está visible)
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          media.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const siguiente = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <>
      <header id="inicio" className={`hx ${ready ? 'is-ready' : ''}`}>
        {/* FONDO: slides con zoom lento y fundido */}
        <div className="hx-media" ref={mediaRef} aria-hidden="true">
          {slides.map((s, i) => (
            <div
              key={s.image}
              className={`hx-slide ${i === current ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${s.image})` }}
            />
          ))}
        </div>
        <div className="hx-shade" aria-hidden="true" />

        {/* CONTENIDO */}
        <div className="hx-content">
          <div className="hx-eyebrow hx-fade" style={{ '--d': '0.1s' }}>
            <span className="hx-eyebrow-line" />
            <span key={current} className="hx-eyebrow-text">{slides[current].label}</span>
          </div>

          <h1 className="hx-title">
            <span className="hx-line"><span style={{ '--d': '0.2s' }}>El estilo</span></span>
            <span className="hx-line"><span style={{ '--d': '0.32s' }}><em>siempre</em> primero</span></span>
          </h1>

          <div className="hx-fade" style={{ '--d': '0.55s' }}>
            <p key={current} className="hx-sub">{slides[current].desc}</p>
          </div>

          <div className="hx-ctas hx-fade" style={{ '--d': '0.7s' }}>
            <button type="button" onClick={() => irA('reservar')} className="hx-btn hx-btn--solid">
              Reservar cita
              <span className="hx-btn-icon" aria-hidden="true">→</span>
            </button>
            <button type="button" onClick={() => irA('nosotros')} className="hx-btn hx-btn--ghost">
              Conócenos
            </button>
          </div>
        </div>

        {/* BARRA INFERIOR: progreso de slides + contador + indicador de scroll */}
        <div className="hx-bottom hx-fade" style={{ '--d': '0.9s' }}>
          <div className="hx-progress" role="tablist" aria-label="Imágenes destacadas">
            {slides.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={s.label}
                className={`hx-progress-item ${i === current ? 'is-active' : ''} ${i < current ? 'is-done' : ''}`}
                onClick={() => setCurrent(i)}
              >
                <span className="hx-progress-label">{String(i + 1).padStart(2, '0')}</span>
                <span className="hx-progress-track">
                  {i === current && (
                    <span
                      key={current}
                      className="hx-progress-fill"
                      style={{ animationPlayState: ready ? 'running' : 'paused' }}
                      onAnimationEnd={siguiente}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>

          <button type="button" className="hx-scroll" onClick={() => irA('reservar')} aria-label="Bajar a reservas">
            <span>Desliza</span>
            <span className="hx-scroll-line" />
          </button>
        </div>
      </header>

      {/* CINTA EN MOVIMIENTO */}
      <div className="hx-marquee" aria-hidden="true">
        <div className="hx-marquee-track">
          {[0, 1].map((copia) => (
            <div className="hx-marquee-group" key={copia}>
              {marquee.map((palabra) => (
                <span key={palabra} className="hx-marquee-item">
                  {palabra}<i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
