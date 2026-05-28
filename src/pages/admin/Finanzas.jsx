import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState('balance');
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoFecha, setGastoFecha] = useState(new Date().toISOString().split('T')[0]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    if (!gastoDesc || !gastoMonto || !gastoFecha) return;

    const { error } = await supabase
      .from('gastos')
      .insert([{ descripcion: gastoDesc, monto: parseFloat(gastoMonto), fecha: gastoFecha }]);

    if (error) {
      alert('Error al registrar el gasto.');
    } else {
      setGastoDesc('');
      setGastoMonto('');
      cargarDatos();
    }
  };

  const totalIngresos = ingresos.reduce((sum, item) => sum + (item.precio || 0), 0);
  const totalGastos = gastos.reduce((sum, item) => sum + (item.monto || 0), 0);
  const balanceNeto = totalIngresos - totalGastos;

  const procesarDatosGrafico = () => {
    const dataPorFecha = {};
    ingresos.forEach(ingreso => {
      if (!dataPorFecha[ingreso.fecha]) dataPorFecha[ingreso.fecha] = { fecha: ingreso.fecha, ingresos: 0, gastos: 0 };
      dataPorFecha[ingreso.fecha].ingresos += (ingreso.precio || 0);
    });
    gastos.forEach(gasto => {
      if (!dataPorFecha[gasto.fecha]) dataPorFecha[gasto.fecha] = { fecha: gasto.fecha, ingresos: 0, gastos: 0 };
      dataPorFecha[gasto.fecha].gastos += (gasto.monto || 0);
    });
    return Object.values(dataPorFecha).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  const chartData = procesarDatosGrafico();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--cream)', padding: '2rem' }}>
      
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'var(--cream)', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Volver al inicio
          </button>
          <button onClick={handleLogout} style={{ background: '#ff4444', color: '#ffffff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--gold)' }}>
          Finanzas
        </h2>

        {/* Pestañas con scroll para móvil */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {['balance', 'ingresos', 'gastos'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                background: 'transparent',
                border: 'none',
                color: activeTab === tab ? 'var(--gold)' : 'var(--grey)',
                borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                padding: '0.8rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--grey)', textAlign: 'center' }}>Calculando finanzas...</p>
        ) : (
          <div>
            {activeTab === 'balance' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                  <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', borderLeft: '4px solid #00C851' }}>
                    <p style={{ color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total Ingresos</p>
                    <h3 style={{ fontSize: '2rem', color: '#fff' }}>₡{totalIngresos.toLocaleString()}</h3>
                  </div>
                  <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', borderLeft: '4px solid #ff4444' }}>
                    <p style={{ color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total Gastos</p>
                    <h3 style={{ fontSize: '2rem', color: '#fff' }}>₡{totalGastos.toLocaleString()}</h3>
                  </div>
                  <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', borderLeft: '4px solid var(--gold)' }}>
                    <p style={{ color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Balance Neto</p>
                    <h3 style={{ fontSize: '2rem', color: balanceNeto >= 0 ? 'var(--gold)' : '#ff4444' }}>₡{balanceNeto.toLocaleString()}</h3>
                  </div>
                </div>

                <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', height: '400px' }}>
                  <h4 style={{ color: 'var(--cream)', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>Flujo por Día</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="fecha" stroke="#888" fontSize={12} tickMargin={10} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid var(--gold)', borderRadius: '8px', color: '#fff' }} />
                      <Legend />
                      <Bar dataKey="ingresos" name="Ingresos (₡)" fill="#00C851" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gastos" name="Gastos (₡)" fill="#ff4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'ingresos' && (
              <div>
                <h3 style={{ fontSize: '1.5rem', color: '#00C851', marginBottom: '1.5rem' }}>Citas Cobradas</h3>
                {ingresos.length === 0 ? <p style={{ color: 'var(--grey)' }}>No hay ingresos registrados.</p> : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {ingresos.map(ingreso => (
                      <div key={ingreso.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '1.5rem', borderRadius: '8px', borderLeft: '2px solid #00C851' }}>
                        <div>
                          <p style={{ fontWeight: 'bold' }}>{ingreso.cliente_nombre} {ingreso.apellido}</p>
                          <p style={{ color: 'var(--grey)', fontSize: '0.85rem' }}>{ingreso.fecha} | {ingreso.servicio}</p>
                        </div>
                        <h4 style={{ color: '#00C851' }}>+ ₡{ingreso.precio}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gastos' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div style={{ background: '#111', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#ff4444', marginBottom: '1.5rem', fontFamily: "'Playfair Display', serif" }}>Registrar Gasto</h3>
                  <form onSubmit={registrarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <input type="text" placeholder="Descripción" value={gastoDesc} onChange={(e) => setGastoDesc(e.target.value)} required style={{ background: '#0d0d0d', border: '1px solid var(--border)', color: 'white', padding: '12px', borderRadius: '6px' }} />
                    <input type="number" placeholder="Monto (₡)" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} required style={{ background: '#0d0d0d', border: '1px solid var(--border)', color: 'white', padding: '12px', borderRadius: '6px' }} />
                    <input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} required style={{ background: '#0d0d0d', border: '1px solid var(--border)', color: 'white', padding: '12px', borderRadius: '6px', colorScheme: 'dark' }} />
                    <button type="submit" style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}>Guardar Gasto</button>
                  </form>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--cream)', marginBottom: '1.5rem' }}>Historial</h3>
                  {gastos.length === 0 ? <p style={{ color: 'var(--grey)' }}>No hay gastos registrados.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {gastos.map(gasto => (
                        <div key={gasto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '1rem 1.5rem', borderRadius: '8px', borderLeft: '2px solid #ff4444' }}>
                          <div><p style={{ fontWeight: 'bold' }}>{gasto.descripcion}</p><p style={{ color: 'var(--grey)', fontSize: '0.8rem' }}>{gasto.fecha}</p></div>
                          <h4 style={{ color: '#ff4444' }}>- ₡{gasto.monto}</h4>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}