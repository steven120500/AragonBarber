import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function GestionResenas() {
  const [nombre, setNombre] = useState('');
  const [comentario, setComentario] = useState('');
  const [estrellas, setEstrellas] = useState(5);
  const navigate = useNavigate();

  const guardarResena = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('resenas').insert([
      { cliente_nombre: nombre, comentario, estrellas, publicado: true }
    ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Reseña publicada con éxito');
      setNombre('');
      setComentario('');
    }
  };

  return (
    <div style={{ padding: '2rem', background: 'var(--black)', minHeight: '100vh', color: 'var(--cream)' }}>
      <button onClick={() => navigate('/admin/citas')} style={{ background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '0.5rem 1rem', borderRadius: '50px', cursor: 'pointer', marginBottom: '2rem' }}>
        ← Volver
      </button>
      
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', marginBottom: '2rem' }}>Gestionar Reseñas</h2>
      
      <form onSubmit={guardarResena} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" placeholder="Nombre del cliente" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ padding: '1rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '8px' }} />
        <textarea placeholder="Comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} required style={{ padding: '1rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '8px', minHeight: '100px' }} />
        <select value={estrellas} onChange={(e) => setEstrellas(Number(e.target.value))} style={{ padding: '1rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '8px' }}>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} estrellas</option>)}
        </select>
        <button type="submit" style={{ background: 'var(--gold)', color: '#000', padding: '1rem', borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Publicar Reseña</button>
      </form>
    </div>
  );
}