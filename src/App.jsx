import Nav from './components/layout/Navbar'; // Asegúrate de que este archivo se llame Navbar o Nav en tu proyecto
import Hero from './components/layout/Hero';
import BookingWrapper from './components/booking/BookingWrapper';
import Footer from './components/layout/Footer';

export default function App() {
  return (
    <div className="app-container">
      {/* 1. Barra de navegación fija en la parte superior */}
      <Nav />

      {/* 2. Pantalla de presentación expansiva con el tríptico animado */}
      <Hero />

      {/* 3. Sección de Reserva (Servicios + Formulario dinámico) */}
      <section id="reservar" className="reveal visible">
        {/* Contenedor del título superior optimizado para el espaciado */}
        <div className="text-center" style={{ textAlign: 'center', marginTop: '0' }}>
     
          <h2 className="section-title">Agenda tu cita</h2>
          <p className="section-sub" style={{ margin: '0 auto 1.5rem' }}>
            Elige el servicio, completa tus datos y separa tu espacio inmediatamente.
          </p>
        </div>
        
        {/* Grid de servicios y formulario de Supabase */}
        <BookingWrapper />
      </section>

      {/* 4. El nuevo Footer centrado y minimalista con tus enlaces */}
      <Footer />
    </div>
  );
}