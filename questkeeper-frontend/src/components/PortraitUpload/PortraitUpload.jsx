import { useRef, useState } from "react";
import { getInitials } from "../../utils/characterSheet";
import { uploadPortrait, validatePortraitFile } from "../../utils/portraits";
import "./PortraitUpload.css";

function PortraitUpload({ userId, characterId, name, portraitUrl, onUpload }) {
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
    <div className="portrait-upload">
      <button
        type="button"
        className="portrait-upload__frame"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={portraitUrl ? "Change portrait" : "Upload portrait"}
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
