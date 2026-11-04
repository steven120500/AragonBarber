import { useState, useEffect, useRef } from 'react'; 
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/layout/Navbar'; 
import Hero from './components/layout/Hero';
import BookingWrapper from './components/booking/BookingWrapper';
import Footer from './components/layout/Footer';
import Reseñas from './components/layout/Reseñas';
import Nosotros from './components/layout/Nosotros';
import GestionResenas from './pages/admin/GestionResenas'; 
import CancelarCita from './pages/CancelarCita'; 
import { supabase } from './services/supabaseClient'; 

// Vistas del Administrador
import Login from './pages/admin/Login'; 
import MisCitas from './pages/admin/MisCitas'; 
import Finanzas from './pages/admin/Finanzas'; 
import GestionProductos from './pages/admin/GestionProductos'; 

// ESTE ES EL LANDING PAGE QUE REALMENTE ESTÁ LEYENDO TU PÁGINA
function LandingPage() {
  const [productos, setProductos] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchProductos = async () => {
      const { data } = await supabase
        .from('productos')
        .select('*')
        .eq('stock', true) 
        .order('created_at', { ascending: false });
        
      if (data) setProductos(data);
    };
    fetchProductos();
  }, []);

  // ─── AUTOSCROLL INFINITO QUE PERMITE SCROLL MANUAL ───
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || productos.length === 0) return;

    let animationFrameId;
    let isInteracting = false;

    const stopScroll = () => { isInteracting = true; };
    const startScroll = () => { isInteracting = false; };

    // Detectar cuando el usuario toca la pantalla (móvil) o usa el mouse (PC)
    container.addEventListener('mouseenter', stopScroll);
    container.addEventListener('mouseleave', startScroll);
    container.addEventListener('touchstart', stopScroll, { passive: true });
    container.addEventListener('touchend', startScroll, { passive: true });

    const step = () => {
      if (!isInteracting && container) {
        container.scrollLeft += 0.8; // Velocidad del autoscroll

        // Bucle infinito perfecto al llegar a la mitad de los elementos duplicados
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener('mouseenter', stopScroll);
        container.removeEventListener('mouseleave', startScroll);
        container.removeEventListener('touchstart', stopScroll);
        container.removeEventListener('touchend', startScroll);
      }
    };
  }, [productos]);

  // Funciones para los botones de flechas laterales
  const scrollLeftBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRightBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="app-container">
      <Nav />
      <Hero />
      
      {/* 1. SECCIÓN DE CITAS / SERVICIOS */}
      <section id="reservar" className="reveal visible">
        <div className="text-center" style={{ textAlign: 'center', marginTop: '0' }}>
          <h2 className="hero-title">Agenda tu cita</h2>
          <p className="section-sub" style={{ margin: '0 auto 1.5rem' }}>
            Elige el servicio, completa tus datos y separa tu espacio inmediatamente.
          </p>
        </div>
        <BookingWrapper />
      </section>
      
      {/* 2. NUEVA BANDA DE PRODUCTOS CON AUTOSCROLL Y SCROLL MANUAL */}
      {productos.length > 0 && (
        <section id="productos" style={{ padding: '4rem 2rem', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="hero-title" style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Nuestros Productos</h2>
                <p className="section-sub" style={{ margin: 0 }}>Lleva la calidad de la barbería a tu casa. Desliza libremente o deja que se mueva solo.</p>
              </div>
              
              {/* Botones de flechas */}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button onClick={scrollLeftBtn} style={flechaBtnStyle} title="Anterior">←</button>
                <button onClick={scrollRightBtn} style={flechaBtnStyle} title="Siguiente">→</button>
              </div>
            </div>
            
            {/* Contenedor habilitado para scroll táctil y manual */}
            <div 
              ref={scrollRef}
              className="productos-container"
              style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                overflowX: 'auto', 
                paddingBottom: '1.5rem', 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                cursor: 'grab'
              }}
            >
              {[...productos, ...productos].map((prod, index) => (
                <div key={`${prod.id}-${index}`} style={{ minWidth: '280px', maxWidth: '300px', background: '#111', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '220px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '4rem' }}>💈</span>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--gold)', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>{prod.nombre}</h3>
                    <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>{prod.descripcion}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>₡{prod.precio}</span>
                      <a 
                        href={`https://wa.me/50683678788?text=${encodeURIComponent(`Hola, me interesa este producto: ${prod.nombre}\n\n📝 Descripción: ${prod.descripcion}\n💰 Precio: ₡${prod.precio}`)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-pedir"
                      >
                        Pedir
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <style>{`
            .productos-container::-webkit-scrollbar {
              height: 8px;
            }
            .productos-container::-webkit-scrollbar-track {
              background: #111;
              border-radius: 4px;
            }
            .productos-container::-webkit-scrollbar-thumb {
              background: var(--gold);
              border-radius: 4px;
            }
            
            .btn-pedir {
              background: #EFEFD4;
              color: #000;
              padding: 0.6rem 1.2rem;
              border-radius: 50px;
              text-decoration: none;
              font-weight: bold;
              font-size: 0.85rem;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              transition: background 0.3s ease, color 0.3s ease;
              border: 1px solid transparent;
            }

            .btn-pedir:hover {
              background: #000;
              color: #fff;
              border: 1px solid #EFEFD4;
            }
          `}</style>
        </section>
      )}

      {/* 3. SECCIÓN DE RESEÑAS / TESTIMONIOS */}
      <Reseñas />

      <Nosotros />
      
      <Footer />
    </div>
  );
}

const flechaBtnStyle = {
  background: '#151515',
  border: '1px solid #333',
  color: 'var(--gold)',
  width: '45px',
  height: '45px',
  borderRadius: '50%',
  fontSize: '1.2rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/cancelar-cita" element={<CancelarCita />} />
        
        {/* Rutas Privadas del Administrador */}
        <Route path="/admin" element={<Login />} />
        <Route path="/admin/citas" element={<MisCitas />} /> 
        <Route path="/admin/finanzas" element={<Finanzas />} />
        <Route path="/admin/resenas" element={<GestionResenas />} />
        <Route path="/admin/productos" element={<GestionProductos />} />
      </Routes>
    </Router>
  );
}