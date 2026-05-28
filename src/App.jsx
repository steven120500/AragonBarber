import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/layout/Navbar'; 
import Hero from './components/layout/Hero';
import BookingWrapper from './components/booking/BookingWrapper';
import Footer from './components/layout/Footer';

// Vistas del Administrador
import Login from './pages/admin/Login'; 
import MisCitas from './pages/admin/MisCitas'; 
import Finanzas from './pages/admin/Finanzas'; // <-- Importación del nuevo panel de Finanzas

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
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Rutas Privadas del Administrador */}
        <Route path="/admin" element={<Login />} />
        <Route path="/admin/citas" element={<MisCitas />} /> 
        <Route path="/admin/finanzas" element={<Finanzas />} /> {/* <-- Ruta lista y funcionando */}
      </Routes>
    </Router>
  );
}