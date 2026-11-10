import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/layout/Navbar'; 
import Hero from './components/layout/Hero';
import Intro from './components/layout/Intro';
import { debeMostrarIntro } from './components/layout/introStorage';
import BookingWrapper from './components/booking/BookingWrapper';
import Footer from './components/layout/Footer';
import Reseñas from './components/layout/Reseñas';
import Nosotros from './components/layout/Nosotros';
import CancelarCita from './pages/CancelarCita'; 
import { supabase } from './services/supabaseClient';
import { formatearPrecio } from './utils/formato';
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import './components/layout/productos.css';

// Vistas del Administrador (se cargan solo cuando se visitan, así la página
// principal no descarga las librerías de PDF y gráficos)
const Login = lazy(() => import('./pages/admin/Login'));
const MisCitas = lazy(() => import('./pages/admin/MisCitas'));
const Finanzas = lazy(() => import('./pages/admin/Finanzas'));
const GestionProductos = lazy(() => import('./pages/admin/GestionProductos'));
const GestionResenas = lazy(() => import('./pages/admin/GestionResenas'));

// Ancho de cada tarjeta del carrusel + su separación (290px + 24px)
const ANCHO_TARJETA = 314;

function LandingPage() {
  const [productos, setProductos] = useState([]);
  const [mostrarIntro] = useState(debeMostrarIntro);
  const [introLista, setIntroLista] = useState(!mostrarIntro);
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

  // Multiplicamos la lista para que una mitad sea más ancha que la pantalla (incluso monitores 4K)
  const tarjetasMinimas = Math.ceil(Math.max(window.innerWidth, 1920) / ANCHO_TARJETA) + 2;
  const baseList = productos.length > 0
    ? Array(Math.max(1, Math.ceil(tarjetasMinimas / productos.length))).fill(productos).flat()
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
      {mostrarIntro && !introLista && <Intro onFinish={() => setIntroLista(true)} />}
      <Nav />
      <Hero ready={introLista} />
      
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
        <section id="productos" className="pc-section">
          <div className="pc-head">
            <div>
              <span className="pc-eyebrow"><i aria-hidden="true" /> Minitienda</span>
              <h2 className="pc-title">Nuestros <em>productos</em></h2>
              <p className="pc-sub">Lleva la calidad de la barbería a tu casa. Desliza libremente o deja que se mueva solo.</p>
            </div>

            <div className="pc-arrows">
              <button type="button" onClick={() => controlsRef.current.boost?.(1)} className="pc-arrow" aria-label="Productos anteriores">
                <ArrowLeft size={18} />
              </button>
              <button type="button" onClick={() => controlsRef.current.boost?.(-1)} className="pc-arrow" aria-label="Más productos">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Ventana del carrusel */}
          <div className="pc-viewport">
            <div ref={trackRef} className="productos-gpu-track pc-track">
              {productosInfinitos.map((prod, index) => (
                <article
                  key={`${prod.id}-${index}`}
                  className="pc-card"
                  aria-hidden={index >= baseList.length ? 'true' : undefined}
                >
                  <div className="pc-media">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} draggable="false" loading="lazy" />
                    ) : (
                      <span className="pc-placeholder">💈</span>
                    )}
                    <span className="pc-price">{formatearPrecio(prod.precio)}</span>
                  </div>

                  <div className="pc-body">
                    <h3 className="pc-name">{prod.nombre}</h3>
                    <p className="pc-desc">{prod.descripcion}</p>
                    <a
                      href={`https://wa.me/50683678788?text=${encodeURIComponent(`Hola, me interesa este producto: ${prod.nombre}\n\n📝 Descripción: ${prod.descripcion}\n💰 Precio: ${formatearPrecio(prod.precio)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="pc-cta"
                      draggable="false"
                      tabIndex={index >= baseList.length ? -1 : undefined}
                    >
                      <MessageCircle size={16} /> Pedir por WhatsApp
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. SECCIÓN DE RESEÑAS / TESTIMONIOS */}
      <Reseñas />

      <Nosotros />
      
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#000' }} />}>
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
      </Suspense>
    </Router>
  );
}