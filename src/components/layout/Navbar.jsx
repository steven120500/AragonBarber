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

  return (
    <>
      {/* MOBILE NAV (Sidebar) */}
      <div className={`mobile-nav ${isNavOpen ? 'open' : ''}`} id="mobileNav">
        <button className="close-btn" onClick={toggleNav}>
          <X size={32} />
        </button>
        
        <a href="/#servicios" onClick={toggleNav}>Servicios</a>
        <a href="/#nosotros" onClick={toggleNav}>Nosotros</a>
        <a href="/#reseñas" onClick={toggleNav}>Reseñas</a>
        
        <a href="/#reservar" onClick={toggleNav} className="nav-cta" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          Reservar cita
        </a>

        {session ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', borderTop: '1px solid rgba(245,245,220,0.1)', paddingTop: '1.5rem' }}>
            <span style={{ color: 'var(--gold)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>PANEL BARBERO</span>
            
            <a href="/admin/citas" onClick={toggleNav} style={btnStyle}>
              <Calendar size={18} /> Mis Citas
            </a>
            
            <a href="/admin/finanzas" onClick={toggleNav} style={btnStyle}>
              <DollarSign size={18} /> Finanzas
            </a>

            <a href="/admin/resenas" onClick={toggleNav} style={btnStyle}>
              <Star size={18} /> Gestionar Reseñas
            </a>

            <button onClick={handleLogout} style={{ 
              background: '#ff4444', color: '#fff', padding: '0.8rem 1.5rem', 
              borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', 
              textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem', width: '220px'
            }}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(245,245,220,0.1)', paddingTop: '1.5rem' }}>
            <a href="/admin" onClick={toggleNav} style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--grey)' }}>
              <User size={20} /> Iniciar sesión
            </a>
          </div>
        )}
      </div>

      {/* NAVBAR PRINCIPAL (PC) */}
      <nav>
        <a href="/" className="nav-logo">ARAGON<span> BARBER</span> SHOP</a>
        
        <ul className="nav-links" style={{ alignItems: 'center' }}>
          <li><a href="/#servicios">Servicios</a></li>
          <li><a href="/#nosotros">Nosotros</a></li>
          <li><a href="/#reseñas">Reseñas</a></li>
          <li><a href="/#reservar" className="nav-cta">Reservar cita</a></li>
          
          <li style={{ marginLeft: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {session ? (
              <>
                <a href="/admin/citas" style={{ color: 'var(--gold)' }} title="Mis Citas"><Calendar size={20} /></a>
                <a href="/admin/finanzas" style={{ color: 'var(--gold)' }} title="Finanzas"><DollarSign size={20} /></a>
                <a href="/admin/resenas" style={{ color: 'var(--gold)' }} title="Gestionar Reseñas"><Star size={20} /></a>
              </>
            ) : (
              <a href="/admin" style={{ color: 'var(--grey)', opacity: '0.6' }} title="Iniciar sesión"><User size={18} /></a>
            )}
          </li>
        </ul>
        
        <div className="hamburger" onClick={toggleNav}>
          <Menu size={28} style={{ color: 'var(--gold)' }} />
        </div>
      </nav>
    </>
  );
}

const btnStyle = { 
  background: 'var(--cream)', color: '#000', padding: '0.8rem 1.5rem', 
  borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', 
  textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', 
  alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
  width: '220px', textDecoration: 'none' 
};