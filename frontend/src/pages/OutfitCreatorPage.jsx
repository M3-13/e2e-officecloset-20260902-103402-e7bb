import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api";
import { resolveImageUrl } from "../image-utils";
import "./outfits.css";

export default function OutfitCreatorPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listItems();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err && err.message
              ? err.message
              : "Kleidungsstücke konnten nicht geladen werden.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );

  const toggleItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSave = name.trim().length > 0 && selectedIds.length > 0 && !saving;

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.createOutfit({ name: name.trim(), item_ids: selectedIds });
      navigate("/outfits");
    } catch (err) {
      setSaveError(
        err && err.message ? err.message : "Outfit konnte nicht gespeichert werden.",
      );
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Outfit-Creator</h1>
      <p className="muted">
        Kombiniere mehrere Kleidungsstücke zu einem Outfit und gib ihm einen Namen.
      </p>

      {loading && <p className="outfit-empty">Lädt Kleidungsstücke …</p>}

      {!loading && error && <p className="outfit-error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="outfit-empty">
          Du hast noch keine Kleidungsstücke. Lege zuerst welche in deiner{" "}
          <Link to="/">Garderobe</Link> an.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="outfit-creator">
          <div className="outfit-creator__select">
            <h2>Kleidungsstücke auswählen</h2>
            <p className="muted">
              {selectedItems.length} von {items.length} Teilen ausgewählt
            </p>
            <div className="outfit-grid" role="group" aria-label="Kleidungsstücke">
              {items.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`outfit-item${selected ? " outfit-item--selected" : ""}`}
                    onClick={() => toggleItem(item.id)}
                    aria-pressed={selected}
                  >
                    <span className="outfit-item__thumb">
                      {item.image_url ? (
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </span>
                    <span className="outfit-item__name">{item.name}</span>
                    <span className="outfit-item__category">{item.category}</span>
                    {selected && (
                      <span className="outfit-item__check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="outfit-creator__preview">
            <h2>Vorschau</h2>
            {selectedItems.length === 0 ? (
              <p className="muted">Noch keine Teile ausgewählt.</p>
            ) : (
              <div className="outfit-preview__list">
                {selectedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="outfit-item"
                    onClick={() => toggleItem(item.id)}
                    aria-label={`${item.name} entfernen`}
                  >
                    <span className="outfit-item__thumb">
                      {item.image_url ? (
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </span>
                    <span className="outfit-item__name">{item.name}</span>
                    <span className="outfit-item__category">{item.category}</span>
                  </button>
                ))}
              </div>
            )}

            <form className="outfit-form" onSubmit={handleSave}>
              <label className="outfit-form__label" htmlFor="outfit-name">
                Name des Outfits
              </label>
              <input
                id="outfit-name"
                className="input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Abend-Gala"
              />
              {saveError && <p className="outfit-error">{saveError}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSave}
              >
                {saving ? "Speichern …" : "Outfit speichern"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
