import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Trash2, Download, Calendar as CalIcon } from 'lucide-react';
import Nav from '../../components/layout/Navbar'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState('balance');
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangoTiempo, setRangoTiempo] = useState('semana'); // 'semana' | 'mes'
  const navigate = useNavigate();

  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const getFechaCR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
  const [gastoFecha, setGastoFecha] = useState(getFechaCR());

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

  // ─── LÓGICA GENERAL ───
  const gastosOperativos = gastos.filter(g => g.descripcion !== 'RETIRO_FONDOS');
  const retirosPersonales = gastos.filter(g => g.descripcion === 'RETIRO_FONDOS');

  const totalIngresos = ingresos.reduce((sum, item) => sum + (item.precio || 0), 0);
  const totalGastosOp = gastosOperativos.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalRetirado = retirosPersonales.reduce((sum, item) => sum + (item.monto || 0), 0);
  
  const utilidadNeta = totalIngresos - totalGastosOp;
  const balanceDisponible = utilidadNeta - totalRetirado;

  // ─── FUNCIONES DE BD ───
  const registrarGastoEstudio = async (e) => {
    e.preventDefault();
    if (!gastoDesc || !gastoMonto || !gastoFecha) return;
    const { error } = await supabase.from('gastos').insert([{ 
      descripcion: gastoDesc, monto: parseFloat(gastoMonto), fecha: gastoFecha 
    }]);
    if (!error) { setGastoDesc(''); setGastoMonto(''); cargarDatos(); }
  };

  const procesarRetiro = async (e) => {
    e.preventDefault();
    if (!montoRetiro || isNaN(montoRetiro) || parseFloat(montoRetiro) <= 0) return;
    const { error } = await supabase.from('gastos').insert([{
      descripcion: 'RETIRO_FONDOS', monto: parseFloat(montoRetiro), fecha: getFechaCR()
    }]);
    if (!error) { setMontoRetiro(''); setModalRetiro(false); cargarDatos(); }
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

  // ─── LÓGICA DE FILTRADO Y GRÁFICOS ───
  const obtenerDatosFiltrados = () => {
    const hoy = new Date();
    const diasAtras = rangoTiempo === 'semana' ? 7 : 30;
    const fechaInicio = new Date();
    fechaInicio.setDate(hoy.getDate() - diasAtras);
    const limiteStr = fechaInicio.toISOString().split('T')[0];

    const ingresosFiltrados = ingresos.filter(i => i.fecha >= limiteStr);
    const gastosFiltrados = gastosOperativos.filter(g => g.fecha >= limiteStr);

    return { ingresosFiltrados, gastosFiltrados, limiteStr };
  };

  const generarDatosGrafico = () => {
    const { ingresosFiltrados } = obtenerDatosFiltrados();
    const data = [];
    
    if (rangoTiempo === 'semana') {
      const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const fechaStr = d.toISOString().split('T')[0];
        const ingresosDia = ingresosFiltrados.filter(inf => inf.fecha === fechaStr);
        data.push({
          etiqueta: nombresDias[d.getDay()],
          ingresos: ingresosDia.reduce((sum, c) => sum + (c.precio || 0), 0),
          cortes: ingresosDia.length
        });
      }
    } else {
      for (let i = 4; i >= 1; i--) {
        const fin = new Date();
        fin.setDate(fin.getDate() - ((i - 1) * 7));
        const inicio = new Date();
        inicio.setDate(inicio.getDate() - (i * 7));
        
        const ingresosSemana = ingresosFiltrados.filter(inf => inf.fecha > inicio.toISOString().split('T')[0] && inf.fecha <= fin.toISOString().split('T')[0]);
        data.push({
          etiqueta: `Sem ${5-i}`,
          ingresos: ingresosSemana.reduce((sum, c) => sum + (c.precio || 0), 0),
          cortes: ingresosSemana.length
        });
      }
    }
    return data;
  };

  const chartData = generarDatosGrafico();

  // ─── GENERADOR DE PDF (FORZADO A MENSUAL Y SINTAXIS VITE) ───
  const generarPDF = () => {
    try {
      // 1. Forzamos manualmente el filtro a 30 días para el PDF, sin importar el estado del gráfico
      const hoy = new Date();
      const fechaInicioMes = new Date();
      fechaInicioMes.setDate(hoy.getDate() - 30);
      const limiteMesStr = fechaInicioMes.toISOString().split('T')[0];

      const ingresosMensuales = ingresos.filter(i => i.fecha >= limiteMesStr);
      const gastosMensuales = gastosOperativos.filter(g => g.fecha >= limiteMesStr);

      const totalIng = ingresosMensuales.reduce((s, i) => s + (i.precio || 0), 0);
      const totalGas = gastosMensuales.reduce((s, g) => s + (g.monto || 0), 0);
      
      const doc = new jsPDF();
      
      // Encabezado
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Dorado
      doc.text("Aragon Barber Studio", 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Reporte Financiero - Ultimos 30 Dias", 14, 28);
      doc.text(`Generado el: ${getFechaCR()}`, 14, 34);

      // Resumen Ejecutivo
      doc.setFillColor(245, 245, 245);
      doc.rect(14, 40, 182, 25, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Ingresos Totales: ${totalIng.toLocaleString()} CRC`, 20, 50);
      doc.text(`Gastos Operativos: ${totalGas.toLocaleString()} CRC`, 20, 58);
      doc.setFont("helvetica", "bold");
      doc.text(`Beneficio Neto: ${(totalIng - totalGas).toLocaleString()} CRC`, 120, 54);

      // Tabla de Ingresos
      doc.setFont("helvetica", "normal");
      autoTable(doc, {
        startY: 75,
        head: [['Fecha', 'Cliente', 'Servicio', 'Monto']],
        body: ingresosMensuales.map(i => [i.fecha, `${i.cliente_nombre} ${i.apellido}`, i.servicio, `CRC ${i.precio}`]),
        headStyles: { fillColor: [40, 40, 40] },
        margin: { top: 10 }
      });

      // Tabla de Gastos
      const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 150;
      if (gastosMensuales.length > 0) {
        doc.text("Detalle de Gastos (Ultimos 30 dias)", 14, currentY - 5);
        autoTable(doc, {
          startY: currentY,
          head: [['Fecha', 'Descripcion', 'Monto']],
          body: gastosMensuales.map(g => [g.fecha, g.descripcion, `CRC ${g.monto}`]),
          headStyles: { fillColor: [200, 50, 50] }
        });
      }

      doc.save(`Aragon_Finanzas_Mensual_${getFechaCR()}.pdf`);
    } catch (error) {
      console.error("Error al generar el PDF: ", error);
      alert("Hubo un error al generar el PDF. Revisa la consola.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--cream)', paddingBottom: '2rem' }}>
      <Nav />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', paddingTop: '8rem' }}>
        
        {/* Cabecera Responsiva */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', margin: 0, color: 'var(--gold)' }}>
            Resumen Financiero
          </h2>
          <button onClick={generarPDF} style={btnDownload}>
            <Download size={18} /> Exportar Mes PDF
          </button>
        </div>

        {/* Pestañas Elegantes */}
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
          {['balance', 'ingresos', 'gastos_estudio'].map((tab) => (
            <button 
              key={tab} onClick={() => setActiveTab(tab)}
              style={{ 
                background: 'transparent', border: 'none', padding: '1rem 0', fontSize: '0.85rem', fontWeight: 'bold', 
                textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                color: activeTab === tab ? 'var(--gold)' : '#666',
                borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                marginRight: '1.5rem', flexShrink: 0
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
                    <p style={labelStat}>Total Histórico</p>
                    <h3 style={numStat}>₡{totalIngresos.toLocaleString()}</h3>
                  </div>
                  
                  <div style={{...cardStat, borderLeftColor: '#ff4444'}}>
                    <p style={labelStat}>Gastos Estudio</p>
                    <h3 style={numStat}>₡{totalGastosOp.toLocaleString()}</h3>
                  </div>
                  
                  <div style={{...cardStat, borderLeftColor: 'var(--gold)', background: '#111'}}>
                    <div>
                      <p style={{...labelStat, color: 'var(--gold)'}}>Caja Disponible</p>
                      <h3 style={{...numStat, color: balanceDisponible >= 0 ? '#fff' : '#ff4444', fontSize: 'clamp(1.8rem, 4vw, 2.2rem)'}}>
                        ₡{balanceDisponible.toLocaleString()}
                      </h3>
                    </div>
                    <button onClick={() => setModalRetiro(true)} style={btnRetirar}>
                      RETIRAR GANANCIA
                    </button>
                  </div>
                </div>

                {/* CONTROLES DEL GRÁFICO */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', margin: 0 }}>Rendimiento</h4>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>Análisis de cortes e ingresos.</p>
                  </div>
                  <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '4px' }}>
                    <button onClick={() => setRangoTiempo('semana')} style={{ ...btnToggle, background: rangoTiempo === 'semana' ? '#333' : 'transparent', color: rangoTiempo === 'semana' ? 'var(--gold)' : '#888' }}>7 Días</button>
                    <button onClick={() => setRangoTiempo('mes')} style={{ ...btnToggle, background: rangoTiempo === 'mes' ? '#333' : 'transparent', color: rangoTiempo === 'mes' ? 'var(--gold)' : '#888' }}>30 Días</button>
                  </div>
                </div>

                {/* GRÁFICO OPTIMIZADO PARA MÓVIL */}
                <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '1.5rem 0.5rem', borderRadius: '16px', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      {/* Ejes con fuentes pequeñas y tickMargin ajustado para móvil */}
                      <XAxis dataKey="etiqueta" stroke="#888" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#888" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => `₡${value/1000}k`} />
                      {/* Se oculta el eje derecho en pantallas muy chicas automáticamente por ResponsiveContainer si no cabe, pero le damos ancho fijo */}
                      <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={10} axisLine={false} tickLine={false} width={30} />
                      
                      <Tooltip 
                        contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} 
                        itemStyle={{ fontFamily: 'system-ui, sans-serif' }}
                        formatter={(value, name) => [name === 'ingresos' ? `₡${value.toLocaleString()}` : value, name === 'ingresos' ? 'Ingresos' : 'Cortes']}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />
                      
                      <Bar yAxisId="left" dataKey="ingresos" name="Ingresos (₡)" fill="#00C851" radius={[4, 4, 0, 0]} barSize={rangoTiempo === 'semana' ? 25 : 40} />
                      <Line yAxisId="right" type="monotone" dataKey="cortes" name="Nº Cortes" stroke="var(--gold)" strokeWidth={3} dot={{ r: 4, fill: 'var(--gold)', stroke: '#000', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ─── PESTAÑA INGRESOS ─── */}
            {activeTab === 'ingresos' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <CalIcon color="var(--gold)" />
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--cream)', margin: 0 }}>Historial Completo</h3>
                </div>
                
                {ingresos.length === 0 ? <p style={{ color: '#666' }}>No hay registros.</p> : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {ingresos.slice().reverse().map(ingreso => (
                      <div key={ingreso.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', border: '1px solid #222', padding: '1.2rem', borderRadius: '12px', borderLeft: '4px solid #00C851' }}>
                        <div>
                          <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>{ingreso.cliente_nombre} {ingreso.apellido}</p>
                          <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.3rem' }}>{ingreso.fecha} | {ingreso.servicio}</p>
                        </div>
                        <h4 style={{ color: '#00C851', fontFamily: 'system-ui, sans-serif', fontSize: '1.2rem', margin: 0 }}>+ ₡{ingreso.precio.toLocaleString()}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── PESTAÑA GASTOS DEL ESTUDIO ─── */}
            {activeTab === 'gastos_estudio' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
                
                <div style={{ background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222', height: 'fit-content' }}>
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>Registrar Insumo</h3>
                  <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Gastos exclusivos del estudio.</p>
                  
                  <form onSubmit={registrarGastoEstudio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="text" placeholder="Ej. Gelatina, Navajas..." value={gastoDesc} onChange={(e) => setGastoDesc(e.target.value)} required style={inputStyle} />
                    <input type="number" placeholder="Monto (₡)" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} required style={inputStyle} />
                    <input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} required style={{...inputStyle, colorScheme: 'dark'}} />
                    <button type="submit" style={btnSubmitRed}>Guardar Gasto</button>
                  </form>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>Historial</h3>
                    <button onClick={() => setModalReset(true)} style={btnVaciar}>Vaciar</button>
                  </div>

                  {gastos.length === 0 ? <p style={{ color: '#666' }}>Cero gastos registrados.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {gastos.slice().reverse().map(gasto => {
                        const esRetiro = gasto.descripcion === 'RETIRO_FONDOS';
                        return (
                          <div key={gasto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', padding: '1rem', borderRadius: '12px', borderLeft: esRetiro ? '4px solid #4A90E2' : '4px solid #ff4444', border: '1px solid #222' }}>
                            <div>
                              <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: esRetiro ? '#4A90E2' : '#fff' }}>
                                {esRetiro ? 'Retiro' : gasto.descripcion}
                              </p>
                              <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.2rem' }}>{gasto.fecha}</p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <h4 style={{ color: esRetiro ? '#4A90E2' : '#ff4444', fontFamily: 'system-ui, sans-serif', fontSize: '1rem', margin: 0 }}>
                                - ₡{gasto.monto.toLocaleString()}
                              </h4>
                              <button onClick={() => eliminarGastoIndividual(gasto.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: 0 }} title="Borrar registro">
                                <Trash2 size={18} />
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

      {/* ─── MODALES (Se mantienen igual pero con estilos responsive) ─── */}
      {modalRetiro && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Retirar Dinero</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Este dinero sale de la "Caja Disponible". No afecta los cálculos operativos.
            </p>
            <form onSubmit={procesarRetiro} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input type="number" placeholder="Monto (₡)" value={montoRetiro} onChange={(e) => setMontoRetiro(e.target.value)} required autoFocus style={{...inputStyle, fontSize: '1.2rem', textAlign: 'center'}} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setModalRetiro(false)} style={btnBack}>Cancelar</button>
                <button type="submit" style={btnConfirmGold}>Retirar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalReset && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, border: '1px solid rgba(255, 68, 68, 0.4)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>Alerta de Borrado</h3>
            <p style={{ color: 'var(--grey)', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Estás a punto de borrar <strong style={{ color: '#ff4444' }}>todos los gastos operativos y retiros</strong>. Usa esto solo para iniciar un nuevo ciclo.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setModalReset(false)} style={btnBack}>Cancelar</button>
              <button onClick={resetearGastosYRetiros} style={btnConfirmRed}>Sí, Limpiar</button>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
}

// ─── ESTILOS ACTUALIZADOS ───
const cardStat = { background: '#0a0a0a', border: '1px solid #222', padding: '1.5rem', borderRadius: '16px', borderLeft: '4px solid #00C851', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const labelStat = { color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.5rem' };
const numStat = { fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '300', letterSpacing: '-0.02em', margin: 0 };

const inputStyle = { background: '#141414', border: '1px solid #333', color: 'white', padding: '0.8rem', borderRadius: '8px', outline: 'none', fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem' };
const btnRetirar = { marginTop: '1.2rem', background: 'var(--gold)', color: '#000', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', fontSize: '0.75rem' };
const btnSubmitRed = { background: '#ff4444', color: '#fff', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' };
const btnVaciar = { background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.4rem 0.8rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' };
const btnDownload = { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: '#000', border: 'none', padding: '0.6rem 1rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', transition: 'opacity 0.2s' };
const btnToggle = { padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', transition: 'all 0.2s' };

// Modales
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const modalStyle = { background: '#0a0a0a', border: '1px solid #333', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' };
const btnBack = { flex: 1, background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' };
const btnConfirmGold = { flex: 1, background: 'var(--gold)', border: 'none', color: '#000', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' };
const btnConfirmRed = { flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '0.8rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' };