import React from 'react';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p>
          &copy; {new Date().getFullYear()} SkillVault. Curated Computer Science, Software Development &amp; Data Skills.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
