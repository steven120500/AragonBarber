import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Trash2 } from 'lucide-react';
import Nav from '../../components/layout/Navbar'; 

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState('balance');
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para Registro de Gastos de Estudio
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  
  const getFechaCR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
  const [gastoFecha, setGastoFecha] = useState(getFechaCR());

  // Estados para Modales
  const [modalRetiro, setModalRetiro] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState('');
  const [modalReset, setModalReset] = useState(false);

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
    const { data: dataIngresos } = await supabase
      .from('citas')
      .select('*')
      .eq('estado', 'Completada')
      .order('fecha', { ascending: true });

    const { data: dataGastos } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: true });

    setIngresos(dataIngresos || []);
    setGastos(dataGastos || []);
    setLoading(false);
  };

  // ─── LÓGICA DE SEPARACIÓN (GASTOS VS RETIROS) ───
  const gastosOperativos = gastos.filter(g => g.descripcion !== 'RETIRO_FONDOS');
  const retirosPersonales = gastos.filter(g => g.descripcion === 'RETIRO_FONDOS');

  // Los totales SIEMPRE usan toda la data histórica para que el dinero cuadre
  const totalIngresos = ingresos.reduce((sum, item) => sum + (item.precio || 0), 0);
  const totalGastosOp = gastosOperativos.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalRetirado = retirosPersonales.reduce((sum, item) => sum + (item.monto || 0), 0);
  
  const utilidadNeta = totalIngresos - totalGastosOp;
  const balanceDisponible = utilidadNeta - totalRetirado;

  // ─── LÓGICA DE LIMPIEZA VISUAL (Últimos 7 días) ───
  const calcularFechaHace7Dias = () => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() - 7);
    return hoy.toISOString().split('T')[0];
  };
  const fechaLimite7Dias = calcularFechaHace7Dias();
  
  // Esta variable solo se usa para la vista de la lista, NO para los totales matemáticos
  const ingresosRecientes = ingresos.filter(ingreso => ingreso.fecha >= fechaLimite7Dias);

  // ─── FUNCIONES DE BASE DE DATOS ───
  const registrarGastoEstudio = async (e) => {
    e.preventDefault();
    if (!gastoDesc || !gastoMonto || !gastoFecha) return;
    const { error } = await supabase.from('gastos').insert([{ 
      descripcion: gastoDesc, monto: parseFloat(gastoMonto), fecha: gastoFecha 
    }]);
    if (!error) {
      setGastoDesc(''); setGastoMonto(''); cargarDatos();
    }
  };

  const procesarRetiro = async (e) => {
    e.preventDefault();
    if (!montoRetiro || isNaN(montoRetiro) || parseFloat(montoRetiro) <= 0) return;
    
    const { error } = await supabase.from('gastos').insert([{
      descripcion: 'RETIRO_FONDOS', monto: parseFloat(montoRetiro), fecha: getFechaCR()
    }]);
    
    if (!error) {
      setMontoRetiro(''); setModalRetiro(false); cargarDatos();
    }
  };

  const eliminarGastoIndividual = async (id) => {
    await supabase.from('gastos').delete().eq('id', id);
    cargarDatos();
  };

  const resetearGastosYRetiros = async () => {
    await supabase.from('gastos').delete().not('id', 'is', null);
    setModalReset(false);
    cargarDatos();
  };

  // ─── LÓGICA DEL GRÁFICO SEMANAL ───
  const generarDatosSemanaActual = () => {
    const dataSemana = [];
    const diasNombres = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    const hoy = new Date();
    const diaActual = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; 
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - diaActual);

    for (let i = 0; i < 7; i++) {
      const fechaObj = new Date(inicioSemana);
      fechaObj.setDate(fechaObj.getDate() + i);
      const fechaStr = fechaObj.toISOString().split('T')[0];

      const citasDelDia = ingresos.filter(c => c.fecha === fechaStr);
      const dineroDia = citasDelDia.reduce((sum, c) => sum + (c.precio || 0), 0);

      dataSemana.push({
        dia: diasNombres[i],
        fecha: fechaStr,
        ingresos: dineroDia,
        cortes: citasDelDia.length 
      });
    }
    return dataSemana;
  };

  const chartDataSemanal = generarDatosSemanaActual();

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--cream)', paddingBottom: '2rem' }}>
      
      {/* ─── NAVBAR INTEGRADO ─── */}
      <Nav />

      {/* ─── AUMENTAMOS EL paddingTop AQUÍ A 8rem PARA QUE NO PEGUE CON EL NAVBAR ─── */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', paddingTop: '8rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--gold)' }}>
          Resumen Financiero
        </h2>

        {/* Pestañas Elegantes */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', borderBottom: '1px solid #222' }}>
          {['balance', 'ingresos', 'gastos_estudio'].map((tab) => (
            <button 
              key={tab} onClick={() => setActiveTab(tab)}
              style={{ 
                background: 'transparent', border: 'none', padding: '1rem 0', fontSize: '0.85rem', fontWeight: 'bold', 
                textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                color: activeTab === tab ? 'var(--gold)' : '#666',
                borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                marginRight: '1rem'
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? ( <p style={{ color: 'var(--grey)' }}>Calculando datos...</p> ) : (
          <div>
            {/* ─── PESTAÑA BALANCE Y GRÁFICO ─── */}
            {activeTab === 'balance' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                  
                  <div style={cardStat}>
                    <p style={labelStat}>Total Generado</p>
                    <h3 style={numStat}>₡{totalIngresos.toLocaleString()}</h3>
                  </div>
                  
                  <div style={{...cardStat, borderLeftColor: '#ff4444'}}>
                    <p style={labelStat}>Gastos Estudio</p>
                    <h3 style={numStat}>₡{totalGastosOp.toLocaleString()}</h3>
                  </div>

                  <div style={{...cardStat, borderLeftColor: '#4A90E2'}}>
                    <p style={labelStat}>Dinero Retirado</p>
                    <h3 style={numStat}>₡{totalRetirado.toLocaleString()}</h3>
                  </div>
                  
                  <div style={{...cardStat, borderLeftColor: 'var(--gold)', background: '#111'}}>
                    <div>
                      <p style={{...labelStat, color: 'var(--gold)'}}>Caja Disponible</p>
                      <h3 style={{...numStat, color: balanceDisponible >= 0 ? '#fff' : '#ff4444', fontSize: '2.2rem'}}>
                        ₡{balanceDisponible.toLocaleString()}
                      </h3>
                    </div>
                    <button onClick={() => setModalRetiro(true)} style={btnRetirar}>
                      RETIRAR GANANCIA
                    </button>
                  </div>
                </div>

                {/* GRÁFICO DUAL DE LA SEMANA */}
                <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '2.5rem', borderRadius: '16px', height: '450px' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', margin: 0 }}>Rendimiento Semanal</h4>
                    <p style={{ color: '#666', fontSize: '0.85rem' }}>Ingresos generados vs Cantidad de cortes realizados.</p>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartDataSemanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="dia" stroke="#888" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#888" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(value) => `₡${value}`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} axisLine={false} tickLine={false} />
                      
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                        itemStyle={{ fontFamily: 'system-ui, sans-serif' }}
                        formatter={(value, name) => [name === 'ingresos' ? `₡${value.toLocaleString()}` : value, name === 'ingresos' ? 'Ingresos' : 'Cortes']}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      
                      <Bar yAxisId="left" dataKey="ingresos" name="Ingresos (₡)" fill="#00C851" radius={[6, 6, 0, 0]} barSize={40} />
                      <Line yAxisId="right" type="monotone" dataKey="cortes" name="Nº Cortes" stroke="var(--gold)" strokeWidth={4} dot={{ r: 6, fill: 'var(--gold)', stroke: '#000', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ─── PESTAÑA INGRESOS (HISTORIAL VISUAL LIMPIO) ─── */}
            {activeTab === 'ingresos' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <h3 style={{ fontSize: '1.5rem', color: '#00C851', marginBottom: '0.5rem' }}>Historial de Cortes (Últimos 7 días)</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem' }}>La lista se limpia sola cada semana, pero el dinero sigue sumado en tu balance general.</p>
                
                {ingresosRecientes.length === 0 ? <p style={{ color: '#666' }}>No hay cortes completados en los últimos 7 días.</p> : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Renderizamos solo el array filtrado de "ingresosRecientes" */}
                    {ingresosRecientes.slice().reverse().map(ingreso => (
                      <div key={ingreso.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', border: '1px solid #222', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00C851' }}>
                        <div>
                          <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ingreso.cliente_nombre} {ingreso.apellido}</p>
                          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.3rem' }}>{ingreso.fecha} | {ingreso.servicio}</p>
                        </div>
                        <h4 style={{ color: '#00C851', fontFamily: 'system-ui, sans-serif', fontSize: '1.4rem', margin: 0 }}>+ ₡{ingreso.precio.toLocaleString()}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── PESTAÑA GASTOS DEL ESTUDIO ─── */}
            {activeTab === 'gastos_estudio' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', animation: 'fadeIn 0.5s ease' }}>
                
                <div style={{ background: '#0a0a0a', padding: '2.5rem', borderRadius: '16px', border: '1px solid #222', height: 'fit-content' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>Registrar Insumo</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem' }}>Registra compras exclusivas para el estudio (productos, equipo, etc).</p>
                  
                  <form onSubmit={registrarGastoEstudio} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <input type="text" placeholder="Ej. Gelatina, Navajas..." value={gastoDesc} onChange={(e) => setGastoDesc(e.target.value)} required style={inputStyle} />
                    <input type="number" placeholder="Monto (₡)" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} required style={inputStyle} />
                    <input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} required style={{...inputStyle, colorScheme: 'dark'}} />
                    <button type="submit" style={btnSubmitRed}>Guardar Gasto</button>
                  </form>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--cream)', margin: 0 }}>Historial Financiero</h3>
                    <button onClick={() => setModalReset(true)} style={btnVaciar}>
                      Vaciar Historial
                    </button>
                  </div>

                  {gastos.length === 0 ? <p style={{ color: '#666' }}>Cero gastos registrados.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {gastos.slice().reverse().map(gasto => {
                        const esRetiro = gasto.descripcion === 'RETIRO_FONDOS';
                        return (
                          <div key={gasto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', padding: '1.5rem', borderRadius: '12px', borderLeft: esRetiro ? '4px solid #4A90E2' : '4px solid #ff4444', border: '1px solid #222' }}>
                            <div>
                              <p style={{ fontWeight: 'bold', color: esRetiro ? '#4A90E2' : '#fff' }}>
                                {esRetiro ? 'Retiro de Ganancias' : gasto.descripcion}
                              </p>
                              <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.3rem' }}>{gasto.fecha}</p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                              <h4 style={{ color: esRetiro ? '#4A90E2' : '#ff4444', fontFamily: 'system-ui, sans-serif', fontSize: '1.2rem', margin: 0 }}>
                                - ₡{gasto.monto.toLocaleString()}
                              </h4>
                              <button onClick={() => eliminarGastoIndividual(gasto.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }} title="Borrar registro">
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODAL: RETIRAR DINERO ─── */}
      {modalRetiro && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Retirar Dinero</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Este dinero saldrá de la "Caja Disponible" para tu uso personal. No afectará los gastos operativos.
            </p>
            <form onSubmit={procesarRetiro} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <input type="number" placeholder="¿Cuánto vas a sacar? (₡)" value={montoRetiro} onChange={(e) => setMontoRetiro(e.target.value)} required autoFocus style={{...inputStyle, fontSize: '1.2rem', textAlign: 'center', padding: '1rem'}} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setModalRetiro(false)} style={btnBack}>Cancelar</button>
                <button type="submit" style={btnConfirmGold}>Retirar Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESETEAR HISTORIAL COMPLETO ─── */}
      {modalReset && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, border: '1px solid rgba(255, 68, 68, 0.4)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '1rem' }}>Alerta de Borrado</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Estás a punto de borrar <strong style={{ color: '#ff4444' }}>todos los gastos operativos y retiros</strong>. Usa esto solo para reiniciar un nuevo mes.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setModalReset(false)} style={btnBack}>Cancelar</button>
              <button onClick={resetearGastosYRetiros} style={btnConfirmRed}>Sí, Limpiar Finanzas</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div> 
  );
}

// ─── ESTILOS REUTILIZABLES PREMIUM ───
const cardStat = { background: '#0a0a0a', border: '1px solid #222', padding: '2rem', borderRadius: '16px', borderLeft: '4px solid #00C851', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const labelStat = { color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.8rem' };
const numStat = { fontSize: '2.2rem', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '300', letterSpacing: '-0.02em', margin: 0 };

const inputStyle = { background: '#141414', border: '1px solid #333', color: 'white', padding: '1rem', borderRadius: '8px', outline: 'none', fontFamily: 'system-ui, sans-serif' };
const btnRetirar = { marginTop: '1.5rem', background: 'var(--gold)', color: '#000', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', fontSize: '0.8rem' };
const btnSubmitRed = { background: '#ff4444', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' };
const btnVaciar = { background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.6rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' };

// Modales
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#0a0a0a', border: '1px solid #333', padding: '3rem', borderRadius: '20px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' };
const btnBack = { flex: 1, background: 'transparent', border: '1px solid #444', color: '#888', padding: '1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' };
const btnConfirmGold = { flex: 1, background: 'var(--gold)', border: 'none', color: '#000', padding: '1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' };
const btnConfirmRed = { flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' };