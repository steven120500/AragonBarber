import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

export default function BookingForm({ selectedService }) {
  const [formData, setFormData] = useState({ dia: '', hora: '', nombre: '', apellido: '', email: '' });
  const [listaDias, setListaDias] = useState([]);
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Generar los próximos 7 días (Texto para el usuario, Valor para Supabase)
  useEffect(() => {
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      
      const textoDia = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const valorDB = fecha.toISOString().split('T')[0]; 
      
      dias.push({ texto: textoDia, valor: valorDB });
    }
    setListaDias(dias);
  }, []);

  // 2. Cargar citas ocupadas para el día seleccionado
  useEffect(() => {
    if (formData.dia) {
      const fetchCitas = async () => {
        const { data } = await supabase
          .from('citas')
          .select('hora')
          .eq('fecha', formData.dia);
        
        // Extraemos solo "14:00" de "14:00:00" para poder comparar
        setHorasOcupadas(data ? data.map(c => c.hora.substring(0, 5)) : []);
      };
      fetchCitas();
    }
  }, [formData.dia]);

  // 3. Generar horas según intervalo (30min Barba, 60min Corte/Combo)
  const generarHoras = () => {
    const horas = [];
    const intervalo = selectedService === 'Barba' ? 30 : 60;
    for (let h = 14; h < 20; h++) {
      for (let m = 0; m < 60; m += intervalo) {
        const horaStr = `${h}:${m === 0 ? '00' : m}`;
        if (!horasOcupadas.includes(horaStr)) horas.push(horaStr);
      }
    }
    return horas;
  };

  // 4. Envío a Supabase (con parche para campos obligatorios)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('citas').insert([{
      fecha: formData.dia,
      hora: formData.hora,
      cliente_nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      servicio: selectedService || 'Corte',
      precio: 0,             // Cumple con restricción Not Null
      estado: 'pendiente'    // Cumple con restricción Not Null
    }]);

    setLoading(false);
    if (!error) {
      setSuccess(true);
    } else {
      console.error("Error en Supabase:", error);
      alert("Error al reservar: " + error.message);
    }
  };

  // 5. Estado de Éxito
  if (success) {
    return (
      <div className="success-msg" style={{ textAlign: 'center', color: 'var(--gold)', padding: '2rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '1rem' }}>
          ¡Cita reservada con éxito!
        </h2>
        <p>Te esperamos en Aragon BarberShop.</p>
      </div>
    );
  }

  // 6. Render del Formulario
  return (
    <form onSubmit={handleSubmit} className="booking-form-elegant">
      <div className="form-group">
        <label>Día</label>
        <select onChange={(e) => setFormData({...formData, dia: e.target.value})} required>
          <option value="">Selecciona un día</option>
          {listaDias.map(dia => (
            <option key={dia.valor} value={dia.valor}>{dia.texto}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Hora</label>
        <select onChange={(e) => setFormData({...formData, hora: e.target.value})} required>
          <option value="">Selecciona una hora</option>
          {generarHoras().map(h => <option key={h} value={h}>{h}</option>)}
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
        <label>Correo Electrónico</label>
        <input type="email" onChange={e => setFormData({...formData, email: e.target.value})} required />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Procesando...' : 'Reservar Cita'}
      </button>
    </form>
  );
}