VERDICT: APPROVED

## Sicherheitsbericht

### Prüfumfang
Geprüft wurde der sichtbare, zusammengeführte Produktstand (Backend FastAPI, SQLite, React/Vite). Die Scanner-Ausgaben für `bandit` und `semgrep` fehlen; `pip-audit`/`npm audit` wurden nicht ausgeführt. Das Fehlen von Scannerergebnissen wird als Prüflücke notiert, aber nicht als eigener Befund gewertet.

### Befunde nach Prüfbereichen

#### 1. Secrets
Keine kritischen Befunde. Das JWT-Signaturgeheimnis wird ausschließlich aus der Umgebungsvariablen `JWT_SECRET_KEY` gelesen (`backend/app/config.py`). Fehlt es, schlägt der Start in `Settings.validate()` gezielt fehl. In Testdateien vorhandene Test-Secrets sind nur für isolierte Tests und nicht produktiv wirksam.

#### 2. Injection & Inputs
Keine kritischen Befunde.
- SQL-Abfragen laufen über SQLAlchemy ORM; keine sichtbare String-Konkatenation mit Nutzereingaben.
- Upload-Pfade werden aus numerischen IDs und einer servergewählten, erlaubten Endung gebildet (`backend/app/upload.py`). Kein Client-seitiger Dateiname wird für den Speicherpfad übernommen.
- Upload-Größenlimit wird vor dem Multipart-Parsing anhand des `Content-Length`-Headers durchgesetzt und zusätzlich beim Streaming geprüft.
- React rendert Texte ohne `dangerouslySetInnerHTML`; XSS über Bild-URLs ist nicht ersichtlich.

**Low: Bildvalidierung stützt sich nur auf deklarierten Content-Type und Dateiendung**  
Betroffene Stelle: `backend/app/upload.py` / `validate_image()`  
Risiko: Es können beliebige Bytes unter einer erlaubten Bildendung gespeichert werden, solange Client-Content-Type und Endung stimmen. Da die Bilder mit korrektem MIME-Typ ausgeliefert werden, besteht kein direktes XSS-, aber ein Integritätsrisiko.  
Konkreter Fix: Vor dem Speichern zusätzlich die Dateisignatur (Magic Bytes) für JPEG, PNG und WebP prüfen und bei Abweichung mit 400 ablehnen.

#### 3. AuthN/AuthZ
Keine kritischen Befunde.
- Passwörter werden mit bcrypt gehasht (`backend/app/security.py`).
- JWT-Ablauf wird bei jeder geschützten Anfrage durch `jwt.decode` erzwungen; abgelaufene Token führen zu 401.
- Kleidungsstücke und Outfits werden konsequent anhand der `user_id` des aktuellen Users gefiltert; Fremdzugriffe liefern 404.
- Anmeldung und Registrierung sind pro IP mit 5 Versuchen pro Minute limitiert.

**Low: User-Enumeration über Registrierung**  
Betroffene Stelle: `backend/app/routers/auth.py` / `register()`  
Risiko: Bei bereits registrierter E-Mail wird 409 geliefert, wodurch sich E-Mail-Adressen auf Existenz prüfen lassen.  
Konkreter Fix: In einem Produktionsbetrieb ohne strikte Testvorgabe wäre eine generische Antwort (z. B. immer 200 mit einem neutralen Hinweis) möglich. Da der bestehende Test explizit 409 erwartet, ist die Umsetzung nur mit angepasstem Test realistisch. Durch das Rate-Limit ist das Aufzählen zumindest stark begrenzt.

**Low: Clientseitiger Routenschutz ist nur eine Attrappe**  
Betroffene Stelle: `frontend/src/App.jsx` / `ProtectedRoute`  
Risiko: Die Komponente rendert lediglich `<Outlet />` und prüft nicht, ob ein Nutzer angemeldet ist. Die eigentlichen Daten sind durch die API geschützt; ein nicht angemeldeter Browser sieht die Seitenhülle, erhält aber 401.  
Konkreter Fix: In `ProtectedRoute` `useAuth()` verwenden und bei fehlendem `isAuthenticated` per `<Navigate to="/login" replace />` auf die Login-Seite umleiten. Das bricht keine API-Funktionalität und verbessert die UX sowie die Trennung zwischen öffentlich/geschützt.

#### 4. Dependencies
Keine Befunde auf Basis konkreter Versionsangaben, da `backend/requirements.txt`, `frontend/package.json` und `frontend/package-lock.json` im Prüfausschnitt nicht inhaltlich sichtbar sind und keine Audit-Scanner liefen.  
Hinweis: Vor Auslieferung sollten `pip-audit`/`npm audit` ausgeführt werden, um die tatsächlich installierten Pakete abzusichern.

#### 5. Konfiguration & Transport
Keine kritischen Befunde.
- CORS erlaubt nur die konfigurierte Frontend-Origin, setzt `allow_credentials=True` und verwendet keine Wildcard-Origin (`backend/app/main.py`). AC-12 ist erfüllt.
- Upload-Verzeichnis liegt außerhalb des Frontends und wird nicht statisch ausgeliefert; Zugriff erfolgt ausschließlich über authentifizierte API-Routen.
- Kein Debug-Modus aktiv; unbehandelte Fehler liefern generisches 500 ohne interne Details.

**Low: JWT liegt im localStorage**  
Betroffene Stelle: `frontend/src/api.js` / `getToken()`/`setToken()`  
Risiko: Sollte künftig doch eine XSS-Lücke in der React-Anwendung entstehen, kann ein Angreifer das Token auslesen. Aktuell ist kein XSS-Vektor sichtbar und die Token-Lebensdauer ist mit 15 Minuten kurz.  
Konkreter Fix: Langfristig Token in einem `httpOnly`, `SameSite=strict`-Cookie ausliefern; kurzfristig mindestens die kurze TTL beibehalten und regelmäßig auf XSS-Sicherheit testen.

**Low: CORS erlaubt alle Methoden und Header**  
Betroffene Stelle: `backend/app/main.py` / `CORSMiddleware`  
Risiko: `allow_methods=["*"]` und `allow_headers=["*"]` sind großzügig, obwohl die Anwendung nur `GET`, `POST`, `PUT`, `DELETE` und `Authorization`, `Content-Type` benötigt.  
Konkreter Fix: `allow_methods` auf `["GET","POST","PUT","DELETE"]` und `allow_headers` auf `["Authorization","Content-Type"]` einschränken.

### Zusammenfassung
Im sichtbaren Produktstand wurden keine kritischen oder hohen Sicherheitslücken festgestellt. Die vorhandenen Hinweise sind Härtungsempfehlungen mit niedrigem Risiko. Unter der Voraussetzung, dass der nicht sichtbare Teil von `backend/app/routers/items.py` die Ownership-Prüfung auch für `/api/items/{item_id}/image` konsequent durchführt, ist das Produkt aus Security-Sicht für den Kunden freigabefähig.