import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function CancelarCita() {
  const [searchParams] = useSearchParams();
  const citaId = searchParams.get('id');
  const navigate = useNavigate();
  
  // Nuevos estados: cargando -> confirmando -> procesando -> exito | error
  const [estado, setEstado] = useState('cargando'); 

  useEffect(() => {
    // Si no hay ID en la URL, error directo
    if (!citaId) {
      setEstado('error');
      return;
    }

    const verificarCita = async () => {
      // 1. Solo verificamos que exista, no la cancelamos todavía
      const { data: citaActual, error: errorFetch } = await supabase
        .from('citas')
        .select('estado')
        .eq('id', citaId)
        .single();

      if (errorFetch || !citaActual) {
        setEstado('error');
        return;
      }

      if (citaActual.estado === 'Cancelada') {
        // Si ya estaba cancelada de antes, mostramos éxito
        setEstado('exito');
      } else {
        // Si está pendiente, le preguntamos si quiere cancelar
        setEstado('confirmando');
      }
    };

    verificarCita();
  }, [citaId]);

  // Función que se ejecuta SOLO si el cliente hace clic en "Sí, cancelar"
  const ejecutarCancelacion = async () => {
    setEstado('procesando');

    const { error: errorUpdate } = await supabase
      .from('citas')
      .update({ estado: 'Cancelada' })
      .eq('id', citaId);

    if (errorUpdate) {
      setEstado('error');
    } else {
      setEstado('exito');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#fff', textAlign: 'center' }}>
      <div style={{ background: '#0a0a0a', padding: '3rem', borderRadius: '12px', border: '1px solid #222', maxWidth: '500px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        
        {/* PANTALLA 1: BUSCANDO EN BASE DE DATOS */}
        {(estado === 'cargando' || estado === 'procesando') && (
          <div style={{ animation: 'pulse 1.5s infinite' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)', fontSize: '2rem', marginBottom: '1rem' }}>
              {estado === 'cargando' ? 'Verificando...' : 'Cancelando...'}
            </h2>
            <p style={{ color: 'var(--grey)' }}>
              {estado === 'cargando' ? 'Buscando tu reserva en el sistema.' : 'Procesando tu solicitud.'}
            </p>
          </div>
        )}

        {/* PANTALLA 2: PREGUNTA DE CONFIRMACIÓN */}
        {estado === 'confirmando' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
             <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 'bold' }}>
              ?
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '2.2rem', margin: '0 0 1rem 0' }}>¿Cancelar tu cita?</h2>
            <p style={{ color: 'var(--grey)', marginBottom: '2.5rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Estás a punto de cancelar tu reserva en Aragon Barber Studio. El espacio quedará disponible para otra persona. ¿Deseas continuar?
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <button onClick={ejecutarCancelacion} style={{ background: '#ff4444', color: '#fff', padding: '1rem 2rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%' }}>
                Sí, cancelar mi cita
              </button>
              <button onClick={() => navigate('/')} style={{ background: 'transparent', color: 'var(--cream)', border: '1px solid #333', padding: '1rem 2rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%' }}>
                No, mantener mi espacio
              </button>
            </div>
          </div>
        )}

        {/* PANTALLA 3: ÉXITO */}
        {estado === 'exito' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✓</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#ff4444', fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Cita Cancelada</h2>
            <p style={{ color: 'var(--grey)', marginBottom: '2.5rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Tu reserva ha sido cancelada exitosamente y el espacio ha sido liberado en nuestra agenda. Esperamos verte pronto.
            </p>
            <button onClick={() => navigate('/')} style={{ background: 'var(--gold)', color: '#000', padding: '1rem 2rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%' }}>
              Volver al inicio
            </button>
          </div>
        )}

        {/* PANTALLA 4: ERROR DE ENLACE */}
        {estado === 'error' && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '2rem', margin: '0 0 1rem 0' }}>Enlace no válido</h2>
            <p style={{ color: 'var(--grey)', marginBottom: '2.5rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              No pudimos procesar tu solicitud. Es posible que el enlace haya expirado o que la cita no exista.
            </p>
            <button onClick={() => navigate('/')} style={{ background: '#111', color: 'var(--cream)', border: '1px solid #333', padding: '1rem 2rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%' }}>
              Volver al inicio
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}