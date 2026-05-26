import { supabase } from './supabaseClient';

export const appointmentsApi = {
  async create(appointmentData) {
    const { data, error } = await supabase
      .from('citas')
      .insert([
        {
          cliente_nombre: appointmentData.clienteNombre,
          servicio: appointmentData.servicio,
          fecha: appointmentData.fecha,
          hora: appointmentData.hora,
          precio: appointmentData.precio,
          estado: 'pendiente'
        }
      ]); // Quitamos .select()

    if (error) {
      console.error("Error técnico de Supabase:", error);
      throw error;
    }
    return data;
  }
};