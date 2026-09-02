# Glamouröser Kleiderschrank-Manager

Ein glamouröser Kleiderschrank-Manager mit Web-GUI im Hollywood-Stil. Nutzer registrieren sich und melden sich an, legen Kleidungsstücke mit Bildern und Kategorien an, durchstöbern ihre Garderobe und kombinieren im Outfit-Creator einzelne Teile zu gespeicherten, privaten Outfits – durchgängig in eleganter Red-Carpet-Optik.

## Tech-Stack

- **Backend**: Python 3, FastAPI, SQLAlchemy (SQLite)
- **Auth**: JWT (PyJWT) mit bcrypt-Passwort-Hashing
- **Frontend**: React mit Vite
- **Bildablage**: lokales Dateisystem auf dem Server

## Installation

Voraussetzung: Python 3.12+ (empfohlen 3.13).

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Start (Entwicklung)

Das Backend braucht ein `JWT_SECRET_KEY` (Signaturgeheimnis). Es wird pro Lauf
zufällig erzeugt und ist nie im Repository gespeichert. Vorlage:
`backend/.env.example`. Exportieren Sie das Geheimnis direkt beim Start:

```bash
cd backend
# Windows (PowerShell):
#   $env:JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
# macOS/Linux:
#   export JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
python -m uvicorn app.main:app --port 8000
```

Nach dem Start antwortet `GET /api/health` mit `{"status":"ok"}`.

## Umgebungsvariablen

| Variable | Beschreibung | Default |
| --- | --- | --- |
| `DATABASE_URL` | SQLite-Pfad der Datenbank | `sqlite:///./dev.db` |
| `JWT_SECRET_KEY` | Signaturgeheimnis für JWT (wird pro Lauf generiert, kein Literal im Repo) | – (erforderlich) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Lebensdauer der Zugriffstokens in Minuten | `15` |
| `FRONTEND_ORIGIN` | Konkrete CORS-erlaubte Origin der eigenen Frontend | `http://localhost:5173` |
| `UPLOAD_DIR` | Ablageverzeichnis für hochgeladene Bilder | `./uploads` |
| `MAX_UPLOAD_MB` | Maximale Upload-Größe in MB | `5` |
| `VITE_API_URL` | Basis-URL des Backends für das Frontend | – |

## API-Endpoints

Alle Endpoints (außer Health) sind geschützt via `Authorization: Bearer <token>`.
Fehler werden einheitlich als `{"detail":"<verständlicher Text>"}` zurückgegeben.

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| `GET` | `/api/health` | Health-Check → `200 {"status":"ok"}` |
| `POST` | `/api/auth/register` | Registrierung `{email,password}` → `200 {access_token,token_type:"bearer"}` |
| `POST` | `/api/auth/login` | Anmeldung `{email,password}` → `200 {access_token,token_type:"bearer"}` |
| `DELETE` | `/api/users/me` | Konto und alle Daten löschen → `204` |
| `POST` | `/api/items` | Kleidungsstück anlegen (multipart: `name`, `category`, `image?`) → `201` |
| `GET` | `/api/items` | Garderobe auflisten, optional `?category=` → `200 [ClothingItemOut]` |
| `GET` | `/api/items/{id}` | Einzelnes Kleidungsstück → `200` |
| `PUT` | `/api/items/{id}` | Kleidungsstück bearbeiten (multipart) → `200` |
| `DELETE` | `/api/items/{id}` | Kleidungsstück löschen → `204` |
| `GET` | `/api/items/{id}/image` | Bild als Bytes → `200` |
| `POST` | `/api/outfits` | Outfit anlegen `{name,item_ids:[int]}` → `201` |
| `GET` | `/api/outfits` | Outfits auflisten → `200 [OutfitOut]` |
| `GET` | `/api/outfits/{id}` | Einzelnes Outfit → `200` |
| `PUT` | `/api/outfits/{id}` | Outfit bearbeiten `{name,item_ids}` → `200` |
| `DELETE` | `/api/outfits/{id}` | Outfit löschen → `204` |

Datenformen:

- `ClothingItemOut`: `{id:int, name:str, category:str, image_url:str|null}`
- `OutfitOut`: `{id:int, name:str, items:[ClothingItemOut]}`

Kategorien (fest): `Oberteil`, `Hose`, `Kleid`, `Schuhe`, `Accessoire`.

## Features

- Registrierung und Anmeldung mit JWT und bcrypt
- Garderobe mit Bildern, Kategorien und Filterung
- Outfit-Creator und Outfit-Übersicht
- Kontolöschung mit vollständiger Datenbereinigung
- Red-Carpet-Optik gemäß `DESIGN.md`
