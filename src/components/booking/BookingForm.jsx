import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

export default function BookingForm({ selectedService }) {
  const [formData, setFormData] = useState({ dia: '', hora: '', nombre: '', apellido: '', email: '', telefono: '' });
  const [listaDias, setListaDias] = useState([]);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Generar días
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      const textoDia = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const valorDB = fecha.toISOString().split('T')[0]; 
      dias.push({ texto: textoDia, valor: valorDB });
    }
    setListaDias(dias);

    // 2. Cargar bloqueos fijos
    const fetchBloqueos = async () => {
      const { data } = await supabase.from('horarios_bloqueados').select('*');
      setBloqueos(data || []);
    };
    fetchBloqueos();
  }, []);

  useEffect(() => {
    if (formData.dia) {
      const fetchCitas = async () => {
        const { data } = await supabase.from('citas').select('hora').eq('fecha', formData.dia);
        setHorasOcupadas(data ? data.map(c => c.hora.substring(0, 5)) : []);
      };
      fetchCitas();
    }
  }, [formData.dia]);

  const generarHoras = () => {
    const horas = [];
    const ahora = new Date();
    const horaActualCR = ahora.getHours();
    const minutoActualCR = ahora.getMinutes();
    const intervalo = selectedService === 'Barba' ? 30 : 60;
    
    // Obtener día de la semana para los bloqueos (0 = Domingo)
    const diaSeleccionadoIndex = formData.dia ? new Date(formData.dia).getDay() : -1;

    for (let h = 14; h < 20; h++) {
      for (let m = 0; m < 60; m += intervalo) {
        const horaStr = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : m}`;
        const horaFull = `${horaStr}:00`;

        // Filtros
        const esHoy = formData.dia === new Date().toISOString().split('T')[0];
        const esHoraPasada = esHoy && (h < horaActualCR || (h === horaActualCR && m <= minutoActualCR));
        
        // Check de bloqueos programados
        const estaBloqueado = bloqueos.some(b => 
          b.dia_semana === diaSeleccionadoIndex && 
          horaFull >= b.hora_inicio && 
          horaFull < b.hora_fin
        );
        
        if (!horasOcupadas.includes(horaStr) && !esHoraPasada && !estaBloqueado) {
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
    setLoading(true);
    const { error } = await supabase.from('citas').insert([{
      fecha: formData.dia, hora: formData.hora, cliente_nombre: formData.nombre,
      apellido: formData.apellido, email: formData.email, telefono: formData.telefono,
      servicio: selectedService || 'Corte', precio: 0, estado: 'pendiente'
    }]);
    setLoading(false);
    if (!error) setSuccess(true);
    else alert("Error: " + error.message);
  };

  if (success) {
    return (
      <div className="success-msg" style={{ textAlign: 'center', color: 'var(--gold)', padding: '2rem', background: '#000', borderRadius: '10px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '1rem' }}>¡Cita reservada con éxito!</h2>
        <p style={{ marginBottom: '1.5rem' }}>Te esperamos en Aragon BarberShop.</p>
        <a 
          href="https://www.google.com/maps/search/?api=1&query=10.08332,-84.32151" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: '#000',
            padding: '0.8rem 1.5rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          Ver ubicación en Maps
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="booking-form-elegant">
      <div className="form-group">
        <label>Día</label>
        <select onChange={(e) => setFormData({...formData, dia: e.target.value})} required>
          <option value="">Selecciona un día</option>
          {listaDias.map(dia => <option key={dia.valor} value={dia.valor}>{dia.texto}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Hora</label>
        <select onChange={(e) => setFormData({...formData, hora: e.target.value})} required>
          <option value="">Selecciona una hora</option>
          {generarHoras().map(h => <option key={h.valor} value={h.valor}>{h.texto}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Nombre</label>
        <input type="text" onChange={e => setFormData({...formData, nombre: e.target.value})} required />
      </div>

      <div className="form-group">
        <label>Apellido</label>
        <input type="text" onChange={e => setFormData({...formData, apellido: e.target.value})} required />
      </div>

      <div className="form-group">
        <label>Teléfono</label>
        <input type="tel" onChange={e => setFormData({...formData, telefono: e.target.value})} required />
      </div>

      <div className="form-group">
        <label>Correo Electrónico</label>
        <input type="email" onChange={e => setFormData({...formData, email: e.target.value})} required />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Procesando...' : 'Reservar Cita'}
      </button>
    </form>
  );
}