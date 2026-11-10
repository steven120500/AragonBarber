import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Trash2, Download, PieChart, TrendingUp, Receipt, Wallet, ArrowDownToLine, Plus, Scissors, AlertTriangle, ShoppingBag, Archive, Check, Info } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminModal from '../../components/admin/AdminModal';
import { formatearPrecio, formatearFechaCorta, hoyCR, sumarDias, diaSemana } from '../../utils/formato';
import { esTablaFaltante } from '../../utils/supabaseErrores';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Descripciones especiales guardadas en la tabla "gastos"
const RETIRO = 'RETIRO_FONDOS';
const CIERRE = 'CIERRE_CICLO'; // Resume los gastos y retiros archivados al "vaciar" (mantiene la caja intacta)

const sumar = (lista, campo) => lista.reduce((t, item) => t + (Number(item[campo]) || 0), 0);
const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState('balance');
  const [ingresos, setIngresos] = useState([]);        // citas cobradas
  const [ventas, setVentas] = useState([]);            // ventas de productos
  const [ventasActivas, setVentasActivas] = useState(true); // false si falta crear la tabla
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangoTiempo, setRangoTiempo] = useState('semana'); // 'semana' | 'mes'
  const navigate = useNavigate();

  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const getFechaCR = hoyCR;
  const [gastoFecha, setGastoFecha] = useState(getFechaCR());

  const [modalRetiro, setModalRetiro] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState('');
  const [modalReset, setModalReset] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const [ventaAEliminar, setVentaAEliminar] = useState(null);
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', tipo: 'error' });

  const avisar = (mensaje, tipo = 'error', titulo) =>
    setModalAlerta({ isOpen: true, mensaje, tipo, titulo: titulo || (tipo === 'error' ? 'Algo salió mal' : '¡Listo!') });

  const cargarDatos = async () => {
    setLoading(true);
    const [resCitas, resGastos, resVentas] = await Promise.all([
      supabase.from('citas').select('*').eq('estado', 'Completada').order('fecha', { ascending: true }),
      supabase.from('gastos').select('*').order('fecha', { ascending: true }),
      supabase.from('ventas_productos').select('*').order('fecha', { ascending: true }),
    ]);

    if (resCitas.error || resGastos.error) {
      avisar('No se pudieron cargar los datos: ' + (resCitas.error || resGastos.error).message);
    }
    setIngresos(resCitas.data || []);
    setGastos(resGastos.data || []);

    // Si la tabla de ventas aún no existe, Finanzas sigue funcionando sin productos
    if (resVentas.error) {
      setVentas([]);
      setVentasActivas(!esTablaFaltante(resVentas.error));
    } else {
      setVentas(resVentas.data || []);
      setVentasActivas(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/admin');
      else cargarDatos();
    };
    checkUser();
    // Se carga una sola vez al entrar; cargarDatos solo usa setters estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);


  // ─── LÓGICA GENERAL ───
  const gastosOperativos = gastos.filter(g => g.descripcion !== RETIRO && g.descripcion !== CIERRE);
  const retirosPersonales = gastos.filter(g => g.descripcion === RETIRO);
  const cierres = gastos.filter(g => g.descripcion === CIERRE);

  const totalServicios = sumar(ingresos, 'precio');
  const totalProductos = sumar(ventas, 'total');
  const totalIngresos = totalServicios + totalProductos;
  const totalGastosOp = sumar(gastosOperativos, 'monto');
  const totalRetirado = sumar(retirosPersonales, 'monto');
  const totalCierres = sumar(cierres, 'monto');

  const utilidadNeta = totalIngresos - totalGastosOp;
  const balanceDisponible = utilidadNeta - totalRetirado - totalCierres;

  // Todos los ingresos (citas + productos) en un solo formato, de más antiguo a más reciente
  const movimientos = [
    ...ingresos.map(c => ({
      tipo: 'servicio', key: `c-${c.id}`, fecha: c.fecha, monto: Number(c.precio) || 0,
      titulo: `${c.cliente_nombre || ''} ${c.apellido || ''}`.trim() || 'Cliente', detalle: c.servicio,
    })),
    ...ventas.map(v => ({
      tipo: 'producto', key: `v-${v.id}`, fecha: v.fecha, monto: Number(v.total) || 0, venta: v,
      titulo: v.producto_nombre, detalle: `${v.cantidad} × ${formatearPrecio(v.precio_unitario)}`,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  // ─── FUNCIONES DE BD ───
  const registrarGastoEstudio = async (e) => {
    e.preventDefault();
    const monto = parseFloat(gastoMonto);
    if (!gastoDesc.trim() || !gastoFecha || Number.isNaN(monto) || monto <= 0) {
      avisar('Escribe una descripción y un monto mayor a 0.');
      return;
    }
    const { error } = await supabase.from('gastos').insert([{
      descripcion: gastoDesc.trim(), monto, fecha: gastoFecha
    }]);
    if (error) { avisar('No se pudo guardar el gasto: ' + error.message); return; }
    setGastoDesc(''); setGastoMonto(''); cargarDatos();
  };

  const procesarRetiro = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoRetiro);
    if (!montoRetiro || Number.isNaN(monto) || monto <= 0) {
      avisar('Ingresa un monto mayor a 0.');
      return;
    }
    if (monto > balanceDisponible) {
      avisar(`No puedes retirar más de lo que hay en caja (${formatearPrecio(Math.max(0, balanceDisponible))}).`);
      return;
    }
    const { error } = await supabase.from('gastos').insert([{
      descripcion: RETIRO, monto, fecha: getFechaCR()
    }]);
    if (error) { avisar('No se pudo registrar el retiro: ' + error.message); return; }
    setMontoRetiro(''); setModalRetiro(false); cargarDatos();
  };

  const eliminarGastoIndividual = async () => {
    if (!gastoAEliminar) return;
    const { error } = await supabase.from('gastos').delete().eq('id', gastoAEliminar.id);
    setGastoAEliminar(null);
    if (error) { avisar('No se pudo borrar el registro: ' + error.message); return; }
    cargarDatos();
  };

  const eliminarVenta = async () => {
    if (!ventaAEliminar) return;
    const { error } = await supabase.from('ventas_productos').delete().eq('id', ventaAEliminar.id);
    setVentaAEliminar(null);
    if (error) { avisar('No se pudo borrar la venta: ' + error.message); return; }
    cargarDatos();
  };

  // "Vaciar" archiva el historial de gastos y retiros SIN alterar la caja disponible:
  // primero guarda un único registro de cierre con la suma de todo lo archivado y luego borra el resto.
  const resetearGastosYRetiros = async () => {
    const montoArchivado = totalGastosOp + totalRetirado + totalCierres;
    setProcesando(true);

    if (montoArchivado <= 0) {
      const { error } = await supabase.from('gastos').delete().not('id', 'is', null);
      setProcesando(false);
      setModalReset(false);
      if (error) avisar('No se pudo vaciar el historial: ' + error.message);
      cargarDatos();
      return;
    }

    const { data: cierre, error: errorCierre } = await supabase
      .from('gastos')
      .insert([{ descripcion: CIERRE, monto: montoArchivado, fecha: getFechaCR() }])
      .select()
      .single();

    if (errorCierre || !cierre) {
      setProcesando(false);
      setModalReset(false);
      avisar('No se pudo vaciar el historial: ' + (errorCierre?.message || 'sin respuesta del servidor'));
      return;
    }

    const { error: errorBorrado } = await supabase.from('gastos').delete().neq('id', cierre.id);
    if (errorBorrado) {
      // Deshacer el cierre para no descontar dos veces
      await supabase.from('gastos').delete().eq('id', cierre.id);
      avisar('No se pudo vaciar el historial: ' + errorBorrado.message);
    }
    setProcesando(false);
    setModalReset(false);
    cargarDatos();
  };

  // ─── LÓGICA DE FILTRADO Y GRÁFICOS (fechas en hora de Costa Rica) ───
  const obtenerDatosFiltrados = () => {
    const hoy = hoyCR();
    const limiteStr = sumarDias(hoy, rangoTiempo === 'semana' ? -6 : -29); // incluye hoy

    const ingresosFiltrados = ingresos.filter(i => i.fecha >= limiteStr && i.fecha <= hoy);
    const ventasFiltradas = ventas.filter(v => v.fecha >= limiteStr && v.fecha <= hoy);
    const gastosFiltrados = gastosOperativos.filter(g => g.fecha >= limiteStr && g.fecha <= hoy);

    return { ingresosFiltrados, ventasFiltradas, gastosFiltrados, limiteStr, hoy };
  };

  const generarDatosGrafico = () => {
    const { ingresosFiltrados, ventasFiltradas, limiteStr } = obtenerDatosFiltrados();
    const tramo = (desde, hasta) => {
      const citasTramo = ingresosFiltrados.filter(c => c.fecha >= desde && c.fecha <= hasta);
      const ventasTramo = ventasFiltradas.filter(v => v.fecha >= desde && v.fecha <= hasta);
      return {
        servicios: sumar(citasTramo, 'precio'),
        productos: sumar(ventasTramo, 'total'),
        cortes: citasTramo.length,
      };
    };

    const data = [];
    if (rangoTiempo === 'semana') {
      for (let i = 0; i < 7; i++) {
        const fecha = sumarDias(limiteStr, i);
        data.push({ etiqueta: NOMBRES_DIA[diaSemana(fecha)], ...tramo(fecha, fecha) });
      }
    } else {
      // 30 días en 5 tramos de 6 días
      for (let i = 0; i < 5; i++) {
        const desde = sumarDias(limiteStr, i * 6);
        const hasta = sumarDias(desde, 5);
        const etiqueta = `${Number(desde.slice(8))}–${Number(hasta.slice(8))} ${MESES_CORTOS[Number(hasta.slice(5, 7)) - 1]}`;
        data.push({ etiqueta, ...tramo(desde, hasta) });
      }
    }
    return data;
  };

  const chartData = generarDatosGrafico();

  // Cálculo de KPIs rápidos para el gráfico
  const { ingresosFiltrados: ingresosPeriodo, ventasFiltradas: ventasPeriodo } = obtenerDatosFiltrados();
  const totalIngresosPeriodo = sumar(ingresosPeriodo, 'precio') + sumar(ventasPeriodo, 'total');
  const totalCortesPeriodo = ingresosPeriodo.length;
  const unidadesPeriodo = sumar(ventasPeriodo, 'cantidad');

  // ─── GENERADOR DE PDF (ÚLTIMOS 30 DÍAS) ───
  const generarPDF = () => {
    try {
      const hoy = hoyCR();
      const limiteMesStr = sumarDias(hoy, -29);

      const ingresosMensuales = ingresos.filter(i => i.fecha >= limiteMesStr && i.fecha <= hoy);
      const ventasMensuales = ventas.filter(v => v.fecha >= limiteMesStr && v.fecha <= hoy);
      const gastosMensuales = gastosOperativos.filter(g => g.fecha >= limiteMesStr && g.fecha <= hoy);

      const totalServ = sumar(ingresosMensuales, 'precio');
      const totalProd = sumar(ventasMensuales, 'total');
      const totalIng = totalServ + totalProd;
      const totalGas = sumar(gastosMensuales, 'monto');
      const crc = (n) => `CRC ${(Number(n) || 0).toLocaleString('es-CR')}`;

      const doc = new jsPDF();

      // Encabezado
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Dorado
      doc.text("Aragon Barber Studio", 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Reporte Financiero - Ultimos 30 Dias", 14, 28);
      doc.text(`Del ${limiteMesStr} al ${hoy}`, 14, 34);

      // Resumen Ejecutivo
      doc.setFillColor(245, 245, 245);
      doc.rect(14, 40, 182, 32, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Servicios: ${crc(totalServ)}`, 20, 49);
      doc.text(`Productos: ${crc(totalProd)}`, 20, 57);
      doc.text(`Gastos Operativos: ${crc(totalGas)}`, 20, 65);
      doc.setFont("helvetica", "bold");
      doc.text(`Ingresos Totales: ${crc(totalIng)}`, 118, 52);
      doc.text(`Beneficio Neto: ${crc(totalIng - totalGas)}`, 118, 62);

      // Tabla de Servicios
      doc.setFont("helvetica", "normal");
      autoTable(doc, {
        startY: 80,
        head: [['Fecha', 'Cliente', 'Servicio', 'Monto']],
        body: ingresosMensuales.map(i => [i.fecha, `${i.cliente_nombre || ''} ${i.apellido || ''}`.trim(), i.servicio, crc(i.precio)]),
        headStyles: { fillColor: [40, 40, 40] },
        margin: { top: 10 }
      });

      // Tabla de Productos
      let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 150;
      if (ventasMensuales.length > 0) {
        doc.text("Ventas de Productos (Ultimos 30 dias)", 14, currentY - 5);
        autoTable(doc, {
          startY: currentY,
          head: [['Fecha', 'Producto', 'Cant.', 'Precio', 'Total']],
          body: ventasMensuales.map(v => [v.fecha, v.producto_nombre, v.cantidad, crc(v.precio_unitario), crc(v.total)]),
          headStyles: { fillColor: [180, 130, 40] }
        });
        currentY = doc.lastAutoTable.finalY + 15;
      }

      // Tabla de Gastos
      if (gastosMensuales.length > 0) {
        doc.text("Detalle de Gastos (Ultimos 30 dias)", 14, currentY - 5);
        autoTable(doc, {
          startY: currentY,
          head: [['Fecha', 'Descripcion', 'Monto']],
          body: gastosMensuales.map(g => [g.fecha, g.descripcion, crc(g.monto)]),
          headStyles: { fillColor: [200, 50, 50] }
        });
      }

      doc.save(`Aragon_Finanzas_Mensual_${hoy}.pdf`);
    } catch (error) {
      console.error("Error al generar el PDF: ", error);
      avisar('Hubo un error al generar el PDF. Intenta de nuevo.');
    }
  };

  const tabs = [
    { id: 'balance', label: 'Balance', Icon: PieChart },
    { id: 'ingresos', label: 'Ingresos', Icon: TrendingUp },
    { id: 'gastos_estudio', label: 'Gastos', Icon: Receipt },
  ];

  // Agrupa una lista (ya ordenada de más reciente a más antigua) por mes
  const agruparPorMes = (lista) => {
    const grupos = [];
    lista.forEach((item) => {
      const [y, m] = String(item.fecha).split('-').map(Number);
      const etiqueta = new Date(y, (m || 1) - 1, 1).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.etiqueta === etiqueta) ultimo.items.push(item);
      else grupos.push({ etiqueta, items: [item] });
    });
    return grupos;
  };

  return (
    <AdminLayout
      title="Finanzas"
      subtitle="Ingresos de citas y ventas de productos, gastos del estudio y tu caja disponible."
      actions={
        <button onClick={generarPDF} className="adm-btn adm-btn--ghost">
          <Download size={16} /> Exportar mes en PDF
        </button>
      }
    >
      <div className="adm-seg adm-anim" style={{ marginBottom: '1.8rem' }} role="tablist">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="adm-stats">
          {[0, 1, 2, 3].map((i) => <div key={i} className="adm-skel" style={{ height: '150px' }} />)}
        </div>
      ) : (
        <div key={activeTab} className="adm-anim">
          {/* ─── PESTAÑA BALANCE Y GRÁFICO ─── */}
          {activeTab === 'balance' && (
            <>
              {!ventasActivas && (
                <div className="fz-notice">
                  <Info size={18} />
                  <span>Las ventas de productos aún no están activadas. Ejecuta <b>supabase/ventas_productos.sql</b> en Supabase (SQL Editor) para que se sumen aquí.</span>
                </div>
              )}
              <div className="adm-stats">
                <div className="adm-stat adm-stat--hero">
                  <div className="adm-stat-icon"><Wallet size={18} /></div>
                  <span className="adm-stat-label">Caja disponible</span>
                  <span className={`adm-stat-value ${balanceDisponible < 0 ? 'tone-red' : ''}`}>{formatearPrecio(balanceDisponible)}</span>
                  <button onClick={() => setModalRetiro(true)} className="adm-btn adm-btn--primary adm-btn--sm" style={{ marginTop: '0.8rem', alignSelf: 'flex-start' }}>
                    <ArrowDownToLine size={14} /> Retirar ganancia
                  </button>
                </div>

                <div className="adm-stat adm-stat--green">
                  <div className="adm-stat-icon bg-green"><TrendingUp size={18} /></div>
                  <span className="adm-stat-label">Ingresos históricos</span>
                  <span className="adm-stat-value">{formatearPrecio(totalIngresos)}</span>
                  <span className="fz-split">
                    <span><Scissors size={12} /> {formatearPrecio(totalServicios)}</span>
                    <span><ShoppingBag size={12} /> {formatearPrecio(totalProductos)}</span>
                  </span>
                </div>

                <div className="adm-stat adm-stat--red">
                  <div className="adm-stat-icon bg-red"><Receipt size={18} /></div>
                  <span className="adm-stat-label">Gastos del estudio</span>
                  <span className="adm-stat-value">{formatearPrecio(totalGastosOp)}</span>
                </div>

                <div className="adm-stat adm-stat--blue">
                  <div className="adm-stat-icon bg-blue"><ArrowDownToLine size={18} /></div>
                  <span className="adm-stat-label">Retirado</span>
                  <span className="adm-stat-value">{formatearPrecio(totalRetirado)}</span>
                </div>
              </div>

              {/* RENDIMIENTO DEL PERIODO */}
              <div className="adm-card adm-section-gap">
                <div className="adm-card-head">
                  <div>
                    <h2 className="adm-card-title">Rendimiento {rangoTiempo === 'semana' ? 'semanal' : 'mensual'}</h2>
                    <p className="adm-card-sub">Ingresos por servicios y productos, y cantidad de servicios cobrados.</p>
                  </div>
                  <div className="adm-seg">
                    <button className={rangoTiempo === 'semana' ? 'active' : ''} onClick={() => setRangoTiempo('semana')}>7 días</button>
                    <button className={rangoTiempo === 'mes' ? 'active' : ''} onClick={() => setRangoTiempo('mes')}>30 días</button>
                  </div>
                </div>

                <div className="fz-kpis">
                  <div>
                    <span className="adm-stat-label">Ingresos del periodo</span>
                    <strong className="tone-green">{formatearPrecio(totalIngresosPeriodo)}</strong>
                  </div>
                  <div>
                    <span className="adm-stat-label">Servicios</span>
                    <strong>{totalCortesPeriodo}</strong>
                  </div>
                  <div>
                    <span className="adm-stat-label">Productos vendidos</span>
                    <strong className="tone-amber">{unidadesPeriodo}</strong>
                  </div>
                </div>

                <div className="fz-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(245,245,220,0.06)" vertical={false} />
                      <XAxis dataKey="etiqueta" stroke="#8a8a80" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#8a8a80" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(value) => `₡${value / 1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#8a8a80" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(245,245,220,0.04)' }}
                        contentStyle={{ background: '#141414', border: '1px solid rgba(245,245,220,0.16)', borderRadius: '12px', color: '#f5f5dc', padding: '10px 14px' }}
                        labelStyle={{ color: '#f5f5dc', fontWeight: 700, marginBottom: '4px' }}
                        formatter={(value, name) => [
                          name === 'Nº servicios' ? `${value} servicios` : formatearPrecio(value),
                          name
                        ]}
                      />
                      <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '0.8rem', color: '#8a8a80' }} iconType="circle" iconSize={8} />
                      <Bar yAxisId="left" dataKey="servicios" name="Servicios" stackId="ing" fill="#3ddc84" barSize={rangoTiempo === 'semana' ? 28 : 44} fillOpacity={0.85} />
                      <Bar yAxisId="left" dataKey="productos" name="Productos" stackId="ing" fill="#ffb547" radius={[8, 8, 0, 0]} barSize={rangoTiempo === 'semana' ? 28 : 44} fillOpacity={0.9} />
                      <Line yAxisId="right" type="monotone" dataKey="cortes" name="Nº servicios" stroke="#f5f5dc" strokeWidth={2} dot={{ r: 4, fill: '#0d0d0d', stroke: '#f5f5dc', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f5f5dc' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ─── PESTAÑA INGRESOS ─── */}
          {activeTab === 'ingresos' && (
            movimientos.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon"><TrendingUp size={22} /></div>
                <strong>Sin ingresos todavía</strong>
                Cuando cobres una cita o registres la venta de un producto, aparecerá aquí.
              </div>
            ) : (
              <div>
                {agruparPorMes(movimientos.slice().reverse()).map((grupo) => (
                  <div key={grupo.etiqueta}>
                    <div className="adm-group-label">
                      {grupo.etiqueta}
                      <span className="adm-chip bg-green">{formatearPrecio(sumar(grupo.items, 'monto'))}</span>
                    </div>
                    <div className="adm-list">
                      {grupo.items.map(mov => (
                        <div key={mov.key} className="adm-row">
                          <div className={`adm-row-icon ${mov.tipo === 'producto' ? 'bg-amber' : 'bg-green'}`}>
                            {mov.tipo === 'producto' ? <ShoppingBag size={17} /> : <Scissors size={17} />}
                          </div>
                          <div className="adm-row-main">
                            <div className="adm-row-title" style={mov.tipo === 'servicio' ? { textTransform: 'capitalize' } : undefined}>{mov.titulo}</div>
                            <div className="adm-row-meta">{formatearFechaCorta(mov.fecha)} · {mov.tipo === 'producto' ? `Venta · ${mov.detalle}` : mov.detalle}</div>
                          </div>
                          <div className="adm-row-amount tone-green">+ {formatearPrecio(mov.monto)}</div>
                          {mov.tipo === 'producto' && (
                            <button onClick={() => setVentaAEliminar(mov.venta)} className="adm-btn adm-btn--subtle adm-btn--icon" title="Borrar venta" aria-label="Borrar venta" style={{ width: '36px', minHeight: '36px' }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── PESTAÑA GASTOS DEL ESTUDIO ─── */}
          {activeTab === 'gastos_estudio' && (
            <div className="adm-grid-2">
              <div className="adm-card">
                <div className="adm-card-head" style={{ marginBottom: '1.1rem' }}>
                  <div>
                    <h2 className="adm-card-title">Registrar gasto</h2>
                    <p className="adm-card-sub">Insumos y gastos exclusivos del estudio.</p>
                  </div>
                </div>
                <form onSubmit={registrarGastoEstudio} className="adm-form">
                  <label className="adm-field">
                    <span className="adm-label">Descripción</span>
                    <input type="text" className="adm-input" placeholder="Ej. Gelatina, navajas…" value={gastoDesc} onChange={(e) => setGastoDesc(e.target.value)} required />
                  </label>
                  <div className="adm-field-row">
                    <label className="adm-field">
                      <span className="adm-label">Monto (₡)</span>
                      <input type="number" className="adm-input" placeholder="0" inputMode="numeric" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} required />
                    </label>
                    <label className="adm-field">
                      <span className="adm-label">Fecha</span>
                      <input type="date" className="adm-input" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} required />
                    </label>
                  </div>
                  <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" style={{ minHeight: '50px', marginTop: '0.3rem' }}>
                    <Plus size={18} /> Guardar gasto
                  </button>
                </form>
              </div>

              <div>
                <div className="adm-card-head">
                  <h2 className="adm-card-title">Historial <span className="adm-count">{gastos.length}</span></h2>
                  {gastos.length > 0 && (
                    <button onClick={() => setModalReset(true)} className="adm-btn adm-btn--subtle adm-btn--sm">Vaciar todo</button>
                  )}
                </div>

                {gastos.length === 0 ? (
                  <div className="adm-empty">
                    <div className="adm-empty-icon"><Receipt size={22} /></div>
                    <strong>Sin gastos registrados</strong>
                    Los gastos y retiros aparecerán aquí.
                  </div>
                ) : (
                  <div className="adm-list">
                    {gastos.slice().reverse().map(gasto => {
                      const esRetiro = gasto.descripcion === RETIRO;
                      const esCierre = gasto.descripcion === CIERRE;
                      const icono = esCierre ? <Archive size={17} /> : esRetiro ? <ArrowDownToLine size={17} /> : <Receipt size={17} />;
                      return (
                        <div key={gasto.id} className="adm-row">
                          <div className={`adm-row-icon ${esCierre ? '' : esRetiro ? 'bg-blue' : 'bg-red'}`}>{icono}</div>
                          <div className="adm-row-main">
                            <div className="adm-row-title">{esCierre ? 'Cierre de ciclo' : esRetiro ? 'Retiro de ganancia' : gasto.descripcion}</div>
                            <div className="adm-row-meta">{formatearFechaCorta(gasto.fecha)}{esCierre ? ' · gastos y retiros archivados' : ''}</div>
                          </div>
                          <div className={`adm-row-amount ${esCierre ? '' : esRetiro ? 'tone-blue' : 'tone-red'}`} style={esCierre ? { color: 'var(--adm-muted)' } : undefined}>− {formatearPrecio(gasto.monto)}</div>
                          {!esCierre && (
                            <button onClick={() => setGastoAEliminar(gasto)} className="adm-btn adm-btn--subtle adm-btn--icon" title="Borrar registro" aria-label="Borrar registro" style={{ width: '36px', minHeight: '36px' }}>
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {/* ─── MODAL RETIRO ─── */}
      <AdminModal open={modalRetiro} onClose={() => setModalRetiro(false)} center icon={<ArrowDownToLine size={24} />} iconTone="blue" title="Retirar ganancia">
        <p className="adm-modal-text">
          Disponible para retirar: <b>{formatearPrecio(Math.max(0, balanceDisponible))}</b>. No afecta los cálculos operativos.
        </p>
        <form onSubmit={procesarRetiro}>
          <input type="number" className="adm-input" placeholder="Monto (₡)" inputMode="numeric" value={montoRetiro} onChange={(e) => setMontoRetiro(e.target.value)} required autoFocus min="1" max={Math.max(0, balanceDisponible)} style={{ fontSize: '1.4rem', textAlign: 'center', fontWeight: 700, minHeight: '60px' }} />
          <div className="adm-modal-actions">
            <button type="button" onClick={() => setModalRetiro(false)} className="adm-btn adm-btn--ghost">Cancelar</button>
            <button type="submit" className="adm-btn adm-btn--primary">Retirar</button>
          </div>
        </form>
      </AdminModal>

      {/* ─── MODAL VACIAR ─── */}
      <AdminModal open={modalReset} center icon={<Archive size={24} />} iconTone="amber" title="¿Iniciar nuevo ciclo?">
        <p className="adm-modal-text">
          Se archivarán <b>todos los gastos y retiros</b> en un solo registro de cierre. Tu <b>caja disponible no cambia</b> y los ingresos se mantienen.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setModalReset(false)} className="adm-btn adm-btn--ghost" disabled={procesando}>Cancelar</button>
          <button onClick={resetearGastosYRetiros} className="adm-btn adm-btn--primary" disabled={procesando}>{procesando ? 'Archivando…' : 'Sí, archivar'}</button>
        </div>
      </AdminModal>

      {/* ─── MODAL: BORRAR GASTO O RETIRO ─── */}
      <AdminModal open={!!gastoAEliminar} center icon={<Trash2 size={24} />} iconTone="red" title="¿Borrar registro?">
        <p className="adm-modal-text">
          Se borrará <b>{gastoAEliminar?.descripcion === RETIRO ? 'el retiro' : `"${gastoAEliminar?.descripcion}"`}</b> por {formatearPrecio(gastoAEliminar?.monto)}. Esta acción no se puede deshacer.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setGastoAEliminar(null)} className="adm-btn adm-btn--ghost">Cancelar</button>
          <button onClick={eliminarGastoIndividual} className="adm-btn adm-btn--danger">Sí, borrar</button>
        </div>
      </AdminModal>

      {/* ─── MODAL: BORRAR VENTA ─── */}
      <AdminModal open={!!ventaAEliminar} center icon={<Trash2 size={24} />} iconTone="red" title="¿Borrar venta?">
        <p className="adm-modal-text">
          Se borrará la venta de <b>{ventaAEliminar?.cantidad} × {ventaAEliminar?.producto_nombre}</b> por {formatearPrecio(ventaAEliminar?.total)} y se descontará de los ingresos.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setVentaAEliminar(null)} className="adm-btn adm-btn--ghost">Cancelar</button>
          <button onClick={eliminarVenta} className="adm-btn adm-btn--danger">Sí, borrar</button>
        </div>
      </AdminModal>

      {/* ─── MODAL: AVISOS ─── */}
      <AdminModal
        open={modalAlerta.isOpen}
        center
        icon={modalAlerta.tipo === 'error' ? <AlertTriangle size={24} /> : <Check size={26} />}
        iconTone={modalAlerta.tipo === 'error' ? 'red' : 'green'}
        title={modalAlerta.titulo}
      >
        <p className="adm-modal-text">{modalAlerta.mensaje}</p>
        <button onClick={() => setModalAlerta({ isOpen: false, titulo: '', mensaje: '', tipo: 'error' })} className={`adm-btn adm-btn--block ${modalAlerta.tipo === 'error' ? 'adm-btn--danger' : 'adm-btn--primary'}`}>
          Entendido
        </button>
      </AdminModal>

      <style>{`
        .fz-kpis { display: flex; flex-wrap: wrap; gap: 2.5rem; margin-bottom: 1.2rem; }
        .fz-kpis > div { display: flex; flex-direction: column; gap: 0.3rem; }
        .fz-kpis strong { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; }
        .fz-chart { height: 340px; margin: 0 -0.5rem; }
        .fz-split { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; margin-top: 0.2rem; font-size: 0.75rem; color: var(--adm-muted); font-variant-numeric: tabular-nums; }
        .fz-split span { display: inline-flex; align-items: center; gap: 0.3rem; }
        .fz-notice { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.9rem 1.1rem; margin-bottom: 1.2rem; border-radius: 14px; background: var(--adm-amber-soft); border: 1px solid rgba(255, 181, 71, 0.3); color: var(--adm-amber); font-size: 0.85rem; line-height: 1.5; }
        .fz-notice svg { flex-shrink: 0; margin-top: 2px; }
        .fz-notice b { color: var(--adm-text); }
        @media (max-width: 640px) { .fz-chart { height: 280px; } }
      `}</style>
    </AdminLayout>
  );
}
