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
  const trackRef = useRef(null);
  const controlsRef = useRef({ boost: null });

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

  // Multiplicamos la lista para que una mitad sea más ancha que cualquier pantalla
  const baseList = productos.length > 0 
    ? Array(Math.max(3, Math.ceil(8 / productos.length))).fill(productos).flat() 
    : [];
  const productosInfinitos = [...baseList, ...baseList];

  // ─── MOTOR FÍSICO GPU (TRANSLATE3D) CON INERCIA TÁCTIL SIN TRABAS ───
  useEffect(() => {
    const track = trackRef.current;
    if (!track || productos.length === 0) return;

    let animationFrameId;
    let pos = 0; // Posición actual en píxeles
    const autoSpeed = -0.65; // Velocidad automática hacia la izquierda
    let velocity = autoSpeed;

    let isDragging = false;
    let isHovering = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let isHorizontalDrag = null;
    let hasMoved = false;

    const getHalfWidth = () => track.scrollWidth / 2;

    // Mantiene la posición en un bucle infinito invisible hacia ambos lados
    const normalizePosition = () => {
      const halfWidth = getHalfWidth();
      if (halfWidth <= 0) return;

      if (pos <= -halfWidth) {
        pos += halfWidth;
      } else if (pos > 0) {
        pos -= halfWidth;
      }
    };

    // Permite que las flechas impulsen el carrusel suavemente
    controlsRef.current.boost = (dir) => {
      velocity = dir * 14;
    };

    // ─── EVENTOS TÁCTILES (IPHONE Y ANDROID) ───
    const onTouchStart = (e) => {
      isDragging = true;
      isHorizontalDrag = null;
      hasMoved = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lastX = startX;
      lastTime = performance.now();
      velocity = 0; // Se detiene al instante bajo tu dedo sin pegones
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - lastX;
      const totalDx = Math.abs(currentX - startX);
      const totalDy = Math.abs(currentY - startY);

      // Detecta si el usuario quiere mover el carrusel o bajar por la página
      if (isHorizontalDrag === null) {
        if (totalDx > 6 || totalDy > 6) {
          isHorizontalDrag = totalDx > totalDy;
        }
      }

      if (isHorizontalDrag) {
        if (e.cancelable) e.preventDefault(); // Evita que la pantalla tiemble al deslizar productos
        hasMoved = true;
        const now = performance.now();
        const dt = Math.max(now - lastTime, 8);

        pos += dx;
        normalizePosition();
        track.style.transform = `translate3d(${pos}px, 0, 0)`;

        // Calcula la fuerza del dedo para la inercia al soltar
        velocity = (dx / dt) * 16.67;
        lastX = currentX;
        lastTime = now;
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
      isHorizontalDrag = null;
    };

    // ─── EVENTOS DE MOUSE Y TRACKPAD (PC) ───
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      lastX = startX;
      lastTime = performance.now();
      velocity = 0;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const dx = currentX - lastX;
      if (Math.abs(currentX - startX) > 5) hasMoved = true;

      const now = performance.now();
      const dt = Math.max(now - lastTime, 8);

      pos += dx;
      normalizePosition();
      track.style.transform = `translate3d(${pos}px, 0, 0)`;

      velocity = (dx / dt) * 16.67;
      lastX = currentX;
      lastTime = now;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseEnter = () => {
      if (window.matchMedia('(hover: hover)').matches) isHovering = true;
    };

    const onMouseLeave = () => {
      isHovering = false;
      isDragging = false;
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        pos -= e.deltaX;
        normalizePosition();
        velocity = -e.deltaX * 0.3;
      }
    };

    // Evita que al arrastrar con el mouse se abra WhatsApp por accidente
    const onClickCapture = (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    track.addEventListener('touchcancel', onTouchEnd, { passive: true });
    track.addEventListener('mousedown', onMouseDown);
    track.addEventListener('mouseenter', onMouseEnter);
    track.addEventListener('mouseleave', onMouseLeave);
    track.addEventListener('wheel', onWheel, { passive: false });
    track.addEventListener('click', onClickCapture, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // ─── BUCLE DE ANIMACIÓN A 60/120 FPS CON FÍSICA SUAVE ───
    const step = () => {
      if (!isDragging) {
        const targetVelocity = isHovering ? 0 : autoSpeed;
        // Fricción suave: pasa de la velocidad de tu dedo a la velocidad automática sin frenazos
        velocity += (targetVelocity - velocity) * 0.04;
        pos += velocity;
        normalizePosition();
        track.style.transform = `translate3d(${pos}px, 0, 0)`;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove);
      track.removeEventListener('touchend', onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
      track.removeEventListener('mousedown', onMouseDown);
      track.removeEventListener('mouseenter', onMouseEnter);
      track.removeEventListener('mouseleave', onMouseLeave);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [productos]);

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
      
      {/* 2. BANDA DE PRODUCTOS CON MOTOR FÍSICO GPU */}
      {productos.length > 0 && (
        <section id="productos" style={{ padding: '4rem 0', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="hero-title" style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Nuestros Productos</h2>
                <p className="section-sub" style={{ margin: 0 }}>Lleva la calidad de la barbería a tu casa. Desliza libremente o deja que se mueva solo.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button onClick={() => controlsRef.current.boost?.(1)} style={flechaBtnStyle} title="Anterior">←</button>
                <button onClick={() => controlsRef.current.boost?.(-1)} style={flechaBtnStyle} title="Siguiente">→</button>
              </div>
            </div>
          </div>
            
          {/* Ventana del carrusel */}
          <div style={{ width: '100%', overflow: 'hidden', padding: '0.5rem 0 1.5rem 0' }}>
            <div 
              ref={trackRef}
              className="productos-gpu-track"
              style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                width: 'max-content',
                willChange: 'transform',
                touchAction: 'pan-y',
                cursor: 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              {productosInfinitos.map((prod, index) => (
                <div 
                  key={`${prod.id}-${index}`} 
                  style={{ 
                    width: '290px', 
                    background: '#111', 
                    borderRadius: '14px', 
                    border: '1px solid #262626', 
                    overflow: 'hidden', 
                    flexShrink: 0, 
                    display: 'flex', 
                    flexDirection: 'column'
                  }}
                >
                  {/* Contenedor de imagen limpio e integrado */}
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
                        draggable="false"
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
            .productos-gpu-track:active {
              cursor: grabbing;
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