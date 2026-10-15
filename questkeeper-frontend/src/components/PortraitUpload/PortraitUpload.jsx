import { useRef, useState } from "react";
import { getInitials } from "../../utils/characterSheet";
import { uploadPortrait, validatePortraitFile } from "../../utils/portraits";
import "./PortraitUpload.css";

// size="large": a big rounded square (the sheet's side panel); "tiny": a
// small coin beside the character's name on smaller screens.
// `characterId` names the saved file, so a companion passes its own (e.g.
// "<character id>-companion") to keep its picture separate from the
// character's. `uploadLabel` is what screen readers hear on the button.
function PortraitUpload({
  userId,
  characterId,
  name,
  portraitUrl,
  onUpload,
  size = "small",
  uploadLabel,
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validatePortraitFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsUploading(true);

    uploadPortrait(userId, characterId, file)
      .then((url) => {
        onUpload(url);
      })
      .catch((err) => {
        console.error("Failed to upload portrait:", err);
        setError("Upload failed. Please try again.");
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
        {portraitUrl ? (
          <img
            className="portrait-upload__image"
            src={portraitUrl}
            alt={`${name}'s portrait`}
          />
        ) : (
          <span className="portrait-upload__initials">{getInitials(name)}</span>
        )}
        <span className="portrait-upload__overlay">
          {isUploading ? "Uploading..." : "Edit"}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="portrait-upload__input"
        onChange={handleFileChange}
      />

      {error && <p className="portrait-upload__error">{error}</p>}
    </div>
  );
}

export default PortraitUpload;
