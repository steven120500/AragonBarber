import { useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BookingWrapper from '../components/booking/BookingWrapper';
import Reseñas from '../components/layout/Reseñas';

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
      <section className="hero" id="inicio" style={{ padding: '0', maxWidth: '100%' }}>
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
            <a href="/#reservar" className="btn-primary">Reservar ahora</a>
            <a href="/#servicios" className="btn-ghost">Ver servicios →</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-main">
            <div className="hero-stripe"></div>
          </div>
        </div>
      </section>

      {/* SECCIÓN SERVICIOS */}
      <section id="servicios" className="reveal" style={{ padding: '4rem 2rem' }}>
        <h2 className="section-title">Servicios</h2>
        <p>Corte, barba, rituales y más...</p>
      </section>

      {/* RESERVAR */}
      <section id="reservar" className="reveal" style={{ padding: '4rem 2rem' }}>
        <h2 className="section-title">Reserva tu cita</h2>
        <BookingWrapper />
      </section>

      {/* SECCIÓN NOSOTROS */}
      <section id="nosotros" className="reveal" style={{ padding: '4rem 2rem' }}>
        <h2 className="section-title">Nosotros</h2>
        <p>Información del barbero y la historia de Aragon Barber Shop.</p>
      </section>

      {/* SECCIÓN DE RESEÑAS */}
      <section id="reseñas" className="reveal" style={{ padding: '4rem 2rem' }}>
        <h2 className="section-title">Lo que dicen nuestros clientes</h2>
        <Reseñas />
      </section>

      <Footer />
    </>
  );
}