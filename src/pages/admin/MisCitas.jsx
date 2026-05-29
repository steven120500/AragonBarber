import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import Nav from '../../components/layout/Navbar';

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [citaActiva, setCitaActiva] = useState(null);
  const [precioEditable, setPrecioEditable] = useState(0); // NUEVO ESTADO PARA EL PRECIO
  
  const [isModalCancelOpen, setIsModalCancelOpen] = useState(false);
  const [citaToCancel, setCitaToCancel] = useState(null);

  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, mensaje: '' });
  const [modalDesbloqueo, setModalDesbloqueo] = useState({ isOpen: false, id: null, dia: '', hora: '', tipo: '' });

  const [seleccion, setSeleccion] = useState({});
  
  // ─── DOMINGOS ELIMINADOS ───
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  
  // ─── HORARIO DE 09:00 AM A 07:30 PM ───
  const bloquesHorarios = (() => {
    const bloques = [];
    for (let h = 9; h < 20; h++) { 
      const horaStr = h.toString().padStart(2, '0');
      bloques.push(`${horaStr}:00`);
      bloques.push(`${horaStr}:30`);
    }
    return bloques;
  })();

  const formato12h = (hora24) => {
    if (!hora24) return '';
    const [horaStr, minuto] = hora24.split(':');
    let h = parseInt(horaStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h}:${minuto} ${ampm}`;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/admin'); 
      else cargarDatos();
    };
    checkUser();
  }, [navigate]);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: dataCitas } = await supabase.from('citas').select('*').eq('estado', 'pendiente').order('fecha', { ascending: true }).order('hora', { ascending: true });
    const { data: dataBloqueos } = await supabase.from('horarios_bloqueados').select('*');

    setCitas(dataCitas || []);
    setBloqueos(dataBloqueos || []);
    setLoading(false);
  };

  const getCitaEnCelda = (diaIdx, hora) => {
    return citas.find(c => {
      const [year, month, day] = c.fecha.split('-');
      const fechaObj = new Date(year, month - 1, day);
      const diaJS = fechaObj.getDay(); 
      const diaMatriz = diaJS === 0 ? 6 : diaJS - 1; 
      return diaMatriz === diaIdx && c.hora.substring(0, 5) === hora;
    });
  };

  // ─── LÓGICA INTELIGENTE DE CELDAS (MAÑANA VS TARDE) ───
  const toggleCelda = (dia, hora, diaIdx) => {
    const hInt = parseInt(hora.split(':')[0]);
    const isManana = hInt < 14; 
    const horaDB = `${hora}:00`;

    const citaExistente = getCitaEnCelda(diaIdx, hora);
    if (citaExistente) {
      setModalAlerta({ isOpen: true, mensaje: "No puedes modificar este horario, ya tienes una cita agendada." });
      return;
    }

    if (isManana) {
      const aperturaExistente = bloqueos.find(b => b.dia_semana === diaIdx + 1 && b.hora_inicio === horaDB && b.hora_fin === horaDB);
      if (aperturaExistente) {
        setModalDesbloqueo({ isOpen: true, id: aperturaExistente.id, dia, hora, tipo: 'cerrar_manana' });
      } else {
        setSeleccion(prev => ({ ...prev, [`${dia}-${hora}`]: !prev[`${dia}-${hora}`] }));
      }
    } else {
      const cierreExistente = bloqueos.find(b => b.dia_semana === diaIdx + 1 && b.hora_inicio === horaDB && b.hora_fin !== horaDB);
      if (cierreExistente) {
        setModalDesbloqueo({ isOpen: true, id: cierreExistente.id, dia, hora, tipo: 'abrir_tarde' });
      } else {
        setSeleccion(prev => ({ ...prev, [`${dia}-${hora}`]: !prev[`${dia}-${hora}`] }));
      }
    }
  };

  const confirmarDesbloqueo = async () => {
    if (!modalDesbloqueo.id) return;
    await supabase.from('horarios_bloqueados').delete().eq('id', modalDesbloqueo.id);
    setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '', tipo: '' });
    cargarDatos(); 
  };

  const aplicarCambios = async () => {
    const nuevos = Object.keys(seleccion).filter(k => seleccion[k]).map(key => {
      const [dia, hora] = key.split('-');
      const [h, m] = hora.split(':');
      const isManana = parseInt(h) < 14;
      
      const diaIdx = diasSemana.indexOf(dia) + 1; 

      if (isManana) {
        return { dia_semana: diaIdx, hora_inicio: `${hora}:00`, hora_fin: `${hora}:00` };
      } else {
        const horaFin = m === '00' ? `${h}:30` : `${(parseInt(h) + 1).toString().padStart(2, '0')}:00`;
        return { dia_semana: diaIdx, hora_inicio: `${hora}:00`, hora_fin: `${horaFin}:00` };
      }
    });
    
    if (nuevos.length > 0) {
      await supabase.from('horarios_bloqueados').insert(nuevos);
      setSeleccion({});
      cargarDatos();
    }
  };

  const obtenerPrecioFijo = (servicio) => {
    if (!servicio) return 4000;
    const serv = servicio.toLowerCase();
    if (serv.includes('corte y barba') || serv.includes('combo')) return 6000;
    if (serv.includes('barba')) return 2000;
    if (serv.includes('corte')) return 4000;
    return 4000;
  };

  const procesarPago = async (e) => {
    e.preventDefault();
    // Guardamos usando el precio modificado en el input
    const { error } = await supabase.from('citas').update({ 
      estado: 'Completada', 
      precio: parseInt(precioEditable) || 0 
    }).eq('id', citaActiva.id);
    
    if (!error) { 
      setIsModalPagoOpen(false); 
      setCitaActiva(null); 
      cargarDatos(); 
    } else {
      setModalAlerta({ isOpen: true, mensaje: 'Error al procesar el pago.' });
    }
  };

  const confirmarCancelacion = async () => {
    if (!citaToCancel) return;
    const { error } = await supabase.from('citas').update({ estado: 'Cancelada' }).eq('id', citaToCancel.id);
    if (!error) { setIsModalCancelOpen(false); setCitaToCancel(null); cargarDatos(); }
  };

  // Función para abrir modal de cobro y pre-cargar el precio
  const iniciarCobro = (cita) => {
    setCitaActiva(cita);
    setPrecioEditable(obtenerPrecioFijo(cita.servicio));
    setIsModalPagoOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--cream)', paddingBottom: '4rem' }}>
      
      <Nav />

      <div style={{ padding: '2rem', paddingTop: '8rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ─── CALENDARIO SEMANAL ─── */}
        <section style={{ marginBottom: '4rem', overflowX: 'auto', background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222' }}>
          <h2 style={{ color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif", fontSize: '2rem' }}>Gestión de Horarios</h2>
          <p style={{ textAlign: 'center', color: 'var(--grey)', marginBottom: '2rem', fontSize: '0.85rem' }}>
            Las mañanas están <span style={{color:'#555', fontWeight:'bold'}}>CERRADAS</span> por defecto (tócalas para abrir). <br/>
            Las tardes están <span style={{color:'#fff', fontWeight:'bold'}}>ABIERTAS</span> por defecto (tócalas para cerrar).
          </p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Hora</th>
                {diasSemana.map(d => <th key={d} style={thStyle}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {bloquesHorarios.map(h => {
                const isManana = parseInt(h.split(':')[0]) < 14;

                return (
                  <tr key={h}>
                    <td style={{...tdStyle, fontWeight: 'bold', color: 'var(--gold)'}}>{formato12h(h)}</td>
                    {diasSemana.map((d, idx) => {
                      const horaDB = `${h}:00`;
                      const cita = getCitaEnCelda(idx, h);
                      const estaSeleccionado = seleccion[`${d}-${h}`];

                      let bgColor = '#111'; 
                      let textColor = '#fff';
                      let cursorStyle = 'pointer';
                      let texto = '';

                      if (isManana) {
                        const apertura = bloqueos.some(b => b.dia_semana === idx + 1 && b.hora_inicio === horaDB && b.hora_fin === horaDB);
                        if (cita) { bgColor = 'var(--gold)'; textColor = '#000'; cursorStyle = 'not-allowed'; texto = cita.cliente_nombre; } 
                        else if (apertura) { bgColor = '#111'; textColor = '#00C851'; texto = 'ABIERTO'; } 
                        else if (estaSeleccionado) { bgColor = '#00C851'; textColor = '#000'; texto = 'ABRIR'; } 
                        else { bgColor = '#1a1a1a'; textColor = '#444'; texto = 'CERRADO'; }
                      } else {
                        const cierre = bloqueos.some(b => b.dia_semana === idx + 1 && b.hora_inicio === horaDB && b.hora_fin !== horaDB);
                        if (cita) { bgColor = 'var(--gold)'; textColor = '#000'; cursorStyle = 'not-allowed'; texto = cita.cliente_nombre; } 
                        else if (cierre) { bgColor = '#ff4444'; textColor = '#fff'; texto = 'CERRADO'; } 
                        else if (estaSeleccionado) { bgColor = '#ff6b6b'; textColor = '#fff'; texto = 'CERRAR'; }
                      }

                      return (
                        <td key={d} onClick={() => toggleCelda(d, h, idx)} style={{...tdStyle, background: bgColor, color: textColor, cursor: cursorStyle, fontWeight: cita ? 'bold' : 'normal', border: '1px solid #222'}}>
                          {texto}
                        </td>
                      );
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {Object.keys(seleccion).length > 0 && (
            <button onClick={aplicarCambios} style={{ width: '100%', background: 'var(--gold)', color: '#000', border: 'none', padding: '1.2rem', borderRadius: '8px', fontWeight: 'bold', marginTop: '1.5rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', animation: 'fadeInUp 0.3s ease' }}>
              Guardar Cambios de Horario
            </button>
          )}
        </section>

        {/* ─── AGENDA DE CITAS ACTIVAS ─── */}
        <main>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--gold)' }}>Agenda Activa</h2>
          {loading ? <p style={{ color: 'var(--grey)' }}>Cargando agenda...</p> : citas.length === 0 ? (
            <div style={{ padding: '3rem', border: '1px dashed #333', textAlign: 'center', borderRadius: '12px' }}>
              <p style={{ color: 'var(--grey)' }}>La agenda está limpia. No hay citas pendientes.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {citas.map((cita) => (
                <div key={cita.id} style={{ background: '#111', border: '1px solid #222', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--gold)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cita.fecha}</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formato12h(cita.hora.substring(0, 5))}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>{cita.cliente_nombre} {cita.apellido}</h3>
                  <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Servicio: <span style={{ color: 'var(--cream)', fontWeight: 'bold' }}>{cita.servicio}</span></p>
                  <div style={{ display: 'flex', gap: '0.8rem', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
                    <button onClick={() => { setCitaToCancel(cita); setIsModalCancelOpen(true); }} style={btnCancel}>Cancelar</button>
                    <button onClick={() => iniciarCobro(cita)} style={btnCobrar}>Cobrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ─── MODALES (PAGO, CANCELAR Y DESBLOQUEO) ─── */}
        {isModalPagoOpen && (
          <div style={overlayStyle}>
            <div style={modalStyle}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Procesar Cobro</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '2rem' }}>Finalizando cita de <span style={{ color: 'white' }}>{citaActiva?.cliente_nombre}</span>.</p>
              
              <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333', marginBottom: '2rem' }}>
                <p style={{ color: 'var(--grey)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Total a cobrar (₡)</p>
                <input 
                  type="number" 
                  value={precioEditable} 
                  onChange={(e) => setPrecioEditable(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '2px solid #00C851',
                    color: '#00C851',
                    fontSize: '2.5rem',
                    width: '100%',
                    textAlign: 'center',
                    outline: 'none',
                    fontWeight: 'bold',
                    fontFamily: 'system-ui, sans-serif'
                  }}
                  required
                  min="0"
                />
                <p style={{ color: 'var(--cream)', marginTop: '0.5rem', fontWeight: 'bold' }}>{citaActiva?.servicio}</p>
              </div>

              <form onSubmit={procesarPago} style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setIsModalPagoOpen(false)} style={btnBack}>Atrás</button>
                <button type="submit" style={btnConfirmGreen}>Confirmar Pago</button>
              </form>
            </div>
          </div>
        )}

        {isModalCancelOpen && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, border: '1px solid rgba(255, 68, 68, 0.3)' }}>
              <div style={iconWarningStyle}>⚠️</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>¿Cancelar cita?</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>Se eliminará a <span style={{ color: 'white', fontWeight: 'bold' }}>{citaToCancel?.cliente_nombre}</span> de la agenda.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setIsModalCancelOpen(false)} style={btnBack}>Mantener</button>
                <button onClick={confirmarCancelacion} style={btnConfirmRed}>Sí, cancelar</button>
              </div>
            </div>
          </div>
        )}

        {modalDesbloqueo.isOpen && (
          <div style={overlayStyle}>
            <div style={modalStyle}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--cream)', marginBottom: '0.5rem' }}>Modificar Horario</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                Estás a punto de volver a <strong style={{color: 'white'}}>{modalDesbloqueo.tipo === 'cerrar_manana' ? 'CERRAR' : 'ABRIR'}</strong> el {modalDesbloqueo.dia} a las {formato12h(modalDesbloqueo.hora)}.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '', tipo: '' })} style={btnBack}>Cancelar</button>
                <button onClick={confirmarDesbloqueo} style={btnConfirmLight}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {modalAlerta.isOpen && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <div style={iconAlertStyle}>!</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>Atención</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>{modalAlerta.mensaje}</p>
              <button onClick={() => setModalAlerta({ isOpen: false, mensaje: '' })} style={btnConfirmGold}>Entendido</button>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Ocultar flechas del input number para un look más limpio */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
    </div>
  );
}

// ─── ESTILOS REUTILIZABLES ───
const thStyle = { border: '1px solid #222', padding: '12px', color: 'var(--gold)', background: '#111', textTransform: 'uppercase', letterSpacing: '0.1em' };
const tdStyle = { border: '1px solid #222', padding: '10px', textAlign: 'center', height: '45px', verticalAlign: 'middle', transition: 'background 0.2s ease', fontSize: '0.85rem' };
const btnCancel = { flex: 1, background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255,68,68,0.5)', color: '#ff4444', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' };
const btnCobrar = { flex: 1, background: '#00C851', border: 'none', color: '#000', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#0a0a0a', border: '1px solid #222', padding: '2.5rem', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const iconWarningStyle = { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' };
const iconAlertStyle = { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 'bold' };
const btnBack = { flex: 1, background: 'transparent', border: '1px solid #444', color: 'var(--grey)', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGreen = { flex: 1, background: '#00C851', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmRed = { flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmLight = { flex: 1, background: 'var(--cream)', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGold = { width: '100%', background: 'var(--gold)', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };