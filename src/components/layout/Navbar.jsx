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
      {/* MOBILE NAV */}
      <div className={`mobile-nav ${isNavOpen ? 'open' : ''}`} id="mobileNav">
        <button className="close-btn" onClick={toggleNav}><X size={32} /></button>
        
        <button onClick={() => scrollToSection('nosotros')} className="nav-link-btn">Nosotros</button>
        <button onClick={() => scrollToSection('reseñas')} className="nav-link-btn">Reseñas</button>
        <button onClick={() => scrollToSection('reservar')} className="nav-cta" style={{ marginTop: '1rem', width: '80%' }}>Reservar cita</button>

        {session ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', width: '100%' }}>
            <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>PANEL BARBERO</span>
            <a href="/#/admin/citas" onClick={toggleNav} style={btnStyle}><Calendar size={18} /> Citas</a>
            <a href="/#/admin/finanzas" onClick={toggleNav} style={btnStyle}><DollarSign size={18} /> Finanzas</a>
            <a href="/#/admin/resenas" onClick={toggleNav} style={btnStyle}><Star size={18} /> Reseñas</a>
            <button onClick={handleLogout} style={{ ...btnStyle, background: '#ff4444' }}><LogOut size={18} /> Salir</button>
          </div>
        ) : (
          <a href="/#/admin" onClick={toggleNav} style={{ color: 'var(--grey)', marginTop: '2rem' }}><User size={20} /> Login</a>
        )}
      </div>

      {/* PC NAVBAR */}
      <nav>
        <a href="/" className="nav-logo">ARAGON<span> BARBER</span> SHOP</a>
        <ul className="nav-links">
          <li><button onClick={() => scrollToSection('nosotros')} className="nav-link-btn">Nosotros</button></li>
          <li><button onClick={() => scrollToSection('reseñas')} className="nav-link-btn">Reseñas</button></li>
          <li><button onClick={() => scrollToSection('reservar')} className="nav-cta">Reservar cita</button></li>
          
          <li style={{ marginLeft: '1rem', display: 'flex', gap: '1rem' }}>
            {session ? (
              <>
                <a href="/#/admin/citas" style={{ color: 'var(--gold)' }}><Calendar size={20} /></a>
                <a href="/#/admin/finanzas" style={{ color: 'var(--gold)' }}><DollarSign size={20} /></a>
                <a href="/#/admin/resenas" style={{ color: 'var(--gold)' }}><Star size={20} /></a>
              </>
            ) : (
              <a href="/#/admin" style={{ color: 'var(--grey)', opacity: '0.6' }}><User size={18} /></a>
            )}
          </li>
        </ul>
        <div className="hamburger" onClick={toggleNav}><Menu size={28} style={{ color: 'var(--gold)' }} /></div>
      </nav>
    </>
  );
}

const btnStyle = { 
  background: 'var(--cream)', color: '#000', padding: '0.6rem 1.2rem', 
  borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', 
  textTransform: 'uppercase', display: 'flex', alignItems: 'center', 
  gap: '0.5rem', width: '200px', textDecoration: 'none', border: 'none', cursor: 'pointer' 
};