import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Trash2, Star } from 'lucide-react';
import Nav from '../../components/layout/Navbar'; // ─── NAVBAR INTEGRADO ───

export default function GestionResenas() {
  const [nombre, setNombre] = useState('');
  const [comentario, setComentario] = useState('');
  const [estrellas, setEstrellas] = useState(5);
  const [resenasActivas, setResenasActivas] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Modal de Alertas Personalizado
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', tipo: 'success' });

  useEffect(() => {
    cargarResenas();
  }, []);

  const cargarResenas = async () => {
    const { data } = await supabase
      .from('resenas')
      .select('*')
      .order('id', { ascending: false });
    setResenasActivas(data || []);
  };

  const guardarResena = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('resenas').insert([
      { cliente_nombre: nombre, comentario, estrellas, publicado: true }
    ]);

    setLoading(false);

    if (error) {
      setModalAlerta({ isOpen: true, titulo: 'Error', mensaje: 'No se pudo publicar la reseña.', tipo: 'error' });
    } else {
      setModalAlerta({ isOpen: true, titulo: '¡Publicada!', mensaje: 'La reseña ya es visible en la página principal.', tipo: 'success' });
      setNombre('');
      setComentario('');
      setEstrellas(5);
      cargarResenas();
    }
  };

  const eliminarResena = async (id) => {
    const { error } = await supabase.from('resenas').delete().eq('id', id);
    if (!error) cargarResenas();
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: 'var(--cream)', paddingBottom: '4rem' }}>
      
      {/* ─── NAVBAR INTEGRADO ─── */}
      <Nav />

      {/* ─── CONTENEDOR PRINCIPAL AJUSTADO PARA NO PEGAR CON EL NAVBAR ─── */}
      <div style={{ padding: '2rem', paddingTop: '8rem', maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* TÍTULO PRINCIPAL CENTRADO */}
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--gold)', textAlign: 'center' }}>
          Gestión de Reseñas
        </h2>

        <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem' }}>
          
          {/* COLUMNA IZQUIERDA: CREAR RESEÑA */}
          <div style={{ background: '#0a0a0a', padding: '2.5rem', borderRadius: '16px', border: '1px solid #222', height: 'fit-content', animation: 'fadeIn 0.5s ease' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>Añadir Testimonio</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem' }}>Publica reseñas de clientes satisfechos para mostrarlas en la landing page.</p>
            
            <form onSubmit={guardarResena} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={inputGroup}>
                <label style={labelStyle}>NOMBRE DEL CLIENTE</label>
                <input type="text" placeholder="Ej. Carlos Mora" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={inputStyle} />
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>CALIFICACIÓN</label>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#141414', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Star 
                      key={num} 
                      size={28} 
                      onClick={() => setEstrellas(num)}
                      style={{ 
                        cursor: 'pointer', 
                        color: num <= estrellas ? 'var(--gold)' : '#333',
                        fill: num <= estrellas ? 'var(--gold)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>COMENTARIO</label>
                <textarea placeholder="Escribe lo que dijo el cliente..." value={comentario} onChange={(e) => setComentario(e.target.value)} required style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />
              </div>

              <button type="submit" disabled={loading} style={btnSubmitGold}>
                {loading ? 'PUBLICANDO...' : 'PUBLICAR RESEÑA'}
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: LISTA DE RESEÑAS ACTIVAS */}
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--cream)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>
              Reseñas Publicadas ({resenasActivas.length})
            </h3>

            {resenasActivas.length === 0 ? (
              <p style={{ color: '#666' }}>No hay reseñas publicadas todavía.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {resenasActivas.map(resena => (
                  <div key={resena.id} style={{ background: '#0a0a0a', border: '1px solid #222', padding: '1.5rem', borderRadius: '12px', position: 'relative' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>{resena.cliente_nombre}</h4>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {[...Array(resena.estrellas)].map((_, i) => <Star key={i} size={14} color="var(--gold)" fill="var(--gold)" />)}
                        </div>
                      </div>
                      
                      <button onClick={() => eliminarResena(resena.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        <Trash2 size={16} /> Quitar
                      </button>
                    </div>
                    
                    <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>
                      "{resena.comentario}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL DE ALERTA PREMIUM */}
      {modalAlerta.isOpen && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, border: modalAlerta.tipo === 'error' ? '1px solid rgba(255, 68, 68, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)' }}>
            
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
              background: modalAlerta.tipo === 'error' ? 'rgba(255,68,68,0.1)' : 'rgba(212, 175, 55, 0.1)',
              color: modalAlerta.tipo === 'error' ? '#ff4444' : 'var(--gold)'
            }}>
              {modalAlerta.tipo === 'error' ? '⚠️' : '✓'}
            </div>
            
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '1rem' }}>
              {modalAlerta.titulo}
            </h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              {modalAlerta.mensaje}
            </p>
            <button onClick={() => setModalAlerta({ isOpen: false, titulo: '', mensaje: '', tipo: 'success' })} style={modalAlerta.tipo === 'error' ? btnConfirmRed : btnConfirmGold}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Animaciones CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── ESTILOS REUTILIZABLES PREMIUM ───
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const labelStyle = { color: '#888', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.15em' };
const inputStyle = { background: '#141414', border: '1px solid #333', color: 'white', padding: '1rem', borderRadius: '8px', outline: 'none', fontFamily: 'system-ui, sans-serif', width: '100%', boxSizing: 'border-box' };
const btnSubmitGold = { background: 'var(--gold)', color: '#000', border: 'none', padding: '1rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1rem', transition: 'opacity 0.3s' };

// Modales
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#0a0a0a', padding: '3rem', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' };
const btnConfirmGold = { width: '100%', background: 'var(--gold)', border: 'none', color: '#000', padding: '1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' };
const btnConfirmRed = { width: '100%', background: '#ff4444', border: 'none', color: '#fff', padding: '1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' };