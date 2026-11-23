import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import PortraitCropper from "../PortraitCropper/PortraitCropper";
import { uploadPortrait, validatePortraitFile } from "../../utils/portraits";
import "./PortraitUpload.css";
import "../ImageLightbox/ImageLightbox.css";
import { usePopupBehavior } from "../../hooks/usePopupBehavior";

// size="large": a big rounded square (the sheet's side panel); "tiny": a
// small coin beside the character's name on smaller screens.
// `characterId` names the saved file, so a companion passes its own (e.g.
// "<character id>-companion") to keep its picture separate from the
// character's. `uploadLabel` is what screen readers hear on the button.
//
// Picking a picture opens "Frame your portrait" first, so the face can be
// moved into the frame before anything is uploaded. "Adjust" reopens it on
// the current portrait (not on the tiny coin, where there's no room).
//
// withMenu (the character sheet's big portrait): instead of the picture
// opening the file chooser and a separate "Adjust" link, an "Edit" button
// on the picture opens a small menu: View larger, Adjust framing, Upload new
// image. Opening the menu changes nothing and never opens the file chooser
// by itself; each choice uses the same framing, upload and saving as
// before, and cancelling keeps the saved portrait. With no picture yet
// there's nothing to view or reframe, so the picture just offers Upload.
// On the tiny coin (phones) there's no room for an Edit button on the
// picture, so the coin itself opens the same menu, with a small pencil on
// its edge to show it can be changed.
const MENU_ICONS = {
  view: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  adjust: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
};

function MenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={MENU_ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PortraitUpload({
  userId,
  characterId,
  name,
  portraitUrl,
  character,
  onUpload,
  size = "small",
  uploadLabel,
  withMenu = false,
}) {
  const fileInputRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(""); // a blob: URL while framing
  const [isUploading, setIsUploading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");
  const [cropError, setCropError] = useState("");

  // The Edit menu and the "View larger" viewer (withMenu only).
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const viewerRef = useRef(null);
  const hasMenu = withMenu && Boolean(portraitUrl);
  const isCoinMenu = hasMenu && size === "tiny";
  // While the viewer is open the page stays still, and the phone's Back
  // closes it (as with the other picture viewers).
  usePopupBehavior(viewerOpen, () => closeViewer());
  const who = name ? `${name}'s` : "the";

  // Opens below the picture, or above it when there isn't room below.
  useLayoutEffect(() => {
    if (!menuOpen || !menuRef.current || !menuButtonRef.current) return;
    const button = menuButtonRef.current.getBoundingClientRect();
    const height = menuRef.current.getBoundingClientRect().height;
    setMenuAbove(button.bottom + height + 8 > window.innerHeight && button.top - height - 8 > 0);
    menuRef.current.querySelector('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  // A tap or click anywhere else closes the menu.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function handlePointer(event) {
      if (!menuRef.current?.contains(event.target) && !menuButtonRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [menuOpen]);

  // The viewer is a real modal dialog (focus stays in it, Escape closes it).
  useEffect(() => {
    const dialog = viewerRef.current;
    if (!dialog) return;
    if (viewerOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
  }, [viewerOpen]);

  function closeMenu({ refocus = true } = {}) {
    setMenuOpen(false);
    if (refocus) menuButtonRef.current?.focus();
  }

  function handleMenuKeyDown(event) {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])];
    const at = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setMenuOpen(false);
    }
  }

  function closeViewer() {
    viewerRef.current?.close?.();
    viewerRef.current?.removeAttribute("open");
    setViewerOpen(false);
    menuButtonRef.current?.focus();
  }

  // The blob: URL holds the picture in memory; let it go once it's done with.
  useEffect(() => () => cropSrc && URL.revokeObjectURL(cropSrc), [cropSrc]);

  function handleFileChange(e) {
    const chosen = e.target.files[0];
    e.target.value = "";
    if (!chosen) return;
    if (!chosen.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setCropError("");
    setCropSrc(URL.createObjectURL(chosen));
  }

  // Reframe the portrait already saved, without finding the file again.
  async function handleAdjust() {
    setError("");
    setCropError("");
    setIsOpening(true);
    try {
      const response = await fetch(portraitUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setCropSrc(URL.createObjectURL(await response.blob()));
    } catch {
      setError(
        hasMenu
          ? "Couldn't open this portrait to adjust. Choose Upload new image to pick it again."
          : "Couldn't open this portrait to adjust. Tap the picture to choose it again.",
      );
    } finally {
      setIsOpening(false);
    }
  }

  function handleConfirm(file) {
    // The framed square is small already, so it easily fits the size limit.
    const validationError = validatePortraitFile(file);
    if (validationError) {
      setCropError(validationError);
      return;
    }
    setCropError("");
    setIsUploading(true);
    uploadPortrait(userId, characterId, file)
      .then((url) => {
        onUpload(url);
        setCropSrc("");
      })
      .catch((err) => {
        console.error("Failed to upload portrait:", err);
        setCropError("Upload failed. Please try again.");
      })
      .finally(() => setIsUploading(false));
  }

  return (
    <div
      className={`portrait-upload${size === "small" ? "" : ` portrait-upload--${size}`}${
        hasMenu ? " portrait-upload--with-menu" : ""
      }`}
    >
      {isCoinMenu ? (
        // The coin is the menu button; the pencil badge says it's editable.
        <button
          ref={menuButtonRef}
          type="button"
          className="portrait-upload__frame portrait-upload__coin-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? `${characterId}-portrait-menu` : undefined}
          aria-label={`Edit ${who} portrait`}
          disabled={isUploading || isOpening}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <CharacterAvatar character={character} name={name} portraitUrl={portraitUrl} />
          {(isUploading || isOpening) && (
            <span className="portrait-upload__overlay portrait-upload__overlay--busy">…</span>
          )}
          <span className="portrait-upload__coin-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
              <path
                d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      ) : hasMenu ? (
        // The picture itself, with its Edit menu button on it.
        <div className="portrait-upload__frame portrait-upload__frame--static">
          <CharacterAvatar character={character} name={name} portraitUrl={portraitUrl} decorative={false} />
          <button
            ref={menuButtonRef}
            type="button"
            className="portrait-upload__menu-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? `${characterId}-portrait-menu` : undefined}
            aria-label={`Edit ${who} portrait`}
            disabled={isUploading || isOpening}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {isUploading ? "Uploading…" : isOpening ? "Opening…" : "Edit"}
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="portrait-upload__frame"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label={uploadLabel ?? (portraitUrl ? "Change portrait" : "Upload portrait")}
        >
          <CharacterAvatar character={character} name={name} portraitUrl={portraitUrl} decorative={false} />
          <span className="portrait-upload__overlay">
            {isUploading ? "Uploading..." : "Edit"}
          </span>
        </button>
      )}

      {/* The menu sits outside the picture's frame, which clips what spills over. */}
      {menuOpen && (
        <div
          ref={menuRef}
          id={`${characterId}-portrait-menu`}
          role="menu"
          aria-label={`${name ? `${name}'s` : "Portrait"} portrait`}
          className={`portrait-upload__menu${menuAbove ? " portrait-upload__menu--above" : ""}${
            isCoinMenu ? " portrait-upload__menu--coin" : ""
          }`}
          onKeyDown={handleMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setViewerOpen(true);
            }}
          >
            <MenuIcon name="view" /> View larger
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu({ refocus: false });
              handleAdjust();
            }}
          >
            <MenuIcon name="adjust" /> Adjust framing
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu({ refocus: false });
              // Only on this choice does the file chooser open.
              fileInputRef.current?.click();
            }}
          >
            <MenuIcon name="upload" /> Upload new image
          </button>
        </div>
      )}

      {/* "View larger": the picture big, in a dialog. Nothing can be changed here. */}
      {hasMenu && viewerOpen && (
        // The same look as the app's other picture viewers (ImageLightbox).
        <dialog
          ref={viewerRef}
          className="image-lightbox"
          aria-label={`${name ? `${name}'s` : "The"} portrait`}
          onCancel={(event) => {
            event.preventDefault();
            closeViewer();
          }}
          onClick={(event) => {
            // A tap on the dim area around the picture closes it.
            if (event.target === viewerRef.current) closeViewer();
          }}
        >
          <figure className="image-lightbox__figure">
            <button type="button" className="image-lightbox__close" aria-label="Close" onClick={closeViewer}>
              ✕
            </button>
            <img className="image-lightbox__image" src={portraitUrl} alt={`${name ? `${name}'s` : "The"} portrait`} />
          </figure>
        </dialog>
      )}

      {portraitUrl && size !== "tiny" && !withMenu && (
        <button
          type="button"
          className="portrait-upload__adjust"
          onClick={handleAdjust}
          disabled={isOpening || isUploading}
          aria-label={`Adjust how ${name ? `${name}'s` : "the"} portrait is framed`}
        >
          {isOpening ? "Opening…" : "Adjust"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="portrait-upload__input"
        // The picture button above opens this, so it isn't a separate
        // (invisible) stop when tabbing through the page.
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {error && <p className="portrait-upload__error">{error}</p>}

      {cropSrc && (
        <PortraitCropper
          src={cropSrc}
          name={name}
          busy={isUploading}
          error={cropError}
          onConfirm={handleConfirm}
          onCancel={() => {
            setCropSrc("");
            // Back to the Edit button, with the saved portrait unchanged.
            if (hasMenu) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}

export default PortraitUpload;
