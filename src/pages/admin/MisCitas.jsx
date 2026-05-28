import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para Modal de PAGO
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [citaActiva, setCitaActiva] = useState(null);
  const [monto, setMonto] = useState('');

  // Estados para Modal de CANCELACIÓN
  const [isModalCancelOpen, setIsModalCancelOpen] = useState(false);
  const [citaToCancel, setCitaToCancel] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin'); 
      } else {
        cargarCitas();
      }
    };
    checkUser();
  }, [navigate]);

  const cargarCitas = async () => {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error('Error al cargar citas:', error);
    } else {
      setCitas(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  // ─── LÓGICA DE CANCELACIÓN (NUEVA) ───
  const solicitarCancelacion = (cita) => {
    setCitaToCancel(cita);
    setIsModalCancelOpen(true);
  };

  const confirmarCancelacion = async () => {
    if (!citaToCancel) return;

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'Cancelada' })
      .eq('id', citaToCancel.id);

    if (error) {
      alert('Hubo un error al cancelar la cita.');
    } else {
      setIsModalCancelOpen(false);
      setCitaToCancel(null);
      cargarCitas();
    }
  };

  // ─── LÓGICA DE PAGO ───
  const abrirModalPago = (cita) => {
    setCitaActiva(cita);
    setMonto('');
    setIsModalPagoOpen(true);
  };

  const procesarPago = async (e) => {
    e.preventDefault();
    if (!monto || isNaN(monto)) return;

    const { error } = await supabase
      .from('citas')
      .update({ 
        estado: 'Completada', 
        precio: parseFloat(monto) 
      })
      .eq('id', citaActiva.id);

    if (error) {
      alert('Error al registrar el pago.');
    } else {
      setIsModalPagoOpen(false);
      setCitaActiva(null);
      cargarCitas(); 
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--cream)', padding: '2rem', position: 'relative' }}>
      
      {/* Header Minimalista con Botones Sólidos */}
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              background: 'var(--cream)', 
              color: '#000',              
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',       
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Volver al inicio
          </button>

          <button 
            onClick={handleLogout} 
            style={{ 
              background: '#ff4444',      
              color: '#ffffff',           
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',       
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Salir
          </button>

        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--gold)' }}>
          Agenda
        </h2>

        {loading ? (
          <p style={{ color: 'var(--grey)' }}>Cargando agenda...</p>
        ) : citas.length === 0 ? (
          <div style={{ padding: '3rem', border: '1px dashed var(--border)', textAlign: 'center', borderRadius: '12px' }}>
            <p style={{ color: 'var(--grey)' }}>No tienes citas programadas por el momento.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {citas.map((cita) => (
              <div key={cita.id} style={{ 
                background: '#111', 
                border: '1px solid var(--border)', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                borderLeft: cita.estado === 'Completada' ? '4px solid #00C851' : cita.estado === 'Cancelada' ? '4px solid #ff4444' : '4px solid var(--gold)',
                opacity: cita.estado === 'Cancelada' ? 0.5 : 1,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cita.fecha}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{cita.hora.substring(0, 5)}</span>
                </div>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                  {cita.cliente_nombre} {cita.apellido}
                </h3>
                
                <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Servicio: <span style={{ color: 'var(--cream)' }}>{cita.servicio}</span>
                </p>
                
                {/* ─── BOTONES REDONDEADOS Y MEJORADOS ─── */}
                <div style={{ display: 'flex', gap: '0.8rem', borderTop: '1px solid rgba(245,245,220,0.05)', paddingTop: '1.5rem' }}>
                  {cita.estado !== 'Completada' && cita.estado !== 'Cancelada' ? (
                    <>
                      <button 
                        onClick={() => solicitarCancelacion(cita)}
                        style={{ flex: 1, background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255,68,68,0.5)', color: '#ff4444', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => abrirModalPago(cita)}
                        style={{ flex: 1, background: 'linear-gradient(135deg, #00C851 0%, #007E33 100%)', border: 'none', color: '#fff', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 4px 15px rgba(0, 200, 81, 0.2)' }}
                      >
                        Cobrar
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: cita.estado === 'Completada' ? '#00C851' : '#ff4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Estado: {cita.estado} {cita.estado === 'Completada' && `- ₡${cita.precio}`}
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── MODAL PREMIUM DE ADVERTENCIA PARA CANCELAR ─── */}
      {isModalCancelOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div style={{ 
            background: '#111', border: '1px solid rgba(255, 68, 68, 0.3)', padding: '2.5rem', 
            borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center',
            boxShadow: '0 10px 40px rgba(255,68,68,0.1)'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' }}>
              ⚠️
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>
              ¿Cancelar cita?
            </h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Estás a punto de cancelar la reserva de <span style={{ color: 'white', fontWeight: 'bold' }}>{citaToCancel?.cliente_nombre}</span>. Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setIsModalCancelOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--grey)', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                Mantener cita
              </button>
              <button onClick={confirmarCancelacion} style={{ flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)' }}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL PREMIUM DE PAGO ─── */}
      {isModalPagoOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div style={{ 
            background: 'var(--card)', border: '1px solid var(--border)', padding: '2.5rem', 
            borderRadius: '16px', width: '90%', maxWidth: '400px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>
              Registrar Cobro
            </h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Monto cobrado a <span style={{ color: 'white' }}>{citaActiva?.cliente_nombre}</span> por {citaActiva?.servicio}.
            </p>

            <form onSubmit={procesarPago} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  placeholder="Ej: 5000" 
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  autoFocus
                  required
                  style={{ background: '#0d0d0d', border: '1px solid var(--border)', color: 'white', padding: '15px', borderRadius: '12px', outline: 'none', fontSize: '1.2rem', textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalPagoOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--grey)', color: 'var(--grey)', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Atrás
                </button>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #00C851 0%, #007E33 100%)', border: 'none', color: '#fff', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0, 200, 81, 0.3)' }}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}