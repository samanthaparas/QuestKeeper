import { useEffect, useId, useRef, useState } from "react";
import Button from "../Button/Button";
import { usePopupBehavior } from "../../hooks/usePopupBehavior";
import {
  MAX_ZOOM,
  cropToFile,
  frameStyle,
  moveFrame,
  startFrame,
  zoomFrame,
} from "../../utils/portraitCrop";
import "./PortraitCropper.css";

const PREVIEW_SIZE = 56;
const KEY_STEP = 12; // screen pixels per arrow press
const ZOOM_STEP = 0.25;

// "Frame your portrait": a pop-up for choosing which square part of a picture
// becomes the portrait. Drag (or use the arrow keys) to move it, the slider,
// a pinch or + and − to zoom. Two small previews show the round coin and the
// square, the shapes it appears in around QuestKeeper.
//
// src: the picture (a blob: URL). onConfirm(file): the framed square as a
// JPEG File. onCancel(): closed without saving. busy: saving is under way.
function PortraitCropper({ src, name = "", onConfirm, onCancel, busy = false, error = "" }) {
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const pointers = useRef(new Map()); // pointer id -> last position
  const pinchStart = useRef(null); // { distance, zoom }
  const [image, setImage] = useState(null); // { width, height }
  const [frame, setFrame] = useState(null);
  const [boxSize, setBoxSize] = useState(280);
  const [cropError, setCropError] = useState("");
  const titleId = useId();
  const hintId = useId();

  usePopupBehavior(true, onCancel);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  // The frame's size on screen, which the drag maths needs.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => stage.clientWidth && setBoxSize(stage.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  function handleLoad(event) {
    const loaded = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
    setImage(loaded);
    setFrame(startFrame(loaded));
  }

  function move(dx, dy) {
    if (image) setFrame((current) => moveFrame(image, current, dx, dy, boxSize));
  }

  function zoomTo(zoom) {
    if (image) setFrame((current) => zoomFrame(image, current, zoom));
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && frame) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: frame.zoom };
    }
  }

  function handlePointerMove(event) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size === 2 && pinchStart.current) {
      // Two fingers: zoom by how far apart they've moved.
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo(pinchStart.current.zoom * (distance / (pinchStart.current.distance || 1)));
    } else if (pointers.current.size === 1) {
      move(now.x - last.x, now.y - last.y);
    }
  }

  function handlePointerUp(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  function handleKeyDown(event) {
    const moves = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] };
    if (moves[event.key]) {
      event.preventDefault();
      move(...moves[event.key]);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(frame.zoom + ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomTo(frame.zoom - ZOOM_STEP);
    }
  }

  async function handleConfirm() {
    setCropError("");
    try {
      onConfirm(await cropToFile(imgRef.current, frame));
    } catch {
      setCropError("This picture couldn't be framed. Try a different one.");
    }
  }

  const ready = Boolean(image && frame);
  const shown = (size) => (ready ? frameStyle(image, frame, size) : { visibility: "hidden" });

  return (
    <dialog
      ref={dialogRef}
      className="portrait-cropper"
      aria-labelledby={titleId}
      // Esc closes it the same way Cancel does.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="portrait-cropper__panel">
        <h2 className="portrait-cropper__title" id={titleId}>
          Frame {name ? `${name}'s` : "your"} portrait
        </h2>
        <p className="portrait-cropper__hint" id={hintId}>
          Drag the picture to move it, and zoom in on the face. Arrow keys and + / − work too.
        </p>

        <div
          ref={stageRef}
          className="portrait-cropper__stage"
          tabIndex={0}
          role="group"
          aria-label="Portrait framing area"
          aria-describedby={hintId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={ready ? handleKeyDown : undefined}
        >
          <img
            ref={imgRef}
            className="portrait-cropper__image"
            src={src}
            alt=""
            draggable={false}
            onLoad={handleLoad}
            style={shown(boxSize)}
          />
          {/* The round coin the portrait also appears as. */}
          <span className="portrait-cropper__circle" aria-hidden="true" />
          {!ready && <span className="portrait-cropper__loading">Loading the picture…</span>}
        </div>

        <label className="portrait-cropper__zoom">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={frame?.zoom ?? 1}
            onChange={(event) => zoomTo(Number(event.target.value))}
            disabled={!ready}
          />
        </label>

        <div className="portrait-cropper__previews" aria-hidden="true">
          <span className="portrait-cropper__preview-label">Preview</span>
          {["round", "square"].map((shape) => (
            <span key={shape} className={`portrait-cropper__preview portrait-cropper__preview--${shape}`}>
              <img src={src} alt="" draggable={false} style={shown(PREVIEW_SIZE)} />
            </span>
          ))}
        </div>

        {(cropError || error) && <p className="portrait-cropper__error" role="alert">{cropError || error}</p>}

        <div className="portrait-cropper__actions">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!ready || busy}>
            {busy ? "Saving…" : "Use this"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default PortraitCropper;
