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

      {/* PANEL LATERAL (CLIENTES Y ADMINISTRACIÓN) */}
      <div 
        style={{
          position: 'fixed', top: 0, right: isNavOpen ? 0 : '-100%', width: '85%', maxWidth: '350px', height: '100dvh',
          background: '#050505', zIndex: 999, transition: 'right 0.4s cubic-bezier(0.77, 0, 0.175, 1)',
          display: 'flex', flexDirection: 'column', padding: '2rem', paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', borderLeft: '1px solid #222', overflowY: 'auto'
        }}
      >
        {/* PARTE SUPERIOR: Botón de cerrar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button onClick={toggleNav} style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer' }}>
            <X size={32} />
          </button>
        </div>
        
        {/* PARTE CENTRAL: Contenido dinámico */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          
          {/* RESERVAR CITA PARA MÓVIL (Como lo quitamos de la barra superior, lo ponemos aquí muy visible) */}
          <div className="mobile-only-links" style={{ width: '100%', marginBottom: '2rem' }}>
            <button 
              onClick={() => scrollToSection('reservar')} 
              style={{...btnSolidCream, background: 'var(--gold)', color: '#000', padding: '1.2rem 0'}}
            >
              Reservar Cita
            </button>
          </div>

          <div style={{ width: '100%', height: '1px', background: '#222', marginBottom: '2.5rem' }}></div>

          {/* SECCIÓN DE ADMINISTRACIÓN */}
          {session ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
              <div style={{ background: '#111', padding: '1rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
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
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <User size={48} color="var(--cream)" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ color: 'var(--cream)', fontSize: '1.8rem', margin: 0, fontFamily: "'Playfair Display', serif" }}>¡Bienvenido!</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.9rem', margin: 0, marginBottom: '2rem' }}>Inicia sesión para administrar.</p>
              
              <a href="/#/admin" onClick={toggleNav} style={btnSolidCream}>
                INICIAR SESIÓN
              </a>
            </div>
          )}
        </div>

        {/* PARTE INFERIOR: Footer del menú */}
        <div style={{ textAlign: 'center', color: '#444', fontSize: '0.7rem', letterSpacing: '0.1em', marginTop: '2rem' }}>
         ARAGON BARBER STUDIO
        </div>
      </div>

      {/* PC & MOBILE NAVBAR (Asegurada al techo) */}
      <nav style={navbarStyle}>
        
        {/* LOGO */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* LOGO MÓVIL (Imagen) */}
          <img 
            src="/Logo.png" 
            alt="Aragon Barber Studio" 
            className="mobile-logo"
            style={{ height: '60px', objectFit: 'contain' }} 
          />
          
          {/* LOGO ESCRITORIO (Texto) */}
          <div className="desktop-logo nav-logo" style={{ fontFamily: 'inherit', margin: 0 }}>
            ARAGON<span> BARBER</span> STUDIO
          </div>
        </a>
        
        {/* GRUPO DERECHO: Enlaces y Hamburguesa juntos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Botones Nosotros y Reseñas (Visibles en PC y Móvil) */}
          <button onClick={() => scrollToSection('nosotros')} className="nav-text-btn">Nosotros</button>
          <button onClick={() => scrollToSection('reseñas')} className="nav-text-btn">Reseñas</button>
          
          {/* Reservar Cita (Solo visible en PC, en móvil está dentro de la hamburguesa) */}
          <button onClick={() => scrollToSection('reservar')} className="nav-cta desktop-only" style={{fontFamily: 'inherit'}}>Reservar cita</button>

          {/* Icono de Hamburguesa */}
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
        }
        
        /* Botones de texto genéricos para el nav */
        .nav-text-btn {
          background: transparent;
          border: none;
          color: var(--cream);
          font-family: inherit;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0;
          transition: color 0.3s ease;
        }
        .nav-text-btn:hover {
          color: var(--gold);
        }

        /* Tamaño del icono por defecto */
        .hamburguesa-icon {
          width: 32px;
          height: 32px;
        }

        /* COMPORTAMIENTO MÓVIL (Por debajo de 768px) */
        @media (max-width: 768px) {
          .desktop-logo {
            display: none !important;
          }
          .mobile-logo {
            display: block !important;
          }
          .desktop-only {
            display: none !important;
          }
          /* Hacemos los textos un poquito más pequeños en celular para que todo quepa a la par de la hamburguesa */
          .nav-text-btn {
            font-size: 0.75rem !important;
          }
          .hamburguesa-icon {
            width: 28px; /* Un poquito más pequeña en celular */
            height: 28px;
          }
        }

        /* COMPORTAMIENTO ESCRITORIO (Por encima de 769px) */
        @media (min-width: 769px) {
          .desktop-logo {
            display: block !important;
          }
          .mobile-logo {
            display: none !important;
          }
          .mobile-only-links {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

// ─── ESTILOS ───
// ─── ESTILOS ───

const navbarStyle = {
  // 1. Mantenemos el sticky que es más estable en iOS que fixed
  position: 'sticky', 
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
  // 2. Quitamos temporalmente el blur porque en Safari 
  // es lo que a veces causa la transparencia en el overscroll
  // WebkitBackdropFilter: 'blur(10px)',
  // backdropFilter: 'blur(10px)',
  // 3. Forzamos a la tarjeta de video de iOS a renderizar esto primero
  transform: 'translateZ(0)',
  // 4. EL TRUCO ESTRELLA: Una sombra superior gigante del mismo color del fondo
  // Esto crea una "extensión" falsa del Navbar hacia arriba, cubriendo el hueco
  boxShadow: '0 -50vh 0 50vh #000' 
};

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