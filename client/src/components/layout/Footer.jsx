import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p>
          &copy; {new Date().getFullYear()} SkillVault. Digital Learning Classroom &amp; Curated Knowledge Platform.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
