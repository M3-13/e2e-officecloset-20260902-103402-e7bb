import { useCallback, useEffect, useState } from "react";
import * as api from "../api";

export const CATEGORIES = ["Oberteil", "Hose", "Kleid", "Schuhe", "Accessoire"];

export const MAX_UPLOAD_MB = 5;

function apiBase() {
  try {
    return (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
      /\/+$/,
      "",
    );
  } catch {
    return "http://localhost:8000";
  }
}

export function absoluteImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  return `${apiBase()}${imageUrl}`;
}

function ItemImage({ imageUrl, name }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const full = absoluteImageUrl(imageUrl);
    if (!full) {
      setSrc(null);
      return undefined;
    }

    (async () => {
      try {
        const token = api.getToken();
        const response = await fetch(full, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setSrc(null);
          return;
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setSrc(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (src) {
    return (
      <img className="wp-card__img" src={src} alt={name || ""} loading="lazy" />
    );
  }

  return <div className="wp-card__img wp-card__img--placeholder" aria-hidden="true" />;
}

function ItemForm({ initial, busy, error, onCancel, onSave }) {
  const [name, setName] = useState(initial ? initial.name : "");
  const [category, setCategory] = useState(initial ? initial.category : CATEGORIES[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPick = (event) => {
    const chosen = event.target.files && event.target.files[0];
    setLocalError("");
    if (!chosen) {
      return;
    }
    if (chosen.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setLocalError(`Das Bild darf höchstens ${MAX_UPLOAD_MB} MB groß sein.`);
      setFile(null);
      event.target.value = "";
      return;
    }
    setFile(chosen);
  };

  const submit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Bitte gib einen Namen ein.");
      return;
    }
    setLocalError("");
    onSave({ name: trimmed, category, image: file || undefined });
  };

  const displayError = localError || error;

  return (
    <form className="wp-form" onSubmit={submit}>
      <div className="wp-field">
        <label className="wp-label" htmlFor="wp-name">
          Name
        </label>
        <input
          id="wp-name"
          className="input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Schwarzes Abendkleid"
          autoFocus
        />
      </div>

      <div className="wp-field">
        <label className="wp-label" htmlFor="wp-category">
          Kategorie
        </label>
        <select
          id="wp-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="wp-field">
        <span className="wp-label">Bild (optional)</span>
        <label className="wp-upload" htmlFor="wp-file">
          <input
            id="wp-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
          />
          {preview ? (
            <img className="wp-upload__preview" src={preview} alt="Vorschau" />
          ) : (
            <span className="wp-upload__hint">
              Bild auswählen (JPEG, PNG oder WebP, max. {MAX_UPLOAD_MB} MB)
            </span>
          )}
        </label>
      </div>

      {displayError ? (
        <p className="wp-error" role="alert">
          {displayError}
        </p>
      ) : null}

      <div className="wp-form__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Speichern …" : "Speichern"}
        </button>
      </div>
    </form>
  );
}

function ConfirmDialog({ message, busy, onCancel, onConfirm }) {
  return (
    <div className="wp-overlay" role="presentation">
      <div className="wp-modal" role="dialog" aria-modal="true">
        <h2 className="wp-modal__title">Wirklich löschen?</h2>
        <p className="wp-modal__text">{message}</p>
        <div className="wp-form__actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Löschen …" : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WardrobePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.listItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.message || "Die Garderobe konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = activeCategory
    ? items.filter((item) => item.category === activeCategory)
    : items;

  const openCreate = () => {
    setFormError("");
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (item) => {
    setFormError("");
    setCreating(false);
    setEditing(item);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setFormError("");
  };

  const handleSave = async (fields) => {
    setFormBusy(true);
    setFormError("");
    try {
      if (editing) {
        const updated = await api.updateItem(editing.id, fields);
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await api.createItem(fields);
        setItems((prev) => [...prev, created]);
      }
      closeForm();
    } catch (error) {
      setFormError(describeUploadError(error));
    } finally {
      setFormBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    setFormBusy(true);
    setFormError("");
    try {
      await api.deleteItem(deleting.id);
      setItems((prev) => prev.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (error) {
      setFormError(describeUploadError(error));
      setDeleting(null);
    } finally {
      setFormBusy(false);
    }
  };

  const formOpen = creating || Boolean(editing);

  return (
    <section className="wp">
      <style>{wpStyles}</style>

      <div className="wp-head">
        <h1>Garderobe</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Neues Stück
        </button>
      </div>

      <div className="wp-filters" role="group" aria-label="Nach Kategorie filtern">
        <button
          type="button"
          className={`wp-chip${activeCategory === null ? " wp-chip--active" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          Alle
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`wp-chip${activeCategory === cat ? " wp-chip--active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Wird geladen …</p>
      ) : loadError ? (
        <div className="wp-empty">
          <p className="wp-empty__text">{loadError}</p>
          <button type="button" className="btn btn-secondary" onClick={loadItems}>
            Erneut versuchen
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wp-empty">
          <p className="wp-empty__text">
            {items.length === 0
              ? "Deine Garderobe ist noch leer. Lege dein erstes Kleidungsstück an."
              : "Keine Kleidungsstücke in dieser Kategorie."}
          </p>
        </div>
      ) : (
        <div className="wp-grid">
          {filtered.map((item) => (
            <article key={item.id} className="card wp-card">
              <ItemImage imageUrl={item.image_url} name={item.name} />
              <div className="wp-card__body">
                <h2 className="wp-card__name">{item.name}</h2>
                <span className="wp-badge">{item.category}</span>
                <div className="wp-card__actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openEdit(item)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setDeleting(item)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="wp-overlay" role="presentation">
          <div className="wp-modal" role="dialog" aria-modal="true">
            <h2 className="wp-modal__title">
              {editing ? "Kleidungsstück bearbeiten" : "Neues Kleidungsstück"}
            </h2>
            <ItemForm
              initial={editing}
              busy={formBusy}
              error={formError}
              onCancel={closeForm}
              onSave={handleSave}
            />
          </div>
        </div>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          message={`„${deleting.name}“ wird dauerhaft gelöscht.`}
          busy={formBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </section>
  );
}

export function describeUploadError(error) {
  if (error && error.status === 413) {
    return `Das Bild ist zu groß. Es darf höchstens ${MAX_UPLOAD_MB} MB groß sein.`;
  }
  if (error && error.message) {
    return error.message;
  }
  return "Die Aktion konnte nicht ausgeführt werden.";
}

const wpStyles = `
.wp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.wp-head h1 { margin: 0; }

.wp-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}
.wp-chip {
  padding: 6px 16px;
  min-height: 36px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background-color: transparent;
  color: var(--color-muted);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background-color var(--transition-fast),
    border-color var(--transition-fast), color var(--transition-fast);
}
.wp-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-fg);
}
.wp-chip--active {
  background-color: rgba(212, 175, 55, 0.12);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.wp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
@media (min-width: 640px) {
  .wp-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1024px) {
  .wp-grid { grid-template-columns: repeat(4, 1fr); }
}

.wp-card { display: flex; flex-direction: column; padding: var(--space-3); }
.wp-card__img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background-color: var(--color-surface-alt);
  display: block;
}
.wp-card__img--placeholder {
  background-color: var(--color-surface-alt);
}
.wp-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding-top: var(--space-3);
}
.wp-card__name {
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
}
.wp-badge {
  background-color: rgba(212, 175, 55, 0.12);
  color: var(--color-accent);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.wp-card__actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  width: 100%;
  margin-top: var(--space-1);
}
.wp-card__actions .btn {
  padding: 8px 14px;
  min-height: 40px;
  font-size: 0.85rem;
}

.wp-empty {
  text-align: center;
  padding: var(--space-6) var(--space-4);
}
.wp-empty__text {
  color: var(--color-muted);
  max-width: 360px;
  margin: 0 auto var(--space-3);
}

.wp-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-3);
}
.wp-modal {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  max-width: 520px;
  width: 100%;
  padding: var(--space-4);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}
.wp-modal__title { margin: 0 0 var(--space-2); }
.wp-modal__text { color: var(--color-fg); margin: 0 0 var(--space-4); }

.wp-form { display: flex; flex-direction: column; gap: var(--space-3); }
.wp-field { display: flex; flex-direction: column; gap: var(--space-1); }
.wp-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-fg);
}
.wp-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background-color: #141014;
  cursor: pointer;
  text-align: center;
  transition: border-color var(--transition-fast);
}
.wp-upload:hover { border-color: var(--color-accent); }
.wp-upload input { display: none; }
.wp-upload__hint { color: var(--color-muted); font-size: 0.9rem; }
.wp-upload__preview {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}
.wp-error {
  color: var(--color-danger);
  font-size: 14px;
  padding: var(--space-0) 0;
  margin: 0;
}
.wp-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
`;
