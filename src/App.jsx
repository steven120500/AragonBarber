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

  // ─── AUTOSCROLL INFINITO + SCROLL MANUAL (100% COMPATIBLE CON CUALQUIER CELULAR Y PC) ───
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || productos.length === 0) return;

    let animationFrameId;
    let resumeTimeout;
    let isInteracting = false;
    let accumulatedScroll = container.scrollLeft;

    const pauseAutoScroll = () => {
      isInteracting = true;
      clearTimeout(resumeTimeout);
    };

    const resumeAutoScroll = (delay = 1200) => {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        if (container) {
          // Sincroniza exactamente en el punto donde el usuario dejó el scroll manual
          accumulatedScroll = container.scrollLeft;
        }
        isInteracting = false;
      }, delay);
    };

    // Eventos exclusivos para dedo en celular (Android / iPhone)
    const handleTouchStart = () => pauseAutoScroll();
    const handleTouchEnd = () => resumeAutoScroll(1200);

    // Eventos exclusivos para mouse en computadora (ignorando toques falsos de celular)
    const handleMouseEnter = () => {
      if (window.matchMedia('(hover: hover)').matches) pauseAutoScroll();
    };
    const handleMouseLeave = () => {
      if (window.matchMedia('(hover: hover)').matches) resumeAutoScroll(300);
    };

    // Si usa la rueda del mouse o trackpad
    const handleWheel = () => {
      pauseAutoScroll();
      resumeAutoScroll(1200);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('wheel', handleWheel, { passive: true });

    const step = () => {
      if (!isInteracting && container) {
        accumulatedScroll += 0.8; // Guardamos los decimales en memoria para que iOS/Android no los ignoren

        const halfWidth = container.scrollWidth / 2;
        if (halfWidth > 0 && accumulatedScroll >= halfWidth) {
          accumulatedScroll -= halfWidth;
        }

        container.scrollLeft = accumulatedScroll;
      } else if (container) {
        // Mientras el usuario desliza con el dedo, actualizamos la posición real
        accumulatedScroll = container.scrollLeft;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resumeTimeout);
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [productos]);

  // Funciones para los botones de flechas laterales
  const scrollLeftBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRightBtn = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Repetimos los productos suficientes veces para garantizar que siempre haya espacio para girar en cualquier pantalla
  const baseList = productos.length > 0 
    ? Array(Math.max(2, Math.ceil(6 / productos.length))).fill(productos).flat() 
    : [];
  const productosInfinitos = [...baseList, ...baseList];

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
              
          
            </div>
            
            {/* Contenedor adaptado con efecto de fondo difuminado para botellas alargadas */}
            <div 
              ref={scrollRef}
              className="productos-container"
              style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                overflowX: 'auto', 
                paddingBottom: '1.5rem', 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y',
                cursor: 'grab'
              }}
            >
              {productosInfinitos.map((prod, index) => (
                <div key={`${prod.id}-${index}`} style={{ minWidth: '280px', maxWidth: '300px', background: '#111', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Contenedor de imagen adaptado para botellas alargadas (fondo difuminado + imagen completa) */}
                  <div style={{ height: '260px', background: '#151515', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {prod.imagen_url ? (
                      <>
                        <img 
                          src={prod.imagen_url} 
                          alt="" 
                          aria-hidden="true"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(0.35)', transform: 'scale(1.2)' }} 
                        />
                        <img 
                          src={prod.imagen_url} 
                          alt={prod.nombre} 
                          style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain', padding: '12px', boxSizing: 'border-box', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' }} 
                        />
                      </>
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