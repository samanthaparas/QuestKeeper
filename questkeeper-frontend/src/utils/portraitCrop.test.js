import { describe, it, expect } from "vitest";
import { MAX_ZOOM, cropSquare, frameStyle, moveFrame, startFrame, zoomFrame } from "./portraitCrop";

const wide = { width: 2000, height: 1000 };
const tall = { width: 1000, height: 2000 };

describe("framing a portrait", () => {
  it("starts with the biggest square that fits, centred on a wide picture", () => {
    expect(cropSquare(wide, startFrame(wide))).toEqual({ x: 500, y: 0, side: 1000 });
  });

  it("starts nearer the top of a tall picture, where faces usually are", () => {
    const square = cropSquare(tall, startFrame(tall));
    expect(square.side).toBe(1000);
    expect(square.y).toBe(200); // not 500, the middle
  });

  it("zooming in keeps the same spot in the middle", () => {
    const frame = zoomFrame(wide, startFrame(wide), 2);
    expect(cropSquare(wide, frame)).toEqual({ x: 750, y: 250, side: 500 });
  });

  it("won't zoom past the limits", () => {
    expect(zoomFrame(wide, startFrame(wide), 10).zoom).toBe(MAX_ZOOM);
    expect(zoomFrame(wide, startFrame(wide), 0.2).zoom).toBe(1);
  });

  it("dragging moves the picture the way the finger goes", () => {
    // The frame is 250px on screen and shows 1000 picture pixels: 4 per screen pixel.
    // Dragging the picture right by 50px shows 200 picture pixels further left.
    const moved = moveFrame(wide, startFrame(wide), 50, 0, 250);
    expect(cropSquare(wide, moved).x).toBe(300);
  });

  it("never lets the square hang off the picture's edge", () => {
    const moved = moveFrame(wide, startFrame(wide), 5000, 5000, 250);
    expect(cropSquare(wide, moved)).toEqual({ x: 0, y: 0, side: 1000 });
  });

  it("works out how to draw the picture so the square fills the box", () => {
    expect(frameStyle(wide, startFrame(wide), 250)).toEqual({
      width: "500px",
      height: "250px",
      transform: "translate(-125px, 0px)",
    });
  });
});
