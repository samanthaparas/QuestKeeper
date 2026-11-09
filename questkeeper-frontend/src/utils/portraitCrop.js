// Framing a portrait before it's uploaded: which square part of the picture
// to keep. The player drags the picture and zooms; these functions do the
// maths, and cropToFile cuts the square out into a small JPEG.
//
// A "frame" is { zoom, centerX, centerY }: zoom 1 is the biggest square that
// fits in the picture, zoom 4 is a quarter of that across; the centre is in
// the picture's own pixels.

export const MAX_ZOOM = 4;
// Saved portraits are at most this many pixels across: big enough for the
// sheet and the pop-up, small enough to load fast at the table.
export const OUTPUT_SIZE = 640;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function clampZoom(zoom) {
  return clamp(Number.isFinite(zoom) ? zoom : 1, 1, MAX_ZOOM);
}

// The square the frame shows, in the picture's pixels: { x, y, side }. It
// never hangs off the picture's edges.
export function cropSquare({ width, height }, { zoom, centerX, centerY }) {
  const side = Math.min(width, height) / clampZoom(zoom);
  const x = clamp(centerX - side / 2, 0, width - side);
  const y = clamp(centerY - side / 2, 0, height - side);
  return { x, y, side };
}

// The same frame with its centre pulled back so the square stays on the
// picture (after a drag or a zoom out).
function settle(image, frame) {
  const zoom = clampZoom(frame.zoom);
  const { x, y, side } = cropSquare(image, { ...frame, zoom });
  return { zoom, centerX: x + side / 2, centerY: y + side / 2 };
}

// Where a new picture starts: all of it that fits, centred. A tall picture
// starts nearer the top, because that's where faces usually are.
export function startFrame({ width, height }) {
  const side = Math.min(width, height);
  return settle({ width, height }, {
    zoom: 1,
    centerX: width / 2,
    centerY: height > width ? Math.max(side / 2, height * 0.35) : height / 2,
  });
}

// Dragging moves the picture under the frame: dx and dy are how far the
// pointer moved on screen, boxSize how big the frame is on screen.
export function moveFrame(image, frame, dx, dy, boxSize) {
  const { side } = cropSquare(image, frame);
  const scale = side / boxSize;
  return settle(image, {
    ...frame,
    centerX: frame.centerX - dx * scale,
    centerY: frame.centerY - dy * scale,
  });
}

// Zooming keeps the same spot in the middle of the frame.
export function zoomFrame(image, frame, zoom) {
  return settle(image, { ...frame, zoom });
}

// How to draw the picture so the square fills a box of boxSize pixels:
// size and position for an <img> inside a box with overflow hidden.
export function frameStyle(image, frame, boxSize) {
  const { x, y, side } = cropSquare(image, frame);
  const scale = boxSize / side;
  return {
    width: `${image.width * scale}px`,
    height: `${image.height * scale}px`,
    transform: `translate(${-x * scale}px, ${-y * scale}px)`,
  };
}

// Cuts the framed square out of a loaded <img> as a JPEG File, at most
// OUTPUT_SIZE across (a small picture isn't blown up).
export async function cropToFile(img, frame, name = "portrait") {
  const image = { width: img.naturalWidth, height: img.naturalHeight };
  const { x, y, side } = cropSquare(image, frame);
  const size = Math.max(1, Math.round(Math.min(OUTPUT_SIZE, side)));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  // A white background, so see-through parts of a PNG don't turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(img, x, y, side, side, 0, 0, size, size);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("This picture couldn't be framed.");
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
