import { useEffect } from "react";
import { Modal } from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Button.jsx";

export function PhotoLightbox({ photos, index, onChange, onClose }) {
  const photo = photos[index];

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") onChange((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, onChange, photos.length]);

  return (
    <Modal open onClose={onClose} title={photo?.label || `Photo ${index + 1} of ${photos.length}`}>
      {photo && (
        <div className="stay-lightbox">
          <img src={photo.url} alt={photo.label || `Homestay photo ${index + 1}`} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => onChange((index - 1 + photos.length) % photos.length)}>
              Previous photo
            </Button>
            <span className="text-small">{index + 1} / {photos.length}</span>
            <Button variant="ghost" onClick={() => onChange((index + 1) % photos.length)}>
              Next photo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
