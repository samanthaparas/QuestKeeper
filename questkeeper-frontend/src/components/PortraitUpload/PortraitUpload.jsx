import { useEffect, useRef, useState } from "react";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import PortraitCropper from "../PortraitCropper/PortraitCropper";
import { uploadPortrait, validatePortraitFile } from "../../utils/portraits";
import "./PortraitUpload.css";

// size="large": a big rounded square (the sheet's side panel); "tiny": a
// small coin beside the character's name on smaller screens.
// `characterId` names the saved file, so a companion passes its own (e.g.
// "<character id>-companion") to keep its picture separate from the
// character's. `uploadLabel` is what screen readers hear on the button.
//
// Picking a picture opens "Frame your portrait" first, so the face can be
// moved into the frame before anything is uploaded. "Adjust" reopens it on
// the current portrait (not on the tiny coin, where there's no room).
function PortraitUpload({
  userId,
  characterId,
  name,
  portraitUrl,
  character,
  onUpload,
  size = "small",
  uploadLabel,
}) {
  const fileInputRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(""); // a blob: URL while framing
  const [isUploading, setIsUploading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");
  const [cropError, setCropError] = useState("");

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
      setError("Couldn't open this portrait to adjust. Tap the picture to choose it again.");
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
    <div className={`portrait-upload${size === "small" ? "" : ` portrait-upload--${size}`}`}>
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

      {portraitUrl && size !== "tiny" && (
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
          onCancel={() => setCropSrc("")}
        />
      )}
    </div>
  );
}

export default PortraitUpload;
