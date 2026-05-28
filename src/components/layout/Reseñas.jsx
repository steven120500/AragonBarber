import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

export default function Reseñas() {
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResenas = async () => {
      const { data, error } = await supabase
        .from('resenas')
        .select('*')
        .eq('publicado', true); // Solo mostramos las que están marcadas como públicas
      
      if (!error) setResenas(data);
      setLoading(false);
    };
    fetchResenas();
  }, []);

  if (loading) return null;

  return (
    <section id="reseñas" style={{ padding: '4rem 2rem', background: '#050505', borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '3rem' }}>
          Lo que dicen nuestros clientes
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {resenas.map((resena) => (
            <div key={resena.id} style={{ 
              background: '#111', 
              padding: '2rem', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <p style={{ color: 'var(--grey)', fontStyle: 'italic', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                "{resena.comentario}"
              </p>
              <div>
                <div style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>
                  {'★'.repeat(resena.estrellas)}
                </div>
                <h4 style={{ color: 'var(--cream)', fontWeight: 'bold' }}>— {resena.cliente_nombre}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}