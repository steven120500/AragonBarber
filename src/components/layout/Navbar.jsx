import { useState, useEffect } from 'react';
import { Menu, X, LogOut, Calendar, DollarSign, User, Star } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
    document.body.style.overflow = !isNavOpen ? 'hidden' : 'unset';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toggleNav(); 
  };

  const scrollToSection = (id) => {
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.href = `/#/`;
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    if (isNavOpen) toggleNav();
  };

  return (
    <>
      {/* 1. EL PARCHE DE SEGURIDAD (La "Capucha Negra") */}
      {/* Esto crea una pared negra que cubre todo el espacio superior, 
          incluso si el usuario jala la página hacia abajo en Safari. */}
      <div style={{
        position: 'fixed',
        top: '-100vh',
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 9999,
        pointerEvents: 'none'
      }} />

      {/* FONDO DESENFOCADO (BACKDROP) */}
      {isNavOpen && (
        <div 
          onClick={toggleNav}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
            zIndex: 998, transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* PANEL LATERAL */}
      <div 
        style={{
          position: 'fixed', top: 0, right: isNavOpen ? 0 : '-100%', width: '85%', maxWidth: '350px', height: '100dvh',
          background: '#050505', zIndex: 999, transition: 'right 0.4s cubic-bezier(0.77, 0, 0.175, 1)',
          display: 'flex', flexDirection: 'column', padding: '2rem', paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', borderLeft: '1px solid #222', overflowY: 'auto'
        }}
      >
        {/* ... (Todo tu contenido de menú lateral se queda igual) ... */}
      </div>

      {/* NAVBAR */}
      <nav style={navbarStyle}>
        {/* Logo y Contenido del Nav */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/Logo.png" alt="Aragon Barber Studio" className="mobile-logo" style={{ height: '60px', objectFit: 'contain' }} />
          <div className="desktop-logo nav-logo" style={{ fontFamily: 'inherit', margin: 0 }}>ARAGON<span> BARBER</span> STUDIO</div>
        </a>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => scrollToSection('nosotros')} className="nav-text-btn">Nosotros</button>
          <button onClick={() => scrollToSection('reseñas')} className="nav-text-btn">Reseñas</button>
          <button onClick={() => scrollToSection('reservar')} className="nav-cta desktop-only" style={{fontFamily: 'inherit'}}>Reservar cita</button>
          <div onClick={toggleNav} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
            <Menu className="hamburguesa-icon" style={{ color: 'var(--gold)' }} />
          </div>
        </div>
      </nav>

      {/* INYECCIÓN DE ESTILOS GLOBALES */}
      <style>{`
        body, html {
          margin: 0;
          padding: 0;
          background-color: #000 !important;
          overscroll-behavior-y: none; /* Bloquea el rebote */
        }
        /* ... (tus otros estilos se quedan igual) ... */
      `}</style>
    </>
  );
}

const navbarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 900, 
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'calc(env(safe-area-inset-top) + 1rem) 1.5rem 1rem 1.5rem',
  background: '#000',
  boxSizing: 'border-box',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  WebkitBackdropFilter: 'blur(10px)',
  backdropFilter: 'blur(10px)',
  // Esto asegura que la parte superior sea la que mande
  transform: 'translateZ(0)' 
};