import { getBannerInfo } from "../../utils/redesignArt";
import "./PageBanner.css";

// The picture-and-heading band at the top of a page. The picture is decoration
// (it has no text of its own, and a dark wash sits between it and the words),
// so the heading, the small line above it and anything passed as children are
// real HTML. `art` is one of the banner names in utils/redesignArt.js.
// Children usually hold a short description (use className "page-banner__description"
// on it and "page-banner__link" on a link inside it).
function PageBanner({ art, eyebrow, title, children = null, className = "" }) {
  const banner = getBannerInfo(art);
  return (
    <header className={`page-banner ${className}`.trim()}>
      <img
        className="page-banner__art"
        src={banner?.src}
        srcSet={banner?.srcSet}
        sizes={`(min-width: ${banner?.artWidth ?? 1086}px) ${banner?.artWidth ?? 1086}px, 100vw`}
        alt=""
        width={banner?.width}
        height={banner?.height}
        style={{ objectPosition: banner?.focus, "--banner-art-width": `${banner?.artWidth ?? 1086}px` }}
      />
      <div className="page-banner__text">
        {eyebrow && <p className="page-banner__eyebrow">{eyebrow}</p>}
        <h1 className="page-banner__title">{title}</h1>
        {children}
      </div>
    </header>
  );
}

export default PageBanner;
