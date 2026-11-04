import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BookingWrapper from '../components/booking/BookingWrapper';
import Reseñas from '../components/layout/Reseñas';
import Nosotros from '../components/layout/Nosotros';
import { supabase } from '../services/supabaseClient'; 

export default function LandingPage() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    // Observer para animaciones de entrada al hacer scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    // Función con rastreadores de errores
    const fetchProductos = async () => {
      console.log("Intentando buscar productos en Supabase...");
      
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('stock', true) 
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("❌ ERROR AL TRAER PRODUCTOS:", error.message);
      } else {
        console.log("✅ PRODUCTOS ENCONTRADOS:", data);
        setProductos(data || []);
      }
    };
    
    fetchProductos();

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: '#000', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <Navbar />

      <section className="hero" id="inicio" style={{ padding: '0', maxWidth: '100%', background: 'transparent', border: 'none' }}>
        <div className="hero-left">
          <div className="hero-badge">Barbería Premium · Est. 2026</div>
          <h1 className="hero-title">
            El arte del<br />
            corte <span className="accent text-gold">perfecto</span>
          </h1>
          <p className="hero-sub">
            Experiencia de barbería de élite. Desde el corte clásico hasta el estilo más contemporáneo
          </p>
          <div className="hero-actions">
            <a href="/#reservar" className="btn-primary">Reservar ahora</a>
            <a href="/#servicios" className="btn-ghost">Ver servicios →</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-main">
            <div className="hero-stripe"></div>
          </div>
        </div>
      </section>

      <section id="servicios" className="reveal" style={{ padding: '4rem 2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <h2 className="section-title">Servicios</h2>
        <p style={{ textAlign: 'center', color: 'var(--grey)' }}>Corte, barba y más...</p>
      </section>

      {/* ─── SECCIÓN DE PRODUCTOS (FORZADA A APARECER PARA DEBUG) ─── */}
      <section id="productos" style={{ padding: '4rem 2rem', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        <h2 className="section-title">Nuestros Productos</h2>
        <p style={{ textAlign: 'center', color: 'var(--grey)', marginBottom: '3rem' }}>Lleva la calidad de la barbería a tu casa</p>
        
        {productos.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gold)', padding: '2rem', border: '1px dashed #333', borderRadius: '12px' }}>
            <p>Buscando productos en el inventario...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--grey)' }}>(Si este mensaje no desaparece, revisa la consola del navegador)</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '2rem', snapType: 'x mandatory' }}>
            {productos.map(prod => (
              <div key={prod.id} style={{ minWidth: '280px', maxWidth: '300px', background: '#111', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', flexShrink: 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column' }}>
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
                      href={`https://wa.me/50688888888?text=Hola,%20me%20interesa%20comprar%20el%20producto:%20${encodeURIComponent(prod.nombre)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ background: '#25D366', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'opacity 0.2s' }}
                    >
                      📲 Pedir
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <style>{`
          #productos div::-webkit-scrollbar { display: none; }
          #productos div { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </section>

      <section id="reservar" className="reveal" style={{ padding: '4rem 2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <h2 className="section-title">Reserva tu cita</h2>
        <BookingWrapper />
      </section>

      <Nosotros />
      <Reseñas />
      <Footer />
    </div>
  );
}