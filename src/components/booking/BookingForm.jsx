import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser'; 
import { duracionServicio, precioServicio, aMinutos, aHora, seCruzan, HORA_APERTURA, HORA_CIERRE, INICIO_TARDE, INTERVALO_MIN } from '../../utils/servicios';
import { hoyCR, horaCR, diaSemana, formatearHora } from '../../utils/formato';

// UUID v4 aleatorio (usa crypto.randomUUID cuando está disponible)
const generarToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export default function BookingForm({ selectedService }) {
  const [formData, setFormData] = useState({ dia: '', hora: '', nombre: '', apellido: '', email: '', telefono: '' });
  const [listaDias, setListaDias] = useState([]);
  
  // ─── GUARDAMOS LAS CITAS COMPLETAS PARA CALCULAR COLISIONES ───
  const [citasDelDia, setCitasDelDia] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const obtenerTiempoCR = () => {
    const crTime = new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
    return new Date(crTime);
  };

  // Duraciones y conversión de horas centralizadas en utils/servicios.js
  const obtenerDuracionMinutos = duracionServicio;
  const minutosDesdeMedianoche = aMinutos;

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
        // Función segura en Supabase: devuelve solo hora y servicio (sin datos de clientes)
        const { data } = await supabase.rpc('horas_ocupadas', { p_fecha: formData.dia });
        setCitasDelDia(data || []);
      };
      fetchCitas();
    } else {
      setCitasDelDia([]);
    }
  }, [formData.dia]);

  // ─── NUEVO: AUTOCOMPLETAR DATOS DE CLIENTES FRECUENTES POR TELÉFONO ───
  const buscarClientePorTelefono = async (telefonoIngresado) => {
    if (telefonoIngresado.length === 8) {
      // Función segura en Supabase: devuelve solo nombre y apellido (nunca el correo)
      const { data } = await supabase.rpc('cliente_por_telefono', { p_telefono: telefonoIngresado });
      const cliente = Array.isArray(data) ? data[0] : null;

      if (cliente) {
        setFormData(prev => ({
          ...prev,
          nombre: prev.nombre || cliente.cliente_nombre || '',
          apellido: prev.apellido || cliente.apellido || ''
        }));
      }
    }
  };

  // ─── MOTOR INTELIGENTE DE HORARIOS Y COLISIONES ───
  // Una hora se ofrece solo si TODOS los bloques de 30 min que ocupa el servicio están disponibles:
  //  · antes de las 2:00 PM el bloque debe estar ABIERTO desde el panel (cerrado por defecto)
  //  · desde las 2:00 PM el bloque no debe estar CERRADO desde el panel (abierto por defecto)
  //  · no puede chocar con otra cita ni terminar después de la hora de cierre
  const generarHoras = () => {
    const horas = [];
    if (!formData.dia) return horas;

    const esHoy = formData.dia === hoyCR();
    const ahoraMin = aMinutos(horaCR());
    const duracion = duracionServicio(selectedService);

    const dow = diaSemana(formData.dia);
    const diaIdx = dow === 0 ? 7 : dow; // 1 = Lunes … 6 = Sábado
    const bloqueosDelDia = bloqueos.filter(b => b.dia_semana === diaIdx);
    const aperturasManana = new Set(
      bloqueosDelDia.filter(b => b.hora_inicio === b.hora_fin).map(b => b.hora_inicio.substring(0, 5))
    );
    const cierresTarde = bloqueosDelDia
      .filter(b => b.hora_inicio !== b.hora_fin)
      .map(b => [aMinutos(b.hora_inicio.substring(0, 5)), aMinutos(b.hora_fin.substring(0, 5))]);

    for (let inicio = HORA_APERTURA * 60; inicio + duracion <= HORA_CIERRE * 60; inicio += INTERVALO_MIN) {
      const fin = inicio + duracion;

      // Evitar que agenden en el pasado el día de hoy
      if (esHoy && inicio <= ahoraMin) continue;

      let disponible = true;
      for (let t = inicio; t < fin; t += INTERVALO_MIN) {
        if (t < INICIO_TARDE * 60) {
          if (!aperturasManana.has(aHora(t))) { disponible = false; break; }
        } else if (cierresTarde.some(([ini, f]) => seCruzan(t, t + INTERVALO_MIN, ini, f))) {
          disponible = false; break;
        }
      }
      if (!disponible) continue;

      const chocaConCita = citasDelDia.some(c => {
        const ini = aMinutos(c.hora.substring(0, 5));
        return seCruzan(inicio, fin, ini, ini + duracionServicio(c.servicio));
      });
      if (chocaConCita) continue;

      const valor = aHora(inicio);
      horas.push({ valor, texto: formatearHora(valor) });
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
    const { data: checkData } = await supabase.rpc('horas_ocupadas', { p_fecha: formData.dia });

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

    // Código secreto para el enlace de cancelación (no se puede adivinar como el número de cita)
    const cancelToken = generarToken();

    // Insertar cita (sin leerla de vuelta: el público ya no tiene permiso de lectura)
    const { error } = await supabase.from('citas').insert([{
      fecha: formData.dia, 
      hora: formData.hora, 
      cliente_nombre: formData.nombre,
      apellido: formData.apellido, 
      email: formData.email, 
      telefono: formData.telefono,
      servicio: selectedService || 'Corte', 
      precio: precioServicio(selectedService), 
      estado: 'pendiente',
      cancel_token: cancelToken
    }]);

    if (error) {
      alert("Error al reservar: " + error.message);
      setLoading(false);
      return;
    }

    // ENVIAR CORREOS
    const cancelLink = `${window.location.origin}/#/cancelar-cita?token=${cancelToken}`;

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

  // FORMULARIO CON EL TELÉFONO DE PRIMERO Y CAMPOS CONTROLADOS
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
        <select className="premium-select" style={inputElementStyle} value={formData.dia} onChange={(e) => setFormData({...formData, dia: e.target.value, hora: ''})} required>
          <option value="" disabled>Selecciona un día</option>
          {listaDias.map(dia => <option key={dia.valor} value={dia.valor}>{dia.texto}</option>)}
        </select>
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>HORA</label>
        <select className="premium-select" style={inputElementStyle} value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} required disabled={!formData.dia}>
          <option value="" disabled>{formData.dia ? "Selecciona una hora" : "Primero selecciona un día"}</option>
          {generarHoras().map(h => <option key={h.valor} value={h.valor}>{h.texto}</option>)}
        </select>
      </div>

      {/* ─── TELÉFONO PRIMERO (Con Autocompletado Inteligente) ─── */}
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
            const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 8); 
            setFormData({...formData, telefono: soloNumeros});
            buscarClientePorTelefono(soloNumeros);
          }} 
          required 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>NOMBRE</label>
        <input 
          type="text" 
          placeholder="Ej. Daniel" 
          style={inputElementStyle} 
          value={formData.nombre}
          onChange={e => setFormData({...formData, nombre: e.target.value})} 
          required 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>APELLIDO</label>
        <input 
          type="text" 
          placeholder="Ej. Aragón" 
          style={inputElementStyle} 
          value={formData.apellido}
          onChange={e => setFormData({...formData, apellido: e.target.value})} 
          required 
        />
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle}>CORREO ELECTRÓNICO</label>
        <input 
          type="email" 
          placeholder="tucorreo@ejemplo.com" 
          style={inputElementStyle} 
          value={formData.email}
          onChange={e => setFormData({...formData, email: e.target.value})} 
          required 
        />
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