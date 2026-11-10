import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarCheck, CalendarDays, Scissors, Phone, MessageCircle, Banknote, AlertTriangle, Clock, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminModal from '../../components/admin/AdminModal';
import { formatearPrecio, formatearFechaCorta, formatearFechaRelativa, formatearHora, hoyCR, horaCR, sumarDias, diaSemana } from '../../utils/formato';
import { SERVICIOS, precioServicio, duracionServicio, aMinutos, aHora, seCruzan, HORA_APERTURA, HORA_CIERRE, INICIO_TARDE, INTERVALO_MIN } from '../../utils/servicios';

// ─── DOMINGOS ELIMINADOS ───
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ─── BLOQUES DE 30 MIN DE 8:00 AM A 7:30 PM (según utils/servicios.js) ───
const bloquesHorarios = (() => {
  const bloques = [];
  for (let min = HORA_APERTURA * 60; min < HORA_CIERRE * 60; min += INTERVALO_MIN) bloques.push(aHora(min));
  return bloques;
})();

const ordinales = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];
const serviciosDefault = ['Corte y Barba', 'Corte', 'Corte y Barba', 'Corte', 'Corte'];

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [citaActiva, setCitaActiva] = useState(null);
  const [precioEditable, setPrecioEditable] = useState(0);

  const [isModalCancelOpen, setIsModalCancelOpen] = useState(false);
  const [citaToCancel, setCitaToCancel] = useState(null);

  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, mensaje: '' });
  const [modalDesbloqueo, setModalDesbloqueo] = useState({ isOpen: false, id: null, dia: '', hora: '', tipo: '' });

  const [seleccion, setSeleccion] = useState({});
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  // ─── SEMANA VISIBLE EN LA CUADRÍCULA ───
  // Las citas se muestran según su FECHA real; abrir/cerrar horarios aplica a todas las semanas.
  const hoyISO = hoyCR();
  const lunesActual = (() => {
    const dow = diaSemana(hoyISO); // 0 = domingo
    return dow === 0 ? sumarDias(hoyISO, 1) : sumarDias(hoyISO, -(dow - 1));
  })();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const lunesSemana = sumarDias(lunesActual, semanaOffset * 7);
  const fechasSemana = diasSemana.map((_, i) => sumarDias(lunesSemana, i));

  // Día visible en la vista de celular (0 = Lunes … 5 = Sábado); domingo muestra el lunes
  const [diaMovil, setDiaMovil] = useState(() => {
    const d = diaSemana(hoyCR());
    return d === 0 ? 0 : d - 1;
  });

  const avisar = (mensaje) => setModalAlerta({ isOpen: true, mensaje });

  // ─── ESTADOS PARA PLAN MENSUAL / CITAS FIJAS ───
  const [isModalFijaOpen, setIsModalFijaOpen] = useState(false);
  const [guardandoFijas, setGuardandoFijas] = useState(false);
  const [formFija, setFormFija] = useState(() => ({
    cliente_nombre: '',
    telefono: '',
    mes: hoyCR().slice(0, 7),
    diaSemana: 2, // 1 = Lunes, 2 = Martes, ..., 6 = Sábado
    hora: '15:00'
  }));
  const [serviciosPorFecha, setServiciosPorFecha] = useState({}); // cambios manuales del barbero

  // Fechas del mes para el día elegido (1er martes, 2do martes, etc.). Las que ya pasaron no se agendan.
  const fechasBase = (() => {
    if (!formFija.mes || typeof formFija.mes !== 'string') return [];
    const numDia = Number(formFija.diaSemana); // 1 (Lun) a 6 (Sáb)
    const primero = `${formFija.mes}-01`;
    const lista = [];
    for (let i = 0; i < 31; i++) {
      const fecha = sumarDias(primero, i);
      if (fecha.slice(0, 7) !== formFija.mes) break;
      if (diaSemana(fecha) === numDia) {
        const n = lista.length;
        lista.push({ fecha, etiqueta: ordinales[n] || 'Quinto', servicioDefault: serviciosDefault[n] || 'Corte', pasada: fecha < hoyISO });
      }
    }
    return lista;
  })();

  const fechasMes = fechasBase.map(f => ({
    ...f,
    servicio: f.pasada ? 'ninguno' : (serviciosPorFecha[f.fecha] ?? f.servicioDefault),
  }));

  const cambiarServicioFecha = (idx, nuevoServicio) => {
    const fecha = fechasMes[idx]?.fecha;
    if (fecha) setServiciosPorFecha(prev => ({ ...prev, [fecha]: nuevoServicio }));
  };

  const guardarCitasFijas = async (e) => {
    e.preventDefault();
    if (!formFija.cliente_nombre.trim()) {
      avisar('Por favor ingresa el nombre del cliente.');
      return;
    }

    const citasParaAgendar = fechasMes.filter(f => f.servicio !== 'ninguno' && !f.pasada);
    if (citasParaAgendar.length === 0) {
      avisar('Debes dejar al menos una semana (que no haya pasado) con servicio activo.');
      return;
    }

    const inicio = aMinutos(formFija.hora);
    const terminaTarde = citasParaAgendar.find(f => inicio + duracionServicio(f.servicio) > HORA_CIERRE * 60);
    if (terminaTarde) {
      avisar(`A las ${formatearHora(formFija.hora)} un servicio de "${terminaTarde.servicio}" terminaría después del cierre. Elige una hora más temprano.`);
      return;
    }

    setGuardandoFijas(true);

    // Revisar que no choque con citas ya agendadas esas fechas
    const { data: existentes, error: errorCheck } = await supabase
      .from('citas')
      .select('fecha, hora, servicio, cliente_nombre')
      .in('fecha', citasParaAgendar.map(f => f.fecha))
      .neq('estado', 'Cancelada');

    if (errorCheck) {
      setGuardandoFijas(false);
      avisar('No se pudo verificar la agenda: ' + errorCheck.message);
      return;
    }

    const choques = citasParaAgendar.filter(f => {
      const fin = inicio + duracionServicio(f.servicio);
      return (existentes || []).some(c => {
        if (c.fecha !== f.fecha) return false;
        const ini = aMinutos(c.hora.substring(0, 5));
        return seCruzan(inicio, fin, ini, ini + duracionServicio(c.servicio));
      });
    });

    if (choques.length > 0) {
      setGuardandoFijas(false);
      avisar(`Ya hay citas a esa hora el ${choques.map(f => formatearFechaCorta(f.fecha)).join(', ')}. Marca esas semanas como "No agendar" o elige otra hora.`);
      return;
    }

    const nuevasCitas = citasParaAgendar.map(f => ({
      cliente_nombre: formFija.cliente_nombre.trim(),
      apellido: '',
      telefono: formFija.telefono.trim(),
      fecha: f.fecha,
      hora: `${formFija.hora}:00`,
      servicio: f.servicio,
      precio: precioServicio(f.servicio),
      estado: 'pendiente'
    }));

    const { error } = await supabase.from('citas').insert(nuevasCitas);
    setGuardandoFijas(false);

    if (error) {
      avisar('Hubo un error al guardar las citas: ' + error.message);
    } else {
      setIsModalFijaOpen(false);
      setFormFija(prev => ({ ...prev, cliente_nombre: '', telefono: '' }));
      setServiciosPorFecha({});
      cargarDatos();
      avisar(`¡Se agendaron ${nuevasCitas.length} citas fijas para ${formFija.cliente_nombre} con éxito!`);
    }
  };

  const formato12h = formatearHora;

  const cargarDatos = async () => {
    setLoading(true);
    const [resCitas, resBloqueos] = await Promise.all([
      supabase.from('citas').select('*').eq('estado', 'pendiente').order('fecha', { ascending: true }).order('hora', { ascending: true }),
      supabase.from('horarios_bloqueados').select('*'),
    ]);
    if (resCitas.error || resBloqueos.error) {
      avisar('No se pudo cargar la agenda: ' + (resCitas.error || resBloqueos.error).message);
    }
    setCitas(resCitas.data || []);
    setBloqueos(resBloqueos.data || []);
    setLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/admin');
      else cargarDatos();
    };
    checkUser();
    // Se carga una sola vez al entrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);


  // Cita que ocupa una celda en la semana visible (una cita de 1 h ocupa dos bloques de 30 min)
  const getCitaEnCelda = (diaIdx, hora) => {
    const fecha = fechasSemana[diaIdx];
    const slot = aMinutos(hora);
    return citas.find(c => {
      if (c.fecha !== fecha) return false;
      const ini = aMinutos(c.hora.substring(0, 5));
      return slot >= ini && slot < ini + duracionServicio(c.servicio);
    });
  };

  // ─── LÓGICA INTELIGENTE DE CELDAS (MAÑANA VS TARDE) ───
  const toggleCelda = (dia, hora, diaIdx) => {
    const isManana = aMinutos(hora) < INICIO_TARDE * 60;
    const horaDB = `${hora}:00`;

    const citaExistente = getCitaEnCelda(diaIdx, hora);
    if (citaExistente) {
      avisar(`No puedes modificar este horario: ${citaExistente.cliente_nombre} tiene cita el ${formatearFechaCorta(citaExistente.fecha)} a las ${formato12h(citaExistente.hora.substring(0, 5))}.`);
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
    const { error } = await supabase.from('horarios_bloqueados').delete().eq('id', modalDesbloqueo.id);
    setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '', tipo: '' });
    if (error) avisar('No se pudo modificar el horario: ' + error.message);
    cargarDatos();
  };

  const aplicarCambios = async () => {
    const nuevos = Object.keys(seleccion).filter(k => seleccion[k]).map(key => {
      const [dia, hora] = key.split('-');
      const isManana = aMinutos(hora) < INICIO_TARDE * 60;
      const diaIdx = diasSemana.indexOf(dia) + 1;

      if (isManana) {
        return { dia_semana: diaIdx, hora_inicio: `${hora}:00`, hora_fin: `${hora}:00` };
      }
      return { dia_semana: diaIdx, hora_inicio: `${hora}:00`, hora_fin: `${aHora(aMinutos(hora) + INTERVALO_MIN)}:00` };
    });

    if (nuevos.length === 0) { setSeleccion({}); return; }

    setGuardandoHorario(true);
    const { error } = await supabase.from('horarios_bloqueados').insert(nuevos);
    setGuardandoHorario(false);
    if (error) {
      avisar('No se pudieron guardar los cambios de horario: ' + error.message);
      return;
    }
    setSeleccion({});
    cargarDatos();
  };

  const procesarPago = async (e) => {
    e.preventDefault();
    const precio = parseInt(precioEditable);
    if (Number.isNaN(precio) || precio < 0) {
      avisar('Ingresa un monto válido para el cobro.');
      return;
    }
    const { error } = await supabase.from('citas').update({
      estado: 'Completada',
      precio
    }).eq('id', citaActiva.id);

    if (!error) {
      setIsModalPagoOpen(false);
      setCitaActiva(null);
      cargarDatos();
    } else {
      avisar('Error al procesar el pago: ' + error.message);
    }
  };

  const confirmarCancelacion = async () => {
    if (!citaToCancel) return;
    const { error } = await supabase.from('citas').update({ estado: 'Cancelada' }).eq('id', citaToCancel.id);
    setIsModalCancelOpen(false);
    setCitaToCancel(null);
    if (error) { avisar('No se pudo cancelar la cita: ' + error.message); return; }
    cargarDatos();
  };

  const iniciarCobro = (cita) => {
    setCitaActiva(cita);
    // Usa el precio guardado en la cita; si no tiene (citas antiguas), el precio oficial del servicio
    setPrecioEditable(Number(cita.precio) > 0 ? Number(cita.precio) : precioServicio(cita.servicio));
    setIsModalPagoOpen(true);
  };

  // ─── RECORDATORIO POR WHATSAPP (HOY / MAÑANA / FECHA) CON LINK DE WAZE ───
  const enviarRecordatorioWhatsApp = (cita) => {
    const horaTexto = formato12h(cita.hora.substring(0, 5));
    const direccionWaze = "\nhttps://waze.com/ul/hd1u135x3h";
    const cuando = cita.fecha === hoyISO
      ? '*hoy*'
      : cita.fecha === sumarDias(hoyISO, 1)
        ? '*mañana*'
        : `el *${formatearFechaRelativa(cita.fecha).toLowerCase()}*`;

    const mensaje = `Hola ${cita.cliente_nombre}, te saludamos de Aragon Barber Studio. 💈\n\nTe escribimos para recordarte tu cita ${cuando} a las *${horaTexto}* para tu servicio de *${cita.servicio}*.\n\n📍 *Ubicación:*\n${direccionWaze}\n\n¡Te esperamos! Por favor avísanos si necesitas reprogramar.`;

    const telefonoLimpio = cita.telefono ? cita.telefono.replace(/\D/g, '') : '';
    const valido = telefonoLimpio.length === 8 || (telefonoLimpio.length === 11 && telefonoLimpio.startsWith('506'));

    if (valido) {
      const numeroConCodigo = telefonoLimpio.length === 8 ? `506${telefonoLimpio}` : telefonoLimpio;
      const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroConCodigo}&text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsApp, '_blank');
    } else {
      const copiado = navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(mensaje)
        : Promise.reject(new Error('sin portapapeles'));
      copiado
        .then(() => avisar('Esta cita no tiene un teléfono válido. Copiamos el recordatorio al portapapeles para que lo pegues en el chat del cliente.'))
        .catch(() => avisar('Esta cita no tiene un teléfono válido y no se pudo copiar el mensaje. Escríbele al cliente manualmente.'));
    }
  };

  // ─── PRESENTACIÓN DE CADA CELDA ───
  const estadoCelda = (d, h, idx) => {
    const isManana = aMinutos(h) < INICIO_TARDE * 60;
    const horaDB = `${h}:00`;
    const cita = getCitaEnCelda(idx, h);
    const estaSeleccionado = seleccion[`${d}-${h}`];

    if (cita) {
      const esInicio = cita.hora.substring(0, 5) === h;
      return { clase: esInicio ? 'cita' : 'cita cont', texto: esInicio ? cita.cliente_nombre : '↳ ocupado' };
    }
    if (isManana) {
      const apertura = bloqueos.some(b => b.dia_semana === idx + 1 && b.hora_inicio === horaDB && b.hora_fin === horaDB);
      if (apertura) return { clase: 'abierto', texto: 'Abierto' };
      if (estaSeleccionado) return { clase: 'abrir', texto: 'Abrir' };
      return { clase: 'cerrado', texto: 'Cerrado' };
    }
    const cierre = bloqueos.some(b => b.dia_semana === idx + 1 && b.hora_inicio === horaDB && b.hora_fin !== horaDB);
    if (cierre) return { clase: 'bloqueado', texto: 'Cerrado' };
    if (estaSeleccionado) return { clase: 'cerrar', texto: 'Cerrar' };
    return { clase: 'libre', texto: '' };
  };

  const cambiosPendientes = Object.values(seleccion).filter(Boolean).length;

  // Citas agrupadas por fecha (ya vienen ordenadas por fecha y hora)
  const citasPorDia = citas.reduce((grupos, cita) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === cita.fecha) ultimo.items.push(cita);
    else grupos.push({ fecha: cita.fecha, items: [cita] });
    return grupos;
  }, []);

  const citasHoy = citas.filter(c => c.fecha === hoyISO).length;
  const horaAhora = horaCR();
  const proxima = citas.find(c => c.fecha > hoyISO || (c.fecha === hoyISO && c.hora.substring(0, 5) >= horaAhora));
  const limiteSemana = sumarDias(hoyISO, 6);
  const citasSemana = citas.filter(c => c.fecha >= hoyISO && c.fecha <= limiteSemana).length;
  const sinCobrar = citas.filter(c => c.fecha < hoyISO).length;
  const resumen = loading ? [] : [
    { label: 'Pendientes', value: citas.length, hint: sinCobrar > 0 ? `${sinCobrar} de días anteriores` : undefined },
    { label: 'Hoy', value: citasHoy, tone: citasHoy > 0 ? 'green' : undefined },
    { label: 'Próximos 7 días', value: citasSemana },
    proxima
      ? { label: 'Próxima cita', value: formato12h(proxima.hora.substring(0, 5)), hint: `${formatearFechaRelativa(proxima.fecha)} · ${(proxima.cliente_nombre || '').replace(/^./, (l) => l.toUpperCase())}` }
      : { label: 'Próxima cita', value: '—', hint: 'Sin citas próximas' },
  ];

  return (
    <AdminLayout
      title="Agenda"
      subtitle="Tus citas pendientes y el horario que ven los clientes al reservar."
      summary={resumen}
      actions={
        <button onClick={() => setIsModalFijaOpen(true)} className="adm-btn adm-btn--primary">
          <CalendarPlus size={17} /> Plan mensual / cita fija
        </button>
      }
    >
      {/* ─── AGENDA DE CITAS ACTIVAS ─── */}
      <div className="adm-anim">
        <div className="adm-card-head">
          <h2 className="adm-card-title">Citas pendientes <span className="adm-count">{citas.length}</span></h2>
        </div>

        {loading ? (
          <div className="ag-grid">
            {[0, 1, 2].map((i) => <div key={i} className="adm-skel" style={{ height: '200px' }} />)}
          </div>
        ) : citas.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon"><CalendarCheck size={22} /></div>
            <strong>La agenda está limpia</strong>
            No hay citas pendientes por ahora.
          </div>
        ) : (
          citasPorDia.map((grupo) => (
            <div key={grupo.fecha}>
              <div className="adm-group-label">
                {formatearFechaRelativa(grupo.fecha)}
                <span className="adm-chip">{grupo.items.length} {grupo.items.length === 1 ? 'cita' : 'citas'}</span>
                {grupo.fecha < hoyISO && <span className="adm-chip bg-amber">Sin cobrar</span>}
              </div>
              <div className="ag-grid">
                {grupo.items.map((cita) => (
                  <article key={cita.id} className={`ag-card ${cita.fecha === hoyISO ? 'is-today' : ''}`}>
                    <div className="ag-head">
                      <div className="ag-timebox">
                        <strong>{formato12h(cita.hora.substring(0, 5)).split(' ')[0]}</strong>
                        <span>{formato12h(cita.hora.substring(0, 5)).split(' ')[1]}</span>
                      </div>
                      <div className="ag-who">
                        <h3 className="ag-name">{cita.cliente_nombre} {cita.apellido}</h3>
                        <p className="ag-meta">
                          <span><CalendarDays size={12} /> {formatearFechaCorta(cita.fecha)}</span>
                          {cita.telefono && <span><Phone size={12} /> {cita.telefono}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="ag-service">
                      <span className="ag-service-icon"><Scissors size={14} /></span>
                      {cita.servicio}
                      {cita.fecha === hoyISO && <span className="ag-today">Hoy</span>}
                    </div>

                    <div className="ag-actions">
                      <button onClick={() => enviarRecordatorioWhatsApp(cita)} className="adm-btn adm-btn--wa adm-btn--icon" title="Recordar por WhatsApp" aria-label={`Recordar a ${cita.cliente_nombre} por WhatsApp`}>
                        <MessageCircle size={17} />
                      </button>
                      <button onClick={() => { setCitaToCancel(cita); setIsModalCancelOpen(true); }} className="adm-btn adm-btn--danger-ghost adm-btn--sm">
                        Cancelar
                      </button>
                      <button onClick={() => iniciarCobro(cita)} className="adm-btn adm-btn--green adm-btn--sm">
                        <Banknote size={15} /> Cobrar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── HORARIO SEMANAL ─── */}
      <div className="adm-card adm-section-gap adm-anim">
        <div className="adm-card-head">
          <div>
            <h2 className="adm-card-title">Horario semanal</h2>
            <p className="adm-card-sub">
              Mañanas <b style={{ color: 'var(--adm-text)' }}>cerradas</b> por defecto: tócalas para abrir.
              Tardes <b style={{ color: 'var(--adm-text)' }}>abiertas</b>: tócalas para cerrar.
              Los cambios de horario se repiten todas las semanas.
            </p>
          </div>
          <div className="hr-legend">
            <span><i className="hr-sw cita" /> Cita</span>
            <span><i className="hr-sw abierto" /> Abierto</span>
            <span><i className="hr-sw cerrado" /> Cerrado</span>
            <span><i className="hr-sw bloqueado" /> Tarde cerrada</span>
          </div>
        </div>

        <div className="hr-weeknav">
          <button type="button" className="adm-btn adm-btn--subtle adm-btn--icon" onClick={() => setSemanaOffset(o => o - 1)} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <div className="hr-weeknav-label">
            <strong>{semanaOffset === 0 ? 'Esta semana' : semanaOffset === 1 ? 'Próxima semana' : semanaOffset === -1 ? 'Semana pasada' : 'Semana'}</strong>
            <span>{formatearFechaCorta(fechasSemana[0])} – {formatearFechaCorta(fechasSemana[5])}</span>
          </div>
          <button type="button" className="adm-btn adm-btn--subtle adm-btn--icon" onClick={() => setSemanaOffset(o => o + 1)} aria-label="Semana siguiente"><ChevronRight size={18} /></button>
          {semanaOffset !== 0 && (
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setSemanaOffset(0)}>Hoy</button>
          )}
        </div>

        {/* Escritorio: tabla completa */}
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th className="hr-hora">Hora</th>
                {diasSemana.map((d, idx) => (
                  <th key={d} className={fechasSemana[idx] === hoyISO ? 'hr-today' : ''}>
                    {d}
                    <small>{Number(fechasSemana[idx].slice(8))}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloquesHorarios.map(h => (
                <tr key={h} className={h === '14:00' ? 'hr-split' : ''}>
                  <td className="hr-hora">{formato12h(h)}</td>
                  {diasSemana.map((d, idx) => {
                    const { clase, texto } = estadoCelda(d, h, idx);
                    return (
                      <td key={d}>
                        <button type="button" className={`hr-slot ${clase}`} onClick={() => toggleCelda(d, h, idx)} title={texto || 'Libre'}>
                          <span>{texto}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Celular: un día a la vez */}
        <div className="hr-mobile">
          <div className="adm-seg hr-days">
            {diasSemana.map((d, idx) => (
              <button key={d} className={`${diaMovil === idx ? 'active' : ''} ${fechasSemana[idx] === hoyISO ? 'is-today' : ''}`} onClick={() => setDiaMovil(idx)} style={{ flex: 1, justifyContent: 'center' }}>
                <span className="hr-day-btn">{d.slice(0, 3)}<small>{Number(fechasSemana[idx].slice(8))}</small></span>
              </button>
            ))}
          </div>
          <div className="hr-mobile-list">
            {bloquesHorarios.map(h => {
              const d = diasSemana[diaMovil];
              const { clase, texto } = estadoCelda(d, h, diaMovil);
              return (
                <button key={h} type="button" className={`hr-mrow ${clase} ${h === '14:00' ? 'hr-split' : ''}`} onClick={() => toggleCelda(d, h, diaMovil)}>
                  <span className="hr-mrow-time">{formato12h(h)}</span>
                  <span className={`hr-slot ${clase}`}><span>{texto || 'Libre'}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra flotante para guardar cambios de horario */}
      {cambiosPendientes > 0 && (
        <div className="adm-floatbar" role="status">
          <span className="adm-floatbar-text">{cambiosPendientes} {cambiosPendientes === 1 ? 'cambio' : 'cambios'} sin guardar</span>
          <button onClick={() => setSeleccion({})} className="adm-btn adm-btn--subtle adm-btn--sm">Descartar</button>
          <button onClick={aplicarCambios} className="adm-btn adm-btn--primary adm-btn--sm" disabled={guardandoHorario}>{guardandoHorario ? 'Guardando…' : 'Guardar'}</button>
        </div>
      )}

      {/* ─── MODAL: PLAN MENSUAL / CITA FIJA ─── */}
      <AdminModal open={isModalFijaOpen} onClose={() => setIsModalFijaOpen(false)} title="Plan mensual" width="540px">
        <p className="adm-modal-text" style={{ marginBottom: '1.2rem' }}>Agenda al mismo cliente el mismo día y hora cada semana del mes.</p>

        <form onSubmit={guardarCitasFijas} className="adm-form">
          <div className="adm-field-row">
            <label className="adm-field">
              <span className="adm-label">Cliente *</span>
              <input type="text" className="adm-input" placeholder="Ej. Carlos" value={formFija.cliente_nombre} onChange={e => setFormFija({ ...formFija, cliente_nombre: e.target.value })} required />
            </label>
            <label className="adm-field">
              <span className="adm-label">WhatsApp</span>
              <input type="tel" className="adm-input" placeholder="88888888" inputMode="numeric" value={formFija.telefono} onChange={e => setFormFija({ ...formFija, telefono: e.target.value })} />
            </label>
          </div>

          <div className="adm-field-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            <label className="adm-field">
              <span className="adm-label">Mes</span>
              <input type="month" className="adm-input" value={formFija.mes} onChange={e => setFormFija({ ...formFija, mes: e.target.value })} required />
            </label>
            <label className="adm-field">
              <span className="adm-label">Día fijo</span>
              <select className="adm-input" value={formFija.diaSemana} onChange={e => setFormFija({ ...formFija, diaSemana: Number(e.target.value) })}>
                {diasSemana.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <span className="adm-label">Hora</span>
              <select className="adm-input" value={formFija.hora} onChange={e => setFormFija({ ...formFija, hora: e.target.value })}>
                {bloquesHorarios.map(h => <option key={h} value={h}>{formato12h(h)}</option>)}
              </select>
            </label>
          </div>

          <div className="pm-weeks">
            <span className="adm-label">Servicio por semana · {diasSemana[formFija.diaSemana - 1]}</span>
            {fechasMes.map((item, idx) => (
              <div key={item.fecha} className={`pm-week ${item.servicio === 'ninguno' ? 'is-off' : ''}`} title={item.pasada ? 'Esta fecha ya pasó' : undefined}>
                <div style={{ minWidth: 0 }}>
                  <div className="adm-row-title" style={{ fontSize: '0.88rem' }}>{item.etiqueta} {diasSemana[formFija.diaSemana - 1].toLowerCase()}</div>
                  <div className="adm-row-meta">{formatearFechaCorta(item.fecha)}{item.pasada ? ' · ya pasó' : ''}</div>
                </div>
                <select className="adm-input" value={item.servicio} disabled={item.pasada} onChange={e => cambiarServicioFecha(idx, e.target.value)} style={{ width: 'auto', minWidth: '170px', minHeight: '40px', padding: '0.45rem 2.2rem 0.45rem 0.7rem', fontSize: '0.85rem' }}>
                  {SERVICIOS.map(serv => (
                    <option key={serv.id} value={serv.nombre}>{serv.nombre === 'Corte y Barba' ? serv.nombre : `Solo ${serv.nombre}`} ({formatearPrecio(serv.precio)})</option>
                  ))}
                  <option value="ninguno">— No agendar —</option>
                </select>
              </div>
            ))}
          </div>

          <div className="adm-modal-actions">
            <button type="button" onClick={() => setIsModalFijaOpen(false)} className="adm-btn adm-btn--ghost">Cancelar</button>
            <button type="submit" disabled={guardandoFijas} className="adm-btn adm-btn--primary">
              {guardandoFijas ? 'Guardando…' : 'Agendar mes'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* ─── MODAL: COBRO ─── */}
      <AdminModal open={isModalPagoOpen} onClose={() => setIsModalPagoOpen(false)} center icon={<Banknote size={24} />} iconTone="green" title="Cobrar cita">
        <p className="adm-modal-text" style={{ marginBottom: '1.2rem' }}>
          Finalizando la cita de <b style={{ textTransform: 'capitalize' }}>{citaActiva?.cliente_nombre}</b>.
        </p>
        <form onSubmit={procesarPago}>
          <div className="pg-box">
            <span className="adm-label">Total a cobrar</span>
            <div className="pg-amount">
              <span>₡</span>
              <input type="number" value={precioEditable} onChange={(e) => setPrecioEditable(e.target.value)} required min="0" inputMode="numeric" aria-label="Total a cobrar" />
            </div>
            <span className="adm-chip"><Scissors size={12} /> {citaActiva?.servicio}</span>
          </div>
          <div className="adm-modal-actions">
            <button type="button" onClick={() => setIsModalPagoOpen(false)} className="adm-btn adm-btn--ghost">Atrás</button>
            <button type="submit" className="adm-btn adm-btn--green">Confirmar pago</button>
          </div>
        </form>
      </AdminModal>

      {/* ─── MODAL: CANCELAR ─── */}
      <AdminModal open={isModalCancelOpen} center icon={<AlertTriangle size={24} />} iconTone="red" title="¿Cancelar cita?">
        <p className="adm-modal-text">
          Se quitará a <b style={{ textTransform: 'capitalize' }}>{citaToCancel?.cliente_nombre}</b> de la agenda.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setIsModalCancelOpen(false)} className="adm-btn adm-btn--ghost">Mantener</button>
          <button onClick={confirmarCancelacion} className="adm-btn adm-btn--danger">Sí, cancelar</button>
        </div>
      </AdminModal>

      {/* ─── MODAL: DESBLOQUEO ─── */}
      <AdminModal open={modalDesbloqueo.isOpen} center icon={<Clock size={24} />} title="Modificar horario">
        <p className="adm-modal-text">
          Vas a volver a <b>{modalDesbloqueo.tipo === 'cerrar_manana' ? 'CERRAR' : 'ABRIR'}</b> el {modalDesbloqueo.dia} a las {formato12h(modalDesbloqueo.hora)}.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setModalDesbloqueo({ isOpen: false, id: null, dia: '', hora: '', tipo: '' })} className="adm-btn adm-btn--ghost">Cancelar</button>
          <button onClick={confirmarDesbloqueo} className="adm-btn adm-btn--primary">Confirmar</button>
        </div>
      </AdminModal>

      {/* ─── MODAL: ALERTA ─── */}
      <AdminModal open={modalAlerta.isOpen} center icon={<Info size={24} />} iconTone="amber" title="Atención">
        <p className="adm-modal-text">{modalAlerta.mensaje}</p>
        <button onClick={() => setModalAlerta({ isOpen: false, mensaje: '' })} className="adm-btn adm-btn--primary adm-btn--block">Entendido</button>
      </AdminModal>

      <style>{`
        /* Tarjetas de citas */
        .ag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.9rem; }
        .ag-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: linear-gradient(180deg, #121211 0%, var(--adm-surface) 100%);
          border: 1px solid var(--adm-line);
          border-radius: 20px;
          padding: 1.1rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .ag-card:hover { border-color: var(--adm-line-strong); transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 36px -20px rgba(0,0,0,0.9); }
        .ag-card.is-today {
          border-color: rgba(61, 220, 132, 0.28);
          background:
            radial-gradient(120% 90% at 0% 0%, rgba(61, 220, 132, 0.09) 0%, transparent 55%),
            linear-gradient(180deg, #121211 0%, var(--adm-surface) 100%);
        }
        .ag-head { display: flex; align-items: center; gap: 0.9rem; }
        .ag-timebox {
          flex-shrink: 0;
          width: 74px;
          height: 74px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--adm-surface-3);
          box-shadow: inset 0 0 0 1px var(--adm-line-strong);
        }
        .ag-timebox strong { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
        .ag-timebox span { margin-top: 0.3rem; font-size: 0.62rem; letter-spacing: 0.2em; color: var(--adm-muted); font-weight: 600; }
        .ag-card.is-today .ag-timebox { background: var(--adm-text); color: #000; box-shadow: none; }
        .ag-card.is-today .ag-timebox span { color: rgba(0, 0, 0, 0.55); }
        .ag-who { min-width: 0; flex: 1; }
        .ag-name { font-size: 1.08rem; font-weight: 700; text-transform: capitalize; margin-bottom: 0.35rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ag-meta { display: flex; flex-wrap: wrap; gap: 0.4rem 0.8rem; color: var(--adm-muted); font-size: 0.78rem; }
        .ag-meta span { display: inline-flex; align-items: center; gap: 0.3rem; }
        .ag-service {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 0.7rem;
          border-radius: 12px;
          background: rgba(245, 245, 220, 0.035);
          border: 1px solid var(--adm-line);
          font-size: 0.86rem;
          font-weight: 600;
        }
        .ag-service-icon { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--adm-surface-3); color: var(--adm-muted); }
        .ag-today { margin-left: auto; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--adm-green); font-weight: 700; }
        .ag-actions { display: grid; grid-template-columns: auto 1fr 1fr; gap: 0.5rem; margin-top: auto; }

        /* Leyenda */
        .hr-legend { display: flex; flex-wrap: wrap; gap: 0.9rem; font-size: 0.75rem; color: var(--adm-muted); }
        .hr-legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
        .hr-sw { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
        .hr-sw.cita { background: var(--adm-text); }
        .hr-sw.abierto { background: var(--adm-green-soft); box-shadow: inset 0 0 0 1px var(--adm-green); }
        .hr-sw.cerrado { background: repeating-linear-gradient(135deg, #1a1a1a 0 3px, #111 3px 6px); box-shadow: inset 0 0 0 1px var(--adm-line-strong); }
        .hr-sw.bloqueado { background: var(--adm-red-soft); box-shadow: inset 0 0 0 1px var(--adm-red); }

        /* Celdas */
        .hr-slot {
          width: 100%;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 8px;
          background: var(--adm-surface-2);
          color: var(--adm-muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
          overflow: hidden;
          padding: 0 0.4rem;
        }
        .hr-slot span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hr-slot.libre:hover { box-shadow: inset 0 0 0 1px var(--adm-red); }
        .hr-slot.libre:hover span::after { content: 'Cerrar'; color: var(--adm-red); }
        .hr-slot.cerrado { background: repeating-linear-gradient(135deg, #161616 0 4px, #101010 4px 8px); color: var(--adm-dim); }
        .hr-slot.cerrado:hover { box-shadow: inset 0 0 0 1px var(--adm-green); color: var(--adm-green); }
        .hr-slot.abierto { background: var(--adm-green-soft); color: var(--adm-green); }
        .hr-slot.abrir { background: var(--adm-green); color: #000; animation: hrPulse 1.6s ease-in-out infinite; }
        .hr-slot.bloqueado { background: var(--adm-red-soft); color: var(--adm-red); }
        .hr-slot.cerrar { background: var(--adm-red); color: #fff; animation: hrPulse 1.6s ease-in-out infinite; }
        .hr-slot.cita { background: var(--adm-text); color: #000; font-weight: 700; cursor: not-allowed; text-transform: capitalize; }
        .hr-slot.cita.cont { background: rgba(245, 245, 220, 0.55); color: rgba(0, 0, 0, 0.6); font-weight: 600; text-transform: none; }
        .hr-weeknav { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .hr-weeknav-label { display: flex; flex-direction: column; min-width: 170px; text-align: center; }
        .hr-weeknav-label strong { font-size: 0.95rem; }
        .hr-weeknav-label span { font-size: 0.75rem; color: var(--adm-muted); }
        .hr-table th small { display: block; margin-top: 0.2rem; font-size: 0.9rem; letter-spacing: 0; color: var(--adm-text); font-weight: 700; }
        .hr-table th.hr-today { color: var(--adm-green); }
        .hr-table th.hr-today small { color: #000; background: var(--adm-green); border-radius: 999px; width: 28px; height: 28px; line-height: 28px; margin: 0.25rem auto 0; }
        .hr-day-btn { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
        .hr-day-btn small { font-size: 0.85rem; font-weight: 700; color: var(--adm-text); }
        .hr-days button.is-today small { color: var(--adm-green); }
        @keyframes hrPulse { 50% { opacity: 0.75; } }

        /* Tabla (escritorio) */
        .hr-table-wrap { overflow: auto; max-height: 640px; border-radius: 12px; border: 1px solid var(--adm-line); }
        .hr-table { width: 100%; border-collapse: separate; border-spacing: 4px; font-size: 0.8rem; min-width: 760px; }
        .hr-table th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: var(--adm-surface);
          padding: 0.7rem 0.4rem;
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--adm-muted);
          font-weight: 600;
        }
        .hr-table td { padding: 0; }
        .hr-table .hr-hora {
          position: sticky;
          left: 0;
          z-index: 1;
          background: var(--adm-surface);
          color: var(--adm-text);
          font-weight: 600;
          font-size: 0.75rem;
          white-space: nowrap;
          padding: 0 0.6rem;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .hr-table th.hr-hora { z-index: 3; }
        .hr-table tr.hr-split td { padding-top: 10px; }

        /* Lista (celular) */
        .hr-mobile { display: none; }
        .hr-days { display: grid; grid-template-columns: repeat(6, 1fr); width: 100%; margin-bottom: 1rem; }
        .hr-days button { padding: 0.55rem 0; justify-content: center; }
        .hr-mobile-list { display: flex; flex-direction: column; gap: 0.35rem; }
        .hr-mrow {
          display: grid;
          grid-template-columns: 78px 1fr;
          align-items: center;
          gap: 0.6rem;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          text-align: left;
        }
        .hr-mrow.hr-split { margin-top: 0.8rem; }
        .hr-mrow-time { color: var(--adm-text); font-size: 0.8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        .hr-mrow .hr-slot { height: 40px; justify-content: flex-start; padding: 0 0.9rem; }
        .hr-mrow .hr-slot.libre span { color: var(--adm-dim); }

        @media (max-width: 760px) {
          .hr-table-wrap { display: none; }
          .hr-mobile { display: block; }
          .hr-legend { gap: 0.7rem; }
        }

        /* Plan mensual */
        .pm-weeks { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; background: var(--adm-surface); border: 1px solid var(--adm-line); border-radius: 14px; }
        .pm-weeks > .adm-label { margin-bottom: 0.3rem; }
        .pm-week { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.55rem 0.55rem 0.55rem 0.8rem; background: var(--adm-surface-2); border-radius: 10px; transition: opacity 0.2s ease; }
        .pm-week.is-off { opacity: 0.45; }
        @media (max-width: 480px) {
          .pm-week { flex-direction: column; align-items: stretch; }
          .pm-week select { width: 100% !important; }
        }

        /* Cobro */
        .pg-box { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; padding: 1.3rem 1rem; background: var(--adm-surface); border: 1px solid var(--adm-line); border-radius: 16px; }
        .pg-amount { display: flex; align-items: baseline; justify-content: center; gap: 0.2rem; color: var(--adm-green); font-weight: 700; }
        .pg-amount span { font-size: 1.8rem; }
        .adm .pg-amount input {
          width: 7ch;
          background: transparent;
          border: none;
          border-bottom: 2px solid rgba(61, 220, 132, 0.4);
          border-radius: 0;
          padding: 0;
          color: var(--adm-green);
          font-family: 'DM Sans', sans-serif;
          font-size: 2.6rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          font-variant-numeric: tabular-nums;
        }
        .adm .pg-amount input:focus { border-bottom-color: var(--adm-green); }
      `}</style>
    </AdminLayout>
  );
}
