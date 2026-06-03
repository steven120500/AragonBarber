export default function Footer() {
  return (
    <footer style={{ background: '#050505', paddingTop: '5rem', paddingBottom: '2rem', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>

        {/* Marca y Eslogan */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'var(--cream)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
            ARAGON<span style={{ color: 'var(--gold)' }}> BARBER STUDIO</span>
          </h2>
          <p style={{ color: 'var(--grey)', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
            El estilo siempre primero
          </p>
        </div>

        {/* Botones Sociales Premium */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
          <a href="AQUI_LINK_FACEBOOK" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </a>
          <a href="http://instagram.com/aragon_barber_studio/" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
          <a href="https://wa.me/50683678788" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </a>
        </div>

        {/* Divisor Elegante */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #333, transparent)', width: '100%', marginBottom: '2rem' }}></div>

        {/* Sección Inferior (Copyright y Créditos) */}
        <div className="footer-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', fontSize: '0.7rem', color: '#666', letterSpacing: '0.1em' }}>
          <p style={{ margin: 0 }}>© 2026 ARAGON BARBER STUDIO. TODOS LOS DERECHOS RESERVADOS.</p>
          <p style={{ margin: 0 }}>
            DESARROLLADO POR <a href="https://wa.me/50688028216" target="_blank" rel="noopener noreferrer" className="dev-link">STEVEN CORRALES ALFARO</a>
          </p>
        </div>
      </div>

      {/* Animaciones y Media Queries inyectadas */}
      <style>{`
        .social-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #111;
          border: 1px solid #333;
          color: var(--cream);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .social-icon-btn svg {
          width: 20px;
          height: 20px;
        }
        .social-icon-btn:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: #1a1a1a;
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(212, 175, 55, 0.15);
        }
        .dev-link {
          color: var(--gold);
          text-decoration: none;
          font-weight: bold;
          transition: color 0.3s ease;
        }
        .dev-link:hover {
          color: var(--cream);
        }

        /* En pantallas grandes (PC), alinea el texto abajo en una sola fila */
        @media (min-width: 768px) {
          .footer-bottom {
            flex-direction: row !important;
            justify-content: space-between !important;
          }
        }
      `}</style>
    </footer>
  );
}