import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <h3 className="footer__title">QuestKeeper</h3>

      <p className="footer__tagline">Where Heroes Find Answers </p>

      <p className="footer__feedback">
        Spot something wrong or missing?{" "}
        <a
          className="footer__link"
          href="https://github.com/samanthaparas/QuestKeeper/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tell us
        </a>
      </p>

      <p className="footer__copyright">© 2026 QuestKeeper</p>
    </footer>
  );
}

export default Footer;
