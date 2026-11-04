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

  // Creamos una lista base amplia y la triplicamos (Izquierda - Centro - Derecha)
  // Esto garantiza que nunca choques con el borde 0 al devolver el scroll
  const baseList = productos.length > 0 
    ? Array(Math.max(2, Math.ceil(6 / productos.length))).fill(productos).flat() 
    : [];
  const productosInfinitos = [...baseList, ...baseList, ...baseList];

  // ─── MOTOR DE CARRUSEL INFINITO SIN BLOQUEOS (PC, ANDROID Y IPHONE) ───
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || productos.length === 0) return;

    let animationFrameId;
    let isPointerDown = false;
    let isHovering = false;
    let pauseUntil = 0; // Marca de tiempo para respetar la inercia del dedo
    let exactScroll = 0;
    let initialized = false;

    // Variables para permitir arrastrar con el mouse en PC (Click & Drag)
    let startX = 0;
    let startScrollLeft = 0;

    const initPosition = () => {
      const oneThird = container.scrollWidth / 3;
      if (oneThird > 0 && !initialized) {
        container.scrollLeft = oneThird;
        exactScroll = oneThird;
        initialized = true;
      }
    };

    initPosition();
    setTimeout(initPosition, 120);

    // Mantiene la posición siempre en el tercio central de forma invisible
    const wrapScroll = () => {
      const oneThird = container.scrollWidth / 3;
      if (oneThird <= 0) return;

      if (container.scrollLeft >= oneThird * 2) {
        container.scrollLeft -= oneThird;
        exactScroll = container.scrollLeft;
      } else if (container.scrollLeft <= 10) {
        container.scrollLeft += oneThird;
        exactScroll = container.scrollLeft;
      }
    };

    // 1. Eventos Táctiles (iPhone / Android)
    const onTouchStart = () => {
      isPointerDown = true;
    };

    const onTouchEnd = () => {
      isPointerDown = false;
      // Damos 1.4 segundos libres para que la inercia del dedo en el celular termine suave
      pauseUntil = performance.now() + 1400;
      exactScroll = container.scrollLeft;
    };

    // 2. Eventos de Rueda / Trackpad
    const onWheel = () => {
      pauseUntil = performance.now() + 1000;
      wrapScroll();
      exactScroll = container.scrollLeft;
    };

    // 3. Eventos de Mouse en PC (Pausa al pasar el cursor + arrastrar con clic)
    const onMouseEnter = () => {
      if (window.matchMedia('(hover: hover)').matches) {
        isHovering = true;
      }
    };

    const onMouseLeave = () => {
      isHovering = false;
      isPointerDown = false;
      exactScroll = container.scrollLeft;
    };

    const onMouseDown = (e) => {
      isPointerDown = true;
      startX = e.pageX - container.offsetLeft;
      startScrollLeft = container.scrollLeft;
    };

    const onMouseMove = (e) => {
      if (!isPointerDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = startScrollLeft - walk;
      wrapScroll();
      exactScroll = container.scrollLeft;
    };

    const onMouseUp = () => {
      if (isPointerDown) {
        isPointerDown = false;
        exactScroll = container.scrollLeft;
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: true });
    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let lastTime = performance.now();

    const step = (now) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      if (container) {
        const isPaused = isPointerDown || isHovering || now < pauseUntil;

        if (!isPaused) {
          // Avanza a 45 píxeles por segundo sin importar los Hz de la pantalla
          exactScroll += (45 * dt) / 1000;
          container.scrollLeft = exactScroll;
          wrapScroll();
        } else {
          // Mientras el usuario desliza manualmente o hay inercia, solo vigilamos los bordes
          wrapScroll();
          exactScroll = container.scrollLeft;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('mouseenter', onMouseEnter);
        container.removeEventListener('mouseleave', onMouseLeave);
        container.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [productos]);

  // Botones de flechas por si el usuario prefiere tocarlos
  const moverManual = (direccion) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direccion * 310, behavior: 'smooth' });
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
      
      {/* 2. BANDA DE PRODUCTOS FLUIDA */}
      {productos.length > 0 && (
        <section id="productos" style={{ padding: '4rem 2rem', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="hero-title" style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Nuestros Productos</h2>
                <p className="section-sub" style={{ margin: 0 }}>Lleva la calidad de la barbería a tu casa. Desliza libremente o deja que se mueva solo.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button onClick={() => moverManual(-1)} style={flechaBtnStyle} title="Anterior">←</button>
                <button onClick={() => moverManual(1)} style={flechaBtnStyle} title="Siguiente">→</button>
              </div>
            </div>
            
            <div 
              ref={scrollRef}
              className="productos-container"
              style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                overflowX: 'auto', 
                paddingBottom: '1.5rem', 
                WebkitOverflowScrolling: 'touch',
                cursor: 'grab'
              }}
            >
              {productosInfinitos.map((prod, index) => (
                <div 
                  key={`${prod.id}-${index}`} 
                  style={{ 
                    minWidth: '280px', 
                    maxWidth: '300px', 
                    background: '#111', 
                    borderRadius: '14px', 
                    border: '1px solid #262626', 
                    overflow: 'hidden', 
                    flexShrink: 0, 
                    display: 'flex', 
                    flexDirection: 'column',
                    userSelect: 'none'
                  }}
                >
                  {/* Contenedor de imagen con fondo gris neutro (#404040) que se funde con tus fotos sin marcos raros */}
                  <div style={{ 
                    height: '250px', 
                    background: '#404040', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    overflow: 'hidden', 
                    position: 'relative' 
                  }}>
                    {prod.imagen_url ? (
                      <img 
                        src={prod.imagen_url} 
                        alt={prod.nombre} 
                        draggable="false"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }} 
                      />
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
                        onClick={(e) => e.stopPropagation()}
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
            .productos-container {
              scroll-behavior: auto !important;
              scrollbar-width: thin;
              scrollbar-color: var(--gold) #161616;
            }
            .productos-container:active {
              cursor: grabbing;
            }
            .productos-container::-webkit-scrollbar {
              height: 6px;
            }
            .productos-container::-webkit-scrollbar-track {
              background: #161616;
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
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  fontSize: '1.1rem',
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