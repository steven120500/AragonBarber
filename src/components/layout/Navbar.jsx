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
  };

  return (
    <>
      {/* FONDO DESENFOCADO (BACKDROP) */}
      {isNavOpen && (
        <div 
          onClick={toggleNav}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)',
            zIndex: 99, transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* PANEL LATERAL EXCLUSIVO DE ADMINISTRACIÓN / LOGIN */}
      <div 
        style={{
          position: 'fixed', top: 0, right: isNavOpen ? 0 : '-100%', width: '85%', maxWidth: '350px', height: '100vh',
          background: '#050505', zIndex: 100, transition: 'right 0.4s cubic-bezier(0.77, 0, 0.175, 1)',
          display: 'flex', flexDirection: 'column', padding: '2rem', borderLeft: '1px solid #222'
        }}
      >
        {/* PARTE SUPERIOR: Botón de cerrar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={toggleNav} style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer' }}>
            <X size={32} />
          </button>
        </div>
        
        {/* PARTE CENTRAL: Contenido dinámico (Login o Panel) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          
          {session ? (
            // VISTA: USUARIO LOGUEADO (SUPER ADMIN)
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
              <div style={{ background: '#111', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <User size={40} color="var(--gold)" />
              </div>
              <span style={{ color: 'var(--gold)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 'bold' }}>PANEL BARBERO</span>
              
              <div style={{ width: '40px', height: '1px', background: '#333', margin: '0.5rem 0' }}></div>
              
              <a href="/#/admin/citas" onClick={toggleNav} style={adminLinkStyle}><Calendar size={20} /> Citas</a>
              <a href="/#/admin/finanzas" onClick={toggleNav} style={adminLinkStyle}><DollarSign size={20} /> Finanzas</a>
              <a href="/#/admin/resenas" onClick={toggleNav} style={adminLinkStyle}><Star size={20} /> Reseñas</a>
              
              <div style={{ width: '100%', height: '1px', background: '#222', margin: '1rem 0' }}></div>
              
              <button onClick={handleLogout} style={{ ...adminLinkStyle, color: '#ff4444' }}><LogOut size={20} /> Cerrar Sesión</button>
            </div>
          ) : (
            // VISTA: USUARIO NO LOGUEADO (LOGIN)
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <User size={48} color="var(--cream)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: 'var(--cream)', fontSize: '1.8rem', margin: 0, fontFamily: "'Playfair Display', serif" }}>¡Bienvenido!</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.9rem', margin: 0, marginBottom: '2rem' }}>Inicia sesión para administrar.</p>
              
              {/* Este botón dirige a tu componente de AdminLogin */}
              <a href="/#/admin" onClick={toggleNav} style={btnSolidCream}>
                INICIAR SESIÓN
              </a>
            </div>
          )}
        </div>

        {/* PARTE INFERIOR: Footer del menú */}
        <div style={{ textAlign: 'center', color: '#444', fontSize: '0.7rem', letterSpacing: '0.1em', marginTop: '2rem' }}>
          BARBERÍA ARAGÓN © 2026
        </div>
      </div>

      {/* PC & MOBILE NAVBAR (Barra superior normal) */}
      <nav>
        <a href="/" className="nav-logo" style={{ fontFamily: 'inherit' }}>ARAGON<span> BARBER</span> SHOP</a>
        
        {/* Enlaces principales: Siempre visibles o manejados por tu CSS principal */}
        <ul className="nav-links">
          <li><button onClick={() => scrollToSection('nosotros')} className="nav-link-btn" style={{fontFamily: 'inherit'}}>Nosotros</button></li>
          <li><button onClick={() => scrollToSection('reseñas')} className="nav-link-btn" style={{fontFamily: 'inherit'}}>Reseñas</button></li>
          <li><button onClick={() => scrollToSection('reservar')} className="nav-cta" style={{fontFamily: 'inherit'}}>Reservar cita</button></li>
        </ul>

        {/* El ícono de hamburguesa ahora abre exclusivamente el panel de Super Admin */}
        <div onClick={toggleNav} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Menu size={28} style={{ color: 'var(--gold)' }} />
        </div>
      </nav>
    </>
  );
}

// Estilos modernizados para el panel
const btnSolidCream = {
  background: 'var(--cream)',
  color: '#000',
  textDecoration: 'none',
  padding: '1rem 0',
  borderRadius: '8px', 
  fontFamily: 'inherit',
  fontWeight: 'bold',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  width: '100%',
  display: 'inline-block',
  boxSizing: 'border-box',
  textAlign: 'center'
};

const adminLinkStyle = {
  color: 'var(--cream)',
  textDecoration: 'none',
  fontFamily: 'inherit',
  fontSize: '1.1rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '1rem',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  width: '100%',
  transition: 'color 0.2s ease'
};