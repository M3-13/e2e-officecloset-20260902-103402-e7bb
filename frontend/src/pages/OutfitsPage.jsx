import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api";
import { resolveImageUrl } from "../image-utils";
import "./outfits.css";

function Thumb({ item }) {
  if (item.image_url) {
    return (
      <img
        className="outfit-card__thumb"
        src={resolveImageUrl(item.image_url)}
        alt={item.name}
        loading="lazy"
      />
    );
  }
  return (
    <span className="outfit-card__thumb outfit-card__thumb--placeholder" aria-hidden="true">
      —
    </span>
  );
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [active, setActive] = useState(null);
  const [mode, setMode] = useState("view");
  const [items, setItems] = useState([]);
  const [editName, setEditName] = useState("");
  const [editIds, setEditIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchOutfits = async () => {
    const data = await api.listOutfits();
    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listOutfits();
        if (!cancelled) {
          setOutfits(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err && err.message ? err.message : "Outfits konnten nicht geladen werden.",
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

  const openOutfit = (outfit) => {
    setActive(outfit);
    setMode("view");
    setActionError(null);
  };

  const backToList = () => {
    setActive(null);
    setMode("view");
    setActionError(null);
  };

  const startEdit = async () => {
    setMode("edit");
    setEditName(active.name);
    setEditIds(active.items.map((item) => item.id));
    setActionError(null);
    if (items.length === 0) {
      try {
        const data = await api.listItems();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setActionError(
          err && err.message
            ? err.message
            : "Kleidungsstücke konnten nicht geladen werden.",
        );
      }
    }
  };

  const toggleEditItem = (id) => {
    setEditIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSaveEdit = editName.trim().length > 0 && editIds.length > 0 && !saving;

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!canSaveEdit) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.updateOutfit(active.id, {
        name: editName.trim(),
        item_ids: editIds,
      });
      const data = await fetchOutfits();
      setOutfits(data);
      setActive(null);
      setMode("view");
    } catch (err) {
      setActionError(
        err && err.message ? err.message : "Outfit konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Outfit „${active.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.deleteOutfit(active.id);
      setOutfits((prev) => prev.filter((outfit) => outfit.id !== active.id));
      setActive(null);
      setMode("view");
    } catch (err) {
      setActionError(
        err && err.message ? err.message : "Outfit konnte nicht gelöscht werden.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Outfits</h1>

      {loading && <p className="outfit-empty">Lädt Outfits …</p>}

      {!loading && error && <p className="outfit-error">{error}</p>}

      {!loading && !error && !active && (
        <>
          {outfits.length === 0 ? (
            <p className="outfit-empty">
              Du hast noch keine Outfits. Erstelle dein erstes im{" "}
              <Link to="/outfit-creator">Outfit-Creator</Link>.
            </p>
          ) : (
            <div className="outfit-grid">
              {outfits.map((outfit) => (
                <button
                  key={outfit.id}
                  type="button"
                  className="card outfit-card"
                  onClick={() => openOutfit(outfit)}
                >
                  <span className="outfit-card__name">{outfit.name}</span>
                  <span className="outfit-card__count">
                    {outfit.items.length} {outfit.items.length === 1 ? "Teil" : "Teile"}
                  </span>
                  <span className="outfit-card__thumbs">
                    {outfit.items.slice(0, 4).map((item) => (
                      <Thumb key={item.id} item={item} />
                    ))}
                    {outfit.items.length > 4 && (
                      <span className="outfit-card__thumb outfit-card__thumb--placeholder">
                        +{outfit.items.length - 4}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && active && mode === "view" && (
        <div className="outfit-section">
          <div className="outfit-detail__header">
            <h2>{active.name}</h2>
            <div className="outfit-detail__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={backToList}
              >
                Zurück
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startEdit}
              >
                Bearbeiten
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                Löschen
              </button>
            </div>
          </div>
          {actionError && <p className="outfit-error">{actionError}</p>}
          <div className="outfit-grid">
            {active.items.map((item) => (
              <div key={item.id} className="outfit-item" style={{ cursor: "default" }}>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && active && mode === "edit" && (
        <div className="outfit-section">
          <div className="outfit-detail__header">
            <h2>Outfit bearbeiten</h2>
            <div className="outfit-detail__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={backToList}
              >
                Abbrechen
              </button>
            </div>
          </div>
          {actionError && <p className="outfit-error">{actionError}</p>}
          <div className="outfit-creator">
            <div className="outfit-creator__select">
              <p className="muted">
                {editIds.length} von {items.length} Teilen ausgewählt
              </p>
              <div className="outfit-grid" role="group" aria-label="Kleidungsstücke">
                {items.map((item) => {
                  const selected = editIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`outfit-item${selected ? " outfit-item--selected" : ""}`}
                      onClick={() => toggleEditItem(item.id)}
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
              <form className="outfit-form" onSubmit={saveEdit}>
                <label className="outfit-form__label" htmlFor="edit-outfit-name">
                  Name des Outfits
                </label>
                <input
                  id="edit-outfit-name"
                  className="input"
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <div className="outfit-form__actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!canSaveEdit}
                  >
                    {saving ? "Speichern …" : "Änderungen speichern"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
