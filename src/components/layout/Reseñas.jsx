import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Quote } from 'lucide-react'; // Añadimos este icono para darle un toque más premium

export default function Reseñas() {
  const [resenas, setResenas] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const fetchResenas = async () => {
      const { data } = await supabase.from('resenas').select('*').eq('publicado', true);
      if (data) setResenas(data);
    };
    fetchResenas();
  }, []);

  // Lógica de rotación a 3 segundos
  useEffect(() => {
    if (resenas.length === 0) return;
    
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % resenas.length);
    }, 3000); 

    return () => clearInterval(interval);
  }, [resenas.length]);

  if (resenas.length === 0) return null;

  return (
    <section id="reseñas" style={{ padding: '6rem 2rem', background: '#000', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        
        <p style={{ color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Testimonios
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', color: 'var(--gold)', marginBottom: '3rem' }}>
          Lo que dicen nuestros clientes
        </h2>

        {/* Contenedor central */}
        <div style={{ 
          background: '#0a0a0a', 
          padding: '3.5rem 2.5rem', 
          borderRadius: '16px', 
          border: '1px solid #222',
          minHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          
          {/* El key={index} es la magia que reinicia la animación cada 3 segundos */}
          <div key={index} style={{ animation: 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            <Quote size={40} color="var(--gold)" style={{ opacity: 0.3, margin: '0 auto 1.5rem', display: 'block' }} />
            
            <p style={{ color: 'var(--cream)', fontStyle: 'italic', marginBottom: '2rem', lineHeight: '1.8', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              "{resenas[index].comentario}"
            </p>
            
            <div>
              <div style={{ color: 'var(--gold)', marginBottom: '0.8rem', fontSize: '1.2rem' }}>
                {'★'.repeat(resenas[index].estrellas)}
              </div>
              <h4 style={{ color: 'var(--grey)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem' }}>
                — {resenas[index].cliente_nombre}
              </h4>
            </div>
          </div>

          {/* Barra de progreso de 3 segundos en la parte inferior de la tarjeta */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: '#222', width: '100%' }}>
            <div key={`progress-${index}`} style={{ height: '100%', background: 'var(--gold)', animation: 'progress 3s linear forwards' }}></div>
          </div>

        </div>

        {/* Indicadores (Dots) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '2rem' }}>
          {resenas.map((_, dotIndex) => (
            <div 
              key={dotIndex}
              onClick={() => setIndex(dotIndex)}
              style={{
                width: index === dotIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '8px',
                background: index === dotIndex ? 'var(--gold)' : '#333',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

      </div>

      {/* Animaciones CSS inyectadas */}
      <style>{`
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </section>
  );
}