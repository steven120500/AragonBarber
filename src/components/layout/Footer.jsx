export default function Footer() {
    return (
      <footer className="footer-centered">
        <div className="footer-top-centered">
          {/* Logo Centrado */}
          <div className="footer-divider"></div>
  
          {/* Botones Sociales */}
          <div className="social-buttons">
            <a href="AQUI_LINK_FACEBOOK" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a href="https://www.instagram.com/aragon_bart_stil/" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
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
        </div>
  
        <div className="footer-divider"></div>
  
        <div className="footer-bottom-flex">
          <p className="footer-copy">© 2026 ARAGON BARBER. TODOS LOS DERECHOS RESERVADOS.</p>
          <p className="footer-dev">
            DESARROLLADO POR <a href="https://wa.me/50688028216" target="_blank" rel="noopener noreferrer" className="dev-link">STEVEN CORRALES ALFARO</a>
          </p>
        </div>
      </footer>
    );
  }