// src/components/booking/BookingWrapper.jsx
import { useState } from 'react';
import BookingForm from './BookingForm';

export default function BookingWrapper() {
  const [step, setStep] = useState('selection');
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    { id: 'Corte', name: 'Corte', duration: '1h' },
    { id: 'Barba', name: 'Barba', duration: '15min' },
    { id: 'Combo', name: 'Corte y Barba', duration: '1h' }
  ];

  return (
    <div className="booking-wrapper">
      {step === 'selection' ? (
        <div className="service-grid-script">
          {services.map((s) => (
            <div 
              key={s.id} 
              className="service-card-script"
              onClick={() => {
                setSelectedService(s);
                setStep('form');
              }}
            >
              <h4 className="script-title">{s.name}</h4>
              <p className="duration-script">{s.duration}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="form-container">
          <button onClick={() => setStep('selection')} className="back-btn">← Cambiar servicio</button>
          <BookingForm selectedService={selectedService.name} />
        </div>
      )}
    </div>
  );
}