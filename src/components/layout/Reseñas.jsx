import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

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
    }, 3000); // 3 segundos exactos

    return () => clearInterval(interval);
  }, [resenas.length]);

  if (resenas.length === 0) return null;

  return (
    <section id="reseñas" style={{ padding: '4rem 2rem', background: '#050505', borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '3rem' }}>
          Lo que dicen nuestros clientes
        </h2>

        {/* Contenedor central sin botones */}
        <div style={{ 
          background: '#111', 
          padding: '2.5rem', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'opacity 0.5s ease-in-out'
        }}>
          <p style={{ color: 'var(--grey)', fontStyle: 'italic', marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
            "{resenas[index].comentario}"
          </p>
          <div>
            <div style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>
              {'★'.repeat(resenas[index].estrellas)}
            </div>
            <h4 style={{ color: 'var(--cream)', fontWeight: 'bold' }}>— {resenas[index].cliente_nombre}</h4>
          </div>
        </div>
      </div>
    </section>
  );
}