import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const toggleNav = () => setIsNavOpen(!isNavOpen);

  return (
    <>
      {/* MOBILE NAV */}
      <div className={`mobile-nav ${isNavOpen ? 'open' : ''}`} id="mobileNav">
        <button className="close-btn" onClick={toggleNav}>
          <X size={32} />
        </button>
        <a href="#servicios" onClick={toggleNav}>Servicios</a>
        <a href="#nosotros" onClick={toggleNav}>Nosotros</a>
        <a href="#reseñas" onClick={toggleNav}>Reseñas</a>
        <a href="#reservar" onClick={toggleNav}>Reservar cita</a>
      </div>

      {/* NAVBAR */}
      <nav>
        <a href="#" className="nav-logo">ARAGON<span> BARBER</span> SHOP</a>
        <ul className="nav-links">
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
          <li><a href="#reseñas">Reseñas</a></li>
          <li><a href="#reservar" className="nav-cta">Reservar cita</a></li>
        </ul>
        <div className="hamburger" onClick={toggleNav}>
          <Menu size={28} className="text-gold" />
        </div>
      </nav>
    </>
  );
}