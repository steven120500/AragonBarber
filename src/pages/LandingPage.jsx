import { useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BookingWrapper from '../components/booking/BookingWrapper';
import Reseñas from '../components/layout/Reseñas'; // <-- Importación del nuevo componente

export default function LandingPage() {
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero" id="inicio" style={{ padding: 0, maxWidth: '100%' }}>
        <div className="hero-left">
          <div className="hero-badge">Barbería Premium · Est. 2026</div>
          <h1 className="hero-title">
            El arte del<br />
            corte <span className="accent text-gold">perfecto</span>
          </h1>
          <p className="hero-sub">
            Experiencia de barbería de élite. Desde el corte clásico hasta el estilo más contemporáneo — cada visita es un ritual.
          </p>
          <div className="hero-actions">
            <a href="#reservar" className="btn-primary">Reservar ahora</a>
            <a href="#servicios" className="btn-ghost">Ver servicios →</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-main">
            <div className="hero-stripe"></div>
          </div>
        </div>
      </section>

      {/* RESERVAR - Ahora usa BookingWrapper */}
      <section id="reservar" className="reveal">
        <span className="section-tag">— Agenda tu visita</span>
        <h2 className="section-title">
          Reserva tu cita<br />
          <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>en 2 minutos</span>
        </h2>
        <p className="section-sub">
          Elige el servicio, completa tus datos y separa tu espacio inmediatamente.
        </p>

        {/* El wrapper gestiona tanto los iconos de servicios como el formulario */}
        <div style={{ marginTop: '2rem' }}>
          <BookingWrapper />
        </div>
      </section>

      {/* SECCIÓN DE RESEÑAS */}
      <Reseñas />

      <Footer />
    </>
  );
}