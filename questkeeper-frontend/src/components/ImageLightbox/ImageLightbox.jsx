import { useEffect, useId, useRef, useState } from "react";
import "./ImageLightbox.css";
import { usePopupBehavior } from "../../hooks/usePopupBehavior";

// A picture you can tap to see big, in a pop-up over the page instead of a
// new tab, so nobody leaves the game. Close with ✕, Esc, or a tap outside
// the picture. "Open full size" is still there for zooming into a big map.
//
// src: the picture. alt: what it shows. caption: shown under the big one.
// className: for the small picture on the page.
function ImageLightbox({ src, alt, caption, className }) {
  const [isOpen, setIsOpen] = useState(false);
  // Page stays still behind it; the phone's Back closes it.
  usePopupBehavior(isOpen, () => setIsOpen(false));
  const dialogRef = useRef(null);
  const captionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="image-lightbox__trigger"
        aria-label={`Show ${alt} bigger`}
        onClick={() => setIsOpen(true)}
      >
        <img className={className} src={src} alt={alt} />
      </button>

      <dialog
        ref={dialogRef}
        className="image-lightbox"
        aria-labelledby={caption ? captionId : undefined}
        aria-label={caption ? undefined : alt}
        // Esc closes it the same way ✕ does.
        onCancel={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
        // A tap on the dimmed area (the dialog itself, not the picture) closes it.
        onClick={(event) => event.target === event.currentTarget && setIsOpen(false)}
      >
        {isOpen && (
          <figure className="image-lightbox__figure">
            <button
              type="button"
              className="image-lightbox__close"
              aria-label="Close picture"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
            <img className="image-lightbox__image" src={src} alt={alt} />
            <figcaption className="image-lightbox__caption">
              {caption && <span id={captionId}>{caption}</span>}
              <a href={src} target="_blank" rel="noopener noreferrer">
                Open full size
              </a>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}

export default ImageLightbox;
