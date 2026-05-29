import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser'; 

export default function BookingForm({ selectedService }) {
  const [formData, setFormData] = useState({ dia: '', hora: '', nombre: '', apellido: '', email: '', telefono: '' });
  const [listaDias, setListaDias] = useState([]);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. OBTENER FECHA Y HORA EXACTA DE COSTA RICA
  const obtenerTiempoCR = () => {
    const crTime = new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
    return new Date(crTime);
  };

  useEffect(() => {
    // Generar los próximos días a partir de HOY (Hora Costa Rica) excluyendo los domingos
    const dias = [];
    const ahoraCR = obtenerTiempoCR();
    
    // Generamos días hasta tener 7 días laborables
    let i = 0;
    let diasAgregados = 0;
    
    while (diasAgregados < 7) {
      const fechaObj = new Date(ahoraCR);
      fechaObj.setDate(fechaObj.getDate() + i);
      
      // getDay() devuelve 0 para el domingo. Solo agregamos si NO es domingo.
      if (fechaObj.getDay() !== 0) {
        const textoDia = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        
        // ─── SOLUCIÓN AL BUG DEL DÍA ATRASADO: FORMATO MANUAL ───
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

    // Cargar tus horarios bloqueados y aperturas
    const fetchBloqueos = async () => {
      const { data } = await supabase.from('horarios_bloqueados').select('*');
      setBloqueos(data || []);
    };
    fetchBloqueos();
  }, []);

  // 2. BUSCAR CITAS OCUPADAS CUANDO SE SELECCIONA UN DÍA
  useEffect(() => {
    if (formData.dia) {
      const fetchCitas = async () => {
        // Solo traemos citas que NO estén canceladas
        const { data } = await supabase
          .from('citas')
          .select('hora')
          .eq('fecha', formData.dia)
          .neq('estado', 'Cancelada');
          
        setHorasOcupadas(data ? data.map(c => c.hora.substring(0, 5)) : []);
      };
      fetchCitas();
    } else {
      setHorasOcupadas([]);
    }
  }, [formData.dia]);

  // 3. GENERAR HORARIOS DISPONIBLES (De 09:00 AM a 07:30 PM, intervalos de 30 min)
  const generarHoras = () => {
    const horas = [];
    const ahoraCR = obtenerTiempoCR();
    
    // Obtener string exacto de HOY sin timezone shift
    const hoyYear = ahoraCR.getFullYear();
    const hoyMonth = String(ahoraCR.getMonth() + 1).padStart(2, '0');
    const hoyDay = String(ahoraCR.getDate()).padStart(2, '0');
    const hoyCRString = `${hoyYear}-${hoyMonth}-${hoyDay}`;
    
    const horaActual = ahoraCR.getHours();
    const minutoActual = ahoraCR.getMinutes();
    
    const intervalo = 30; 
    
    // ─── SOLUCIÓN AL BUG DEL DÍA ATRASADO: PARSEO LOCAL ESTRICTO ───
    let diaSeleccionadoIndex = -1;
    if (formData.dia) {
      const [y, m, d] = formData.dia.split('-');
      // Al usar new Date(año, mes, día) se obliga a usar la zona horaria local correcta
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      diaSeleccionadoIndex = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
    }

    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += intervalo) {
        const horaStr = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : m}`;
        const horaDB = `${horaStr}:00`;
        const isManana = h < 14;

        const esHoy = formData.dia === hoyCRString;
        const esHoraPasada = esHoy && (h < horaActual || (h === horaActual && m <= minutoActual));
        
        // Verificamos cómo está guardado en base de datos para ESE día específico
        const bloqueosDelDia = bloqueos.filter(b => b.dia_semana === diaSeleccionadoIndex);
        
        const estaBloqueadoTarde = bloqueosDelDia.some(b => b.hora_inicio <= horaDB && b.hora_fin > horaDB && b.hora_inicio !== b.hora_fin);
        const estaAbiertoManana = bloqueosDelDia.some(b => b.hora_inicio === horaDB && b.hora_fin === horaDB);

        let mostrarHora = false;

        // Si es de mañana, SOLO se muestra si el barbero lo abrió
        if (isManana) {
          if (estaAbiertoManana) mostrarHora = true;
        } 
        // Si es de tarde, se muestra SIEMPRE a menos que el barbero lo cerrara
        else {
          if (!estaBloqueadoTarde) mostrarHora = true;
        }

        if (mostrarHora && !horasOcupadas.includes(horaStr) && !esHoraPasada) {
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
    
    // Validación de seguridad extra
    if (formData.telefono.length !== 8) {
      alert("El número de teléfono debe tener exactamente 8 dígitos.");
      return;
    }

    setLoading(true);

    // DOUBLE CHECK: Seguridad antes de insertar
    const { data: checkData } = await supabase
      .from('citas')
      .select('id')
      .eq('fecha', formData.dia)
      .eq('hora', formData.hora)
      .neq('estado', 'Cancelada');

    if (checkData && checkData.length > 0) {
      alert("Lo sentimos, alguien acaba de reservar este espacio. Por favor elige otro horario.");
      setLoading(false);
      return;
    }

    // Insertar en base de datos y obtener el registro creado
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

    // CONFIGURACIÓN DE EMAILJS
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
      // Correo al Barbero
      await emailjs.send(
        'service_44y34g1', 
        'template_aw2t728', 
        templateParams,
        '2EEPT8Z3vdkbZzwSq' 
      );

      // Correo al Cliente
      await emailjs.send(
        'service_44y34g1', 
        'template_0x2ywka', 
        templateParams,
        '2EEPT8Z3vdkbZzwSq' 
      );
      
      setSuccess(true);
    } catch (emailError) {
      console.error('La cita se guardó, pero falló el correo:', emailError);
      setSuccess(true); 
    }

    setLoading(false);
  };

  // 4. PANTALLA DE ÉXITO MINIMALISTA
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

  // 5. FORMULARIO REDISEÑADO SIN DEGRADADOS Y CON SELECTS PREMIUM
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