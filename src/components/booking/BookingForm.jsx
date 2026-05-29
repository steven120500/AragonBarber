import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser'; 

export default function BookingForm({ selectedService }) {
  const [formData, setFormData] = useState({ dia: '', hora: '', nombre: '', apellido: '', email: '', telefono: '' });
  const [listaDias, setListaDias] = useState([]);
  
  // ─── AHORA GUARDAMOS LAS CITAS COMPLETAS, NO SOLO LA HORA ───
  const [citasDelDia, setCitasDelDia] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const obtenerTiempoCR = () => {
    const crTime = new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
    return new Date(crTime);
  };

  // ─── DICCIONARIO DE DURACIONES (En minutos) ───
  const obtenerDuracionMinutos = (servicio) => {
    if (!servicio) return 60;
    const s = servicio.toLowerCase();
    // Si es SOLO barba, dura 30 minutos. Todo lo demás (Cortes, Combos) dura 60 minutos.
    if (s.includes('barba') && !s.includes('corte')) return 30; 
    return 60; 
  };

  // Convierte "15:30" a 930 minutos (facilita la matemática de colisiones)
  const minutosDesdeMedianoche = (horaString) => {
    if (!horaString) return 0;
    const [h, m] = horaString.split(':').map(Number);
    return (h * 60) + m;
  };

  useEffect(() => {
    const dias = [];
    const ahoraCR = obtenerTiempoCR();
    let i = 0;
    let diasAgregados = 0;
    
    while (diasAgregados < 7) {
      const fechaObj = new Date(ahoraCR);
      fechaObj.setDate(fechaObj.getDate() + i);
      
      if (fechaObj.getDay() !== 0) {
        const textoDia = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        const valorDB = `${year}-${month}-${day}`; 
        
        dias.push({ texto: textoDia, valor: valorDB });
        diasAgregados++;
      }
      i++;
    }
    setListaDias(dias);

    const fetchBloqueos = async () => {
      const { data } = await supabase.from('horarios_bloqueados').select('*');
      setBloqueos(data || []);
    };
    fetchBloqueos();
  }, []);

  // BUSCAR CITAS DEL DÍA SELECCIONADO
  useEffect(() => {
    if (formData.dia) {
      const fetchCitas = async () => {
        const { data } = await supabase
          .from('citas')
          .select('hora, servicio') // Ocupamos saber qué servicio es para calcular su duración
          .eq('fecha', formData.dia)
          .neq('estado', 'Cancelada');
          
        setCitasDelDia(data || []);
      };
      fetchCitas();
    } else {
      setCitasDelDia([]);
    }
  }, [formData.dia]);

  // ─── MOTOR INTELIGENTE DE HORARIOS Y COLISIONES ───
  const generarHoras = () => {
    const horas = [];
    const ahoraCR = obtenerTiempoCR();
    
    const hoyYear = ahoraCR.getFullYear();
    const hoyMonth = String(ahoraCR.getMonth() + 1).padStart(2, '0');
    const hoyDay = String(ahoraCR.getDate()).padStart(2, '0');
    const hoyCRString = `${hoyYear}-${hoyMonth}-${hoyDay}`;
    
    const horaActual = ahoraCR.getHours();
    const minutoActual = ahoraCR.getMinutes();
    
    // Todos los bloques visuales son de 30 en 30
    const intervalo = 30; 
    
    // ¿Cuánto dura lo que el cliente quiere agendar?
    const duracionSolicitada = obtenerDuracionMinutos(selectedService);
    
    let diaSeleccionadoIndex = -1;
    if (formData.dia) {
      const [y, m, d] = formData.dia.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      diaSeleccionadoIndex = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
    }

    const bloqueosDelDia = bloqueos.filter(b => b.dia_semana === diaSeleccionadoIndex);

    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += intervalo) {
        
        const horaStr = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : m}`;
        const startSolicitado = (h * 60) + m;
        const endSolicitado = startSolicitado + duracionSolicitada; // A qué hora terminaría este servicio
        const isManana = h < 14;

        // 1. ¿Choca con alguna CITA existente?
        let hayChoque = false;
        for (const cita of citasDelDia) {
          const startCita = minutosDesdeMedianoche(cita.hora.substring(0, 5));
          const endCita = startCita + obtenerDuracionMinutos(cita.servicio);
          
          // Lógica de traslape matemático
          if (startSolicitado < endCita && endSolicitado > startCita) {
            hayChoque = true;
            break;
          }
        }

        // 2. ¿Choca con algún CIERRE en la tarde de tu panel?
        if (!hayChoque && !isManana) {
          const bloqueosTarde = bloqueosDelDia.filter(b => b.hora_inicio !== b.hora_fin);
          for (const b of bloqueosTarde) {
            const startBloqueo = minutosDesdeMedianoche(b.hora_inicio.substring(0, 5));
            const endBloqueo = minutosDesdeMedianoche(b.hora_fin.substring(0, 5));
            if (startSolicitado < endBloqueo && endSolicitado > startBloqueo) {
              hayChoque = true;
              break;
            }
          }
        }

        // 3. ¿El horario de la mañana está totalmente ABIERTO para la duración requerida?
        let abiertoEnManana = true;
        if (isManana) {
          const bloquesNecesarios = duracionSolicitada / 30; // Ej: Corte necesita 2 bloques abiertos
          for (let step = 0; step < bloquesNecesarios; step++) {
            const checkMin = startSolicitado + (step * 30);
            const checkH = Math.floor(checkMin / 60);
            const checkM = checkMin % 60;
            const checkHoraDB = `${checkH.toString().padStart(2, '0')}:${checkM === 0 ? '00' : '30'}:00`;
            
            const bloqueAbierto = bloqueosDelDia.some(b => b.hora_inicio === checkHoraDB && b.hora_fin === checkHoraDB);
            if (!bloqueAbierto) {
              abiertoEnManana = false;
              break;
            }
          }
        }

        // DECISIÓN FINAL: ¿Mostramos la hora?
        let mostrarHora = false;
        if (isManana) {
          if (abiertoEnManana && !hayChoque) mostrarHora = true;
        } else {
          if (!hayChoque) mostrarHora = true;
        }

        // Evitar que agenden en el pasado el día de hoy
        const esHoy = formData.dia === hoyCRString;
        const esHoraPasada = esHoy && (startSolicitado <= (horaActual * 60 + minutoActual));

        if (mostrarHora && !esHoraPasada) {
          const hora12h = h > 12 ? h - 12 : h;
          const ampm = h >= 12 ? 'PM' : 'AM';
          horas.push({ valor: horaStr, texto: `${hora12h}:${m === 0 ? '00' : m} ${ampm}` });
        }
      }
    }
    return horas;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.telefono.length !== 8) {
      alert("El número de teléfono debe tener exactamente 8 dígitos.");
      return;
    }

    setLoading(true);

    // DOUBLE CHECK: Validamos colisiones en la base de datos por si 2 personas guardan a la vez
    const { data: checkData } = await supabase
      .from('citas')
      .select('hora, servicio')
      .eq('fecha', formData.dia)
      .neq('estado', 'Cancelada');

    const startNuevo = minutosDesdeMedianoche(formData.hora);
    const endNuevo = startNuevo + obtenerDuracionMinutos(selectedService);
    let choqueSimultaneo = false;
    
    for (const cita of (checkData || [])) {
      const startExistente = minutosDesdeMedianoche(cita.hora.substring(0,5));
      const endExistente = startExistente + obtenerDuracionMinutos(cita.servicio);
      if (startNuevo < endExistente && endNuevo > startExistente) {
        choqueSimultaneo = true; 
        break;
      }
    }

    if (choqueSimultaneo) {
      alert("Lo sentimos, alguien acaba de reservar este espacio u otro servicio está chocando. Por favor elige otro horario.");
      setLoading(false);
      return;
    }

    // Insertar cita
    const { data: citaData, error } = await supabase.from('citas').insert([{
      fecha: formData.dia, 
      hora: formData.hora, 
      cliente_nombre: formData.nombre,
      apellido: formData.apellido, 
      email: formData.email, 
      telefono: formData.telefono,
      servicio: selectedService || 'Corte', 
      precio: 0, 
      estado: 'pendiente'
    }]).select();

    if (error || !citaData) {
      alert("Error al reservar: " + error.message);
      setLoading(false);
      return;
    }

    // ENVIAR CORREOS
    const citaId = citaData[0].id;
    const cancelLink = `${window.location.origin}/#/cancelar-cita?id=${citaId}`;

    const templateParams = {
      cliente_nombre: formData.nombre,
      cliente_apellido: formData.apellido,
      telefono: formData.telefono,
      cliente_email: formData.email,
      fecha: formData.dia,
      hora: formData.hora,
      servicio: selectedService || 'Corte',
      cancel_link: cancelLink
    };

    try {
      await emailjs.send('service_44y34g1', 'template_aw2t728', templateParams, '2EEPT8Z3vdkbZzwSq');
      await emailjs.send('service_44y34g1', 'template_0x2ywka', templateParams, '2EEPT8Z3vdkbZzwSq');
      setSuccess(true);
    } catch (emailError) {
      console.error('Falló el correo:', emailError);
      setSuccess(true); 
    }

    setLoading(false);
  };

  // PANTALLA DE ÉXITO
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#0a0a0a', borderRadius: '16px', border: '1px solid #222', animation: 'smoothFade 0.6s ease forwards' }}>
        <CheckCircle size={60} color="var(--gold)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: 'var(--cream)', marginBottom: '1rem' }}>
          ¡Cita Reservada!
        </h2>
        <p style={{ color: 'var(--grey)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
          Todo listo. Te llegará un correo con los detalles de tu cita y la ubicación exacta.
        </p>
      </div>
    );
  }

  // FORMULARIO
  return (
    <form onSubmit={handleSubmit} style={formContainerStyle}>
      <style>{`
        @keyframes smoothFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .premium-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1em;
        }
      `}</style>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>DÍA</label>
        <select className="premium-select" style={inputElementStyle} onChange={(e) => setFormData({...formData, dia: e.target.value, hora: ''})} required>
          <option value="" disabled selected>Selecciona un día</option>
          {listaDias.map(dia => <option key={dia.valor} value={dia.valor}>{dia.texto}</option>)}
        </select>
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>HORA</label>
        <select className="premium-select" style={inputElementStyle} onChange={(e) => setFormData({...formData, hora: e.target.value})} required disabled={!formData.dia}>
          <option value="" disabled selected>{formData.dia ? "Selecciona una hora" : "Primero selecciona un día"}</option>
          {generarHoras().map(h => <option key={h.valor} value={h.valor}>{h.texto}</option>)}
        </select>
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>NOMBRE</label>
        <input type="text" placeholder="Ej. Daniel" style={inputElementStyle} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>APELLIDO</label>
        <input type="text" placeholder="Ej. Aragón" style={inputElementStyle} onChange={e => setFormData({...formData, apellido: e.target.value})} required />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>TELÉFONO</label>
        <input 
          type="tel" 
          placeholder="Ej. 88888888" 
          maxLength="8"
          pattern="\d{8}"
          title="El teléfono debe tener exactamente 8 dígitos numéricos"
          style={inputElementStyle} 
          value={formData.telefono}
          onChange={e => {
            const soloNumeros = e.target.value.replace(/\D/g, ''); 
            setFormData({...formData, telefono: soloNumeros.slice(0, 8)});
          }} 
          required 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>CORREO ELECTRÓNICO</label>
        <input type="email" placeholder="tucorreo@ejemplo.com" style={inputElementStyle} onChange={e => setFormData({...formData, email: e.target.value})} required />
      </div>

      <button type="submit" disabled={loading} style={submitBtnStyle}>
        {loading ? 'PROCESANDO...' : 'RESERVAR CITA'}
      </button>
    </form>
  );
}

// ─── ESTILOS PREMIUM ───
const formContainerStyle = {
  background: '#0a0a0a', 
  border: '1px solid #222',
  borderRadius: '12px',
  padding: '2.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  animation: 'smoothFade 0.5s ease-out forwards',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem'
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  letterSpacing: '0.15em',
  color: 'var(--cream)',
  textTransform: 'uppercase'
};

const inputElementStyle = {
  width: '100%',
  background: '#141414',
  border: '1px solid #333',
  color: '#fff',
  padding: '1rem',
  fontSize: '0.95rem',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxSizing: 'border-box',
  transition: 'border-color 0.3s ease'
};

const submitBtnStyle = {
  background: 'var(--cream)',
  color: '#000',
  border: 'none',
  padding: '1.2rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 'bold',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  marginTop: '1rem',
  transition: 'background 0.3s ease, transform 0.2s ease'
};