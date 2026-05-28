import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para Modales de Acción (Pago y Cancelación)
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [citaActiva, setCitaActiva] = useState(null);
  const [isModalCancelOpen, setIsModalCancelOpen] = useState(false);
  const [citaToCancel, setCitaToCancel] = useState(null);

  // Estados para Modales de Alerta y Desbloqueo
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, mensaje: '' });
  const [modalDesbloqueo, setModalDesbloqueo] = useState({ isOpen: false, id: null, dia: '', hora: '' });

  // Estados para Horario
  const [seleccion, setSeleccion] = useState({});
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const bloquesHorarios = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  // ─── NUEVO: FUNCIÓN PARA CONVERTIR A FORMATO 12 HORAS (AM/PM) ───
  const formato12h = (hora24) => {
    if (!hora24) return '';
    const [horaStr, minuto] = hora24.split(':');
    let h = parseInt(horaStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // El 0 se convierte en 12
    return `${h}:${minuto} ${ampm}`;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin'); 
      } else {
        cargarDatos();
      }
    };
    checkUser();
  }, [navigate]);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: dataCitas } = await supabase
      .from('citas')
      .select('*')
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    const { data: dataBloqueos } = await supabase.from('horarios_bloqueados').select('*');

    setCitas(dataCitas || []);
    setBloqueos(dataBloqueos || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  // ─── LÓGICA MATRIZ DE HORARIOS (EXCEPCIONES) ───
  const getCitaEnCelda = (diaIdx, hora) => {
    return citas.find(c => {
      const [year, month, day] = c.fecha.split('-');
      const fechaObj = new Date(year, month - 1, day);
      const diaJS = fechaObj.getDay(); 
      const diaMatriz = diaJS === 0 ? 6 : diaJS - 1; 
      return diaMatriz === diaIdx && c.hora.substring(0, 5) === hora;
    });
  };

  const toggleCelda = (dia, hora, diaIdx) => {
    const bloqueadoDB = bloqueos.find(b => b.dia_semana === diaIdx + 1 && b.hora_inicio.substring(0, 5) === hora);
    
    if (bloqueadoDB) {
      setModalDesbloqueo({ isOpen: true, id: bloqueadoDB.id, dia, hora });
      return;
    }

    const citaExistente = getCitaEnCelda(diaIdx, hora);
    if (citaExistente) {
      setModalAlerta({ isOpen: true, mensaje: "No puedes cerrar este horario, ya tienes una cita agendada." });
      return;
    }

    setSeleccion(prev => ({ ...prev, [`${dia}-${hora}`]: !prev[`${dia}-${hora}`] }));
  };

  const confirmarDesbloqueo = async () => {
    if (!modalDesbloqueo.id) return;
    await supabase.from('horarios_bloqueados').delete().eq('id', modalDesbloqueo.id);
    setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '' });
    cargarDatos();
  };

  const aplicarCierres = async () => {
    const nuevos = Object.keys(seleccion).filter(k => seleccion[k]).map(key => {
      const [dia, hora] = key.split('-');
      return { dia_semana: diasSemana.indexOf(dia) + 1, hora_inicio: `${hora}:00`, hora_fin: `${parseInt(hora)+1}:00` };
    });
    
    if (nuevos.length > 0) {
      await supabase.from('horarios_bloqueados').insert(nuevos);
      setSeleccion({});
      cargarDatos();
    }
  };

  // ─── LÓGICA DE PRECIOS FIJOS ───
  const obtenerPrecioFijo = (servicio) => {
    if (!servicio) return 4000;
    const serv = servicio.toLowerCase();
    if (serv.includes('corte y barba') || serv.includes('combo')) return 6000;
    if (serv.includes('barba')) return 2000;
    if (serv.includes('corte')) return 4000;
    return 4000;
  };

  // ─── LÓGICA DE PAGO Y CANCELACIÓN ───
  const procesarPago = async (e) => {
    e.preventDefault();
    const precioFijo = obtenerPrecioFijo(citaActiva?.servicio);

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'Completada', precio: precioFijo })
      .eq('id', citaActiva.id);

    if (error) {
      setModalAlerta({ isOpen: true, mensaje: 'Error al registrar el cobro en el sistema.' });
    } else {
      setIsModalPagoOpen(false);
      setCitaActiva(null);
      cargarDatos();
    }
  };

  const confirmarCancelacion = async () => {
    if (!citaToCancel) return;
    const { error } = await supabase
      .from('citas')
      .update({ estado: 'Cancelada' })
      .eq('id', citaToCancel.id);

    if (error) {
      setModalAlerta({ isOpen: true, mensaje: 'Hubo un error al cancelar la cita.' });
    } else {
      setIsModalCancelOpen(false);
      setCitaToCancel(null);
      cargarDatos();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--cream)', padding: '2rem' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'var(--cream)', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Inicio
          </button>
          <button onClick={handleLogout} style={{ background: '#ff4444', color: '#ffffff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Salir
          </button>
        </div>
      </header>

      {/* ─── CALENDARIO SEMANAL (EXCEPCIONES) ─── */}
      <section style={{ marginBottom: '4rem', overflowX: 'auto', background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222' }}>
        <h2 style={{ color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif", fontSize: '2rem' }}>Horario de Excepciones</h2>
        <p style={{ textAlign: 'center', color: 'var(--grey)', marginBottom: '2rem', fontSize: '0.85rem' }}>Toca un bloque para marcarlo como cerrado. Toca uno rojo para volver a abrirlo.</p>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={thStyle}>Hora</th>
              {diasSemana.map(d => <th key={d} style={thStyle}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {bloquesHorarios.map(h => (
              <tr key={h}>
                {/* Aquí aplicamos el formato visual de 12h */}
                <td style={{...tdStyle, fontWeight: 'bold', color: 'var(--gold)'}}>{formato12h(h)}</td>
                {diasSemana.map((d, idx) => {
                  const cita = getCitaEnCelda(idx, h);
                  const bloqueadoDB = bloqueos.some(b => b.dia_semana === idx + 1 && b.hora_inicio.substring(0, 5) === h);
                  const estaSeleccionado = seleccion[`${d}-${h}`];

                  let bgColor = '#111'; // Disponible
                  let textColor = '#fff';
                  let cursorStyle = 'pointer';

                  if (cita) {
                    bgColor = 'var(--gold)';
                    textColor = '#000';
                    cursorStyle = 'not-allowed';
                  } else if (bloqueadoDB) {
                    bgColor = '#ff4444'; // Rojo oscuro para los ya guardados
                  } else if (estaSeleccionado) {
                    bgColor = '#ff6b6b'; // Rojo claro para los seleccionados
                  }

                  return (
                    <td key={d} 
                      onClick={() => toggleCelda(d, h, idx)} 
                      style={{
                        ...tdStyle, 
                        background: bgColor,
                        color: textColor,
                        cursor: cursorStyle,
                        fontWeight: cita ? 'bold' : 'normal',
                        border: '1px solid #222'
                      }}
                    >
                      {cita ? cita.cliente_nombre : (bloqueadoDB ? 'CERRADO' : '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {Object.keys(seleccion).length > 0 && (
          <button onClick={aplicarCierres} style={{ width: '100%', background: '#ff4444', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '8px', fontWeight: 'bold', marginTop: '1.5rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', animation: 'fadeInUp 0.3s ease' }}>
            Guardar Cierres Seleccionados
          </button>
        )}
      </section>

      {/* ─── AGENDA DE CITAS ACTIVAS ─── */}
      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--gold)' }}>
          Agenda Activa
        </h2>

        {loading ? (
          <p style={{ color: 'var(--grey)' }}>Cargando agenda...</p>
        ) : citas.length === 0 ? (
          <div style={{ padding: '3rem', border: '1px dashed #333', textAlign: 'center', borderRadius: '12px' }}>
            <p style={{ color: 'var(--grey)' }}>La agenda está limpia. No hay citas pendientes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {citas.map((cita) => (
              <div key={cita.id} style={{ 
                background: '#111', border: '1px solid #222', padding: '1.5rem', borderRadius: '12px', 
                borderLeft: '4px solid var(--gold)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cita.fecha}</span>
                  {/* Formato 12h en la tarjeta de la cita */}
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formato12h(cita.hora.substring(0, 5))}</span>
                </div>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                  {cita.cliente_nombre} {cita.apellido}
                </h3>
                
                <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Servicio: <span style={{ color: 'var(--cream)', fontWeight: 'bold' }}>{cita.servicio}</span>
                </p>
                
                <div style={{ display: 'flex', gap: '0.8rem', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
                  <button onClick={() => { setCitaToCancel(cita); setIsModalCancelOpen(true); }} style={btnCancel}>
                    Cancelar
                  </button>
                  <button onClick={() => { setCitaActiva(cita); setIsModalPagoOpen(true); }} style={btnCobrar}>
                    Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── MODAL PREMIUM DE PAGO ─── */}
      {isModalPagoOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Procesar Cobro</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Finalizando cita de <span style={{ color: 'white' }}>{citaActiva?.cliente_nombre}</span>.
            </p>

            <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333', marginBottom: '2rem' }}>
              <p style={{ color: 'var(--grey)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Total a cobrar</p>
              <h2 style={{ color: '#00C851', fontSize: '2.5rem', margin: 0 }}>₡{obtenerPrecioFijo(citaActiva?.servicio).toLocaleString()}</h2>
              <p style={{ color: 'var(--cream)', marginTop: '0.5rem', fontWeight: 'bold' }}>{citaActiva?.servicio}</p>
            </div>

            <form onSubmit={procesarPago} style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={() => setIsModalPagoOpen(false)} style={btnBack}>Atrás</button>
              <button type="submit" style={btnConfirmGreen}>Confirmar Pago</button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CANCELAR CITA ─── */}
      {isModalCancelOpen && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, border: '1px solid rgba(255, 68, 68, 0.3)' }}>
            <div style={iconWarningStyle}>⚠️</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>¿Cancelar cita?</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Se eliminará a <span style={{ color: 'white', fontWeight: 'bold' }}>{citaToCancel?.cliente_nombre}</span> de la agenda.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setIsModalCancelOpen(false)} style={btnBack}>Mantener</button>
              <button onClick={confirmarCancelacion} style={btnConfirmRed}>Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL PARA DESBLOQUEAR HORARIO ─── */}
      {modalDesbloqueo.isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--cream)', marginBottom: '0.5rem' }}>¿Abrir horario?</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Estás a punto de habilitar nuevamente el <strong style={{color: 'white'}}>{modalDesbloqueo.dia} a las {formato12h(modalDesbloqueo.hora)}</strong> para reservas.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '' })} style={btnBack}>Cancelar</button>
              <button onClick={confirmarDesbloqueo} style={btnConfirmLight}>Sí, abrir</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ALERTA GENERAL ─── */}
      {modalAlerta.isOpen && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <div style={iconAlertStyle}>!</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>Atención</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              {modalAlerta.mensaje}
            </p>
            <button onClick={() => setModalAlerta({ isOpen: false, mensaje: '' })} style={btnConfirmGold}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── ESTILOS REUTILIZABLES ───
const thStyle = { border: '1px solid #222', padding: '12px', color: 'var(--gold)', background: '#111', textTransform: 'uppercase', letterSpacing: '0.1em' };
const tdStyle = { border: '1px solid #222', padding: '10px', textAlign: 'center', height: '55px', verticalAlign: 'middle', transition: 'background 0.2s ease' };

const btnCancel = { flex: 1, background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255,68,68,0.5)', color: '#ff4444', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' };
const btnCobrar = { flex: 1, background: '#00C851', border: 'none', color: '#000', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' };

// Estilos de Modales
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#0a0a0a', border: '1px solid #222', padding: '2.5rem', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const iconWarningStyle = { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' };
const iconAlertStyle = { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 'bold' };

// Botones de Modales
const btnBack = { flex: 1, background: 'transparent', border: '1px solid #444', color: 'var(--grey)', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGreen = { flex: 1, background: '#00C851', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmRed = { flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmLight = { flex: 1, background: 'var(--cream)', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGold = { width: '100%', background: 'var(--gold)', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };