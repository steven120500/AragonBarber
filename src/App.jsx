import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/layout/Navbar'; 
import Hero from './components/layout/Hero';
import BookingWrapper from './components/booking/BookingWrapper';
import Footer from './components/layout/Footer';
import Reseñas from './components/layout/Reseñas';
import Nosotros from './components/layout/Nosotros';
import GestionResenas from './pages/admin/GestionResenas'; 
import CancelarCita from './pages/CancelarCita'; // <-- NUEVA IMPORTACIÓN

// Vistas del Administrador
import Login from './pages/admin/Login'; 
import MisCitas from './pages/admin/MisCitas'; 
import Finanzas from './pages/admin/Finanzas'; 


function LandingPage() {
  return (
    <div className="app-container">
      <Nav />
      <Hero />
      <section id="reservar" className="reveal visible">
        <div className="text-center" style={{ textAlign: 'center', marginTop: '0' }}>
          <h2 className="hero-title">Agenda tu cita</h2>
          <p className="section-sub" style={{ margin: '0 auto 1.5rem' }}>
            Elige el servicio, completa tus datos y separa tu espacio inmediatamente.
          </p>
        </div>
        <BookingWrapper />
      </section>
      
      {/* Sección dinámica de reseñas */}
      <Reseñas />

      <Nosotros />
      
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Ruta para cancelar cita desde el correo */}
        <Route path="/cancelar-cita" element={<CancelarCita />} />
        
        {/* Rutas Privadas del Administrador */}
        <Route path="/admin" element={<Login />} />
        <Route path="/admin/citas" element={<MisCitas />} /> 
        <Route path="/admin/finanzas" element={<Finanzas />} />
        <Route path="/admin/resenas" element={<GestionResenas />} />
      </Routes>
    </Router>
  );
}