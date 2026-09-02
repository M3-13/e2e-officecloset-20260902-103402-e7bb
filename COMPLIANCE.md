VERDICT: CHANGES_REQUESTED

# Rechts- und Compliance-Prüfung — Glamouröser Kleiderschrank-Manager

Geprüft wurde der vorgelegte, zusammengeführte Produktstand (FastAPI-Backend, SQLite, React/Vite-Frontend, lokale Bildspeicherung, JWT-Auth). Der Stand hat **keine fundamentalen Rechtsverletzungen** — insbesondere keine personenbezogenen Daten im Klartext, keine fehlende Rechtsgrundlage für die Kernverarbeitung und keine offenen Datenzugriffe. Es bestehen jedoch **behebbare Lücken**, vor allem bei den Pflichttexten und bei der Barrierefreiheit.

---

## 1. DSGVO

### 1.1 Impressum und Datenschutzerklärung enthalten Platzhalter statt Pflichtangaben
- **Schweregrad:** hoch
- **Betroffene Dateien:**
  - `frontend/src/pages/ImpressumPage.jsx`
  - `frontend/src/pages/DatenschutzPage.jsx`
- **Befund:**
  Die Seiten sind vorhanden und von jeder Seite verlinkt (AC-15/AC-16 erfüllt). Inhaltlich stehen jedoch Platzhalter wie `[Vor- und Nachname des Betreibers]`, `[Straße und Hausnummer]`, `[Postleitzahl und Ort]`, `[kontakt@beispiel.de]`. Eine ladungsfähige Anbieterkennzeichnung und eine korrekte Benennung des Verantwortlichen im Sinne von Art. 13 Abs. 1 lit. a DSGVO sind damit nicht gegeben. Vor Auslieferung an Endkunden müssen diese Angaben zwingend ausgefüllt werden.
- **Konkrete Abhilfe:**
  In beiden Dateien die Platzhalter durch die echten Betreiberangaben ersetzen. Im Impressum zusätzlich die vertretungsberechtigte Person und den inhaltlich Verantwortlichen nach § 18 Abs. 2 MStV benennen. In der Datenschutzerklärung den Verantwortlichen und die Kontaktadresse vollständig angeben.

### 1.2 Datenschutzerklärung erwähnt IP-Adressen und Token-Speicherung nicht
- **Schweregrad:** mittel
- **Betroffene Datei:** `frontend/src/pages/DatenschutzPage.jsx`
- **Befund:**
  Das Backend verarbeitet im Rate-Limiter (`backend/app/routers/auth.py`, `InMemoryRateLimiter`) kurzzeitig die Client-IP. Das Frontend speichert das JWT im `localStorage` (`frontend/src/api.js`). Beides sind im Endgerät bzw. serverseitig verarbeitete Daten, die in der Datenschutzerklärung nicht beschrieben sind. Die Erklärung nennt nur Kontodaten, Kleidungsstück-Daten und Bilder.
- **Konkrete Abhilfe:**
  In der Datenschutzerklärung einen Absatz ergänzen, z. B.:
  - „Zur Missbrauchsprävention wird die IP-Adresse für maximal 60 Sekunden in flüchtigem Arbeitsspeicher verarbeitet und nicht dauerhaft gespeichert.“
  - „Zur Aufrechterhaltung der Anmeldung wird ein technisch notwendiges Zugriffstoken im lokalen Speicher Ihres Browsers abgelegt. Eine Nutzung zu Tracking-Zwecken erfolgt nicht.“
  Rechtsgrundlage: berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO bzw. technische Notwendigkeit nach § 25 TDDDG.

### 1.3 Kein Self-Service-Datenexport nach Art. 20 DSGVO
- **Schweregrad:** niedrig
- **Betroffene Dateien:**
  - `backend/app/routers/users.py`
  - `backend/app/routers/items.py`
  - `backend/app/routers/outfits.py`
- **Befund:**
  Die App bietet Self-Service für Auskunft (Listenansichten), Berichtigung (Update) und Löschung (`DELETE /api/users/me`, AC-18). Ein strukturierter, maschinenlesbarer Export der eigenen personenbezogenen Daten fehlt. Rechtlich ausreichend ist der Verweis auf die Kontaktadresse; ein UI-gestützter Export wäre aber datenschutzfreundlicher und reduziert Anfrageaufwand.
- **Konkrete Abhilfe:**
  Optional einen Endpunkt `GET /api/users/me/export` ergänzen, der E-Mail, Kleidungsstück-Daten und Outfit-Daten im JSON-Format zurückgibt; in der Datenschutzerklärung unter Punkt 6 darauf verweisen.

### 1.4 Keine Verschlüsselung der gespeicherten Bilder und der SQLite-Datenbank
- **Schweregrad:** niedrig
- **Betroffene Komponenten:**
  - `backend/app/upload.py`
  - `backend/app/db.py`
- **Befund:**
  Nutzerfotos können personenbezogen sein. Sie liegen unverschlüsselt im Dateisystem (`UPLOAD_DIR/<user_id>/<item_id>.<ext>`). Die SQLite-Datenbank enthält E-Mail und Passwort-Hash. Art. 32 DSGVO verlangt angemessene Schutzmaßnahmen; Verschlüsselung at rest ist hier zu empfehlen.
- **Konkrete Abhilfe:**
  Deployment-seitig Festplatten- oder Volume-Verschlüsselung aktivieren; optional auf App-Ebene die Bilddateien vor dem Schreiben mit einem Schlüssel aus der Serverumgebung ver- und beim Ausliefern entschlüsseln.

### 1.5 JWT im localStorage statt httpOnly-Cookie
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/api.js`
- **Befund:**
  Das JWT wird im `localStorage` gespeichert. Das ist verbreitet und funktioniert, ist aber bei XSS unmittelbar auslesbar. Aktuell gibt es keine Anzeichen für XSS-Lücken; dennoch wäre ein `httpOnly`-Cookie die robustere Alternative.
- **Konkrete Abhilfe:**
  Optional auf ein `httpOnly`, `Secure`, `SameSite=Strict`-Cookie umstellen: Backend setzt Cookie bei Login/Register, Frontend liest es nicht mehr aus `localStorage`, `get_current_user` liest das Cookie. Dabei CSRF-Schutz prüfen; die bestehende konkrete CORS-Origin und SameSite helfen bereits.

---

## 2. EU Cyber Resilience Act (CRA)

### 2.1 Kein SBOM / keine dokumentierte Sicherheitsbeschreibung
- **Schweregrad:** mittel
- **Betroffene Dateien:**
  - `backend/requirements.txt`
  - `frontend/package-lock.json`
  - `README.md`
  - `DESIGN.md`
- **Befund:**
  Die vorhandenen `requirements.txt` und `package-lock.json` bieten eine Abhängigkeitsgrundlage, aber kein maschinenlesbares SBOM und keine explizite Zusammenfassung der Sicherheitseigenschaften (z. B. Passwort-Hashing, Token-Ablauf, Upload-Limit vor Pufferung, Zugriffsbeschränkung). Für ein Produkt mit digitalen Elementen ist das ein CRA-relevanter Dokumentationsmangel.
- **Konkrete Abhilfe:**
  Ein SBOM im CycloneDX- oder SPDX-Format aus den Abhängigkeiten erzeugen und im Repository ablegen. In `README.md` oder `DESIGN.md` einen Abschnitt „Security properties“ mit den getroffenen Maßnahmen ergänzen.

### 2.2 Update-/Patch-Prozess nicht sichtbar
- **Schweregrad:** niedrig
- **Betroffene Datei:** `README.md`
- **Befund:**
  Eine zentrale Web-App wird im Betrieb durch den Betreiber aktualisiert; im Code ist kein Update-Kanal vorhanden. Das ist bei SaaS nicht zwingend erforderlich, sollte aber dokumentiert sein.
- **Konkrete Abhilfe:**
  Im `README.md` beschreiben, wie Patches eingespielt werden, wie Abhängigkeiten aktualisiert werden und wie Sicherheitsupdates priorisiert werden.

### 2.3 Validierung der Bilddateien nur über MIME-Typ und Endung
- **Schweregrad:** niedrig
- **Betroffene Datei:** `backend/app/upload.py`
- **Befund:**
  Die Prüfung in `validate_image` vertraut auf `Content-Type` und Dateiendung, prüft aber nicht die tatsächlichen Magic Bytes. Das ist für die Kernfunktion ausreichend, entspricht aber nicht dem Prinzip „Security by Default“ in voller Tiefe.
- **Konkrete Abhilfe:**
  In `validate_image` nach dem Einlesen der ersten Bytes die Signatur prüfen (z. B. `\x89PNG\r\n\x1a\n`, `\xFF\xD8\xFF`, `RIFF....WEBP`) und bei Abweichung 400 zurückgeben.

---

## 3. EU AI Act

- **Befund:** Keine KI-Funktion erkennbar. Der Kleiderschrank-Manager verwendet keine algorithmischen Empfehlungen, Bilderkennung oder generativen Inhalte.
- **Bewertung:** Der AI Act ist nicht anwendbar. Keine Maßnahmen erforderlich.

---

## 4. Pflichttexte & UI

### 4.1 Pflichttexte inhaltlich unvollständig
- **Schweregrad:** hoch
- **Betroffene Dateien:** `frontend/src/pages/ImpressumPage.jsx`, `frontend/src/pages/DatenschutzPage.jsx`
- **Befund:** Wird hier als eigener Pflichttext-Befund geführt; Details siehe 1.1. Seiten existieren und sind verlinkt, aber nicht rechtskonform ausfüllbar.
- **Konkrete Abhilfe:** Echte Betreiberdaten einsetzen, siehe 1.1.

### 4.2 Keine Nutzungsbedingungen / AGB
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/App.jsx`
- **Befund:**
  Bei einer registrierungspflichtigen Web-Anwendung fehlen Nutzungsbedingungen, die z. B. zulässige Nutzung, Haftung und Kontosperrung regeln. Rechtlich nicht zwingend, aber für einen ordentlichen Marktauftritt dringend zu empfehlen.
- **Konkrete Abhilfe:**
  Eine neue Route `/agb` mit `AGBPage.jsx` anlegen, im Footer verlinken und den Text auf das Produkt zuschneiden.

### 4.3 Keine Cookie-/Consent-Banner nötig
- **Bewertung:** Positiv. Es werden keine Cookies gesetzt, keine Drittanbieter-Ressourcen geladen (AC-17 erfüllt) und der `localStorage`-JWT ist technisch notwendig. Ein Consent-Manager ist nicht erforderlich.
- **Konkrete Abhilfe:** Keine; aber localStorage-Erwähnung in der Datenschutzerklärung ergänzen (siehe 1.2).

---

## 5. Barrierefreiheit (WCAG / BITV / EAA)

### 5.1 Dialoge ohne Fokus-Management und teilweise ohne zugänglichen Namen
- **Schweregrad:** mittel
- **Betroffene Dateien:**
  - `frontend/src/components/UserMenu.jsx`
  - `frontend/src/pages/WardrobePage.jsx`
- **Befund:**
  Die modalen Dialoge haben `role="dialog"` und `aria-modal="true"`, aber der Fokus wird beim Öffnen nicht in den Dialog verschoben, beim Schließen nicht zurückgesetzt, und der Fokus wird nicht im Dialog gehalten. Im `ConfirmDialog` fehlt ein `aria-labelledby`-Bezug zur Überschrift.
- **Konkrete Abhilfe:**
  In beiden Komponenten: beim Öffnen den ersten Fokuspunkt setzen, Tastaturfokus mit einem `keydown`-Handler (Tab/Tab+Shift) im Dialog halten und beim Schließen auf den auslösenden Button zurückfokussieren. In `ConfirmDialog` der Überschrift eine `id` geben und am Dialog `aria-labelledby` setzen.

### 5.2 Pflichtfelder nicht maschinell markiert
- **Schweregrad:** niedrig
- **Betroffene Dateien:**
  - `frontend/src/pages/LoginPage.jsx`
  - `frontend/src/pages/RegisterPage.jsx`
  - `frontend/src/pages/WardrobePage.jsx`
- **Befund:**
  Die Formulare nutzen eigene Fehlermeldungen, aber die Pflichtfelder besitzen kein `required`-Attribut und kein `aria-required`. Screenreader-Nutzer können nicht erkennen, welche Felder zwingend sind.
- **Konkrete Abhilfe:**
  In den Eingabefeldern `aria-required="true"` ergänzen und/oder `required` setzen; beim Absenden weiterhin die eigenen verständlichen Fehlertexte anzeigen.

### 5.3 Kein Skip-Link für Tastaturnutzer
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/components/Layout.jsx`
- **Befund:**
  Es gibt keinen „Zum Inhalt springen“-Mechanismus. Tastaturnutzer müssen sich durch Header-Navigation und Nutzerbereich bewegen.
- **Konkrete Abhilfe:**
  Am Anfang des Layouts einen visuell versteckten, aber fokussierbaren Link `<a href="#main" className="skip-link">Zum Inhalt springen</a>` einfügen; dem `<main>` die ID `main` geben. Den Link in `theme.css` mit `:focus-visible` sichtbar machen.

### 5.4 Fehlende sichtbare Tastatur-Fokusmarkierung für interaktive Elemente
- **Schweregrad:** niedrig
- **Betroffene Datei:** `frontend/src/styles/theme.css`
- **Befund:**
  Inputs haben einen Fokus-Stil; Links und Buttons verlassen sich auf den Browser-Default. Für eine einheitliche und deutlich sichtbare Tastaturbedienung fehlt ein globaler `:focus-visible`-Stil.
- **Konkrete Abhilfe:**
  In `theme.css` eine Regel ergänzen, z. B.:
  ```css
  :focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 2px;
  }
  ```

### 5.5 Positive Befunde
- Grundsprache ist korrekt mit `<html lang="de">` gesetzt.
- Formulare verwenden korrekte `<label htmlFor>`-Zuordnungen.
- Fehlermeldungen nutzen `role="alert"`.
- Bilder verwenden Alt-Texte; Platzhalter sind mit `aria-hidden` verborgen.
- `prefers-reduced-motion` wird berücksichtigt.
- Die Grundstruktur erfüllt viele WCAG-2.1-A-Kriterien bereits.

---

## Ergebnis

Der Produktstand ist **nicht fundamental rechtswidrig** — die Kernverarbeitung beruht auf Art. 6 Abs. 1 lit. b DSGVO, Passwörter sind bcrypt-gehasht, Zugriffe sind nutzerbezogen isoliert, und die Sicherheitsmaßnahmen (Rate-Limiting, Upload-Limit vor Pufferung, konkrete CORS-Origin, JWT-Ablauf) sind solide umgesetzt.

Vor einer Marktfreigabe müssen jedoch **mindestens die Pflichttexte vervollständigt** und die **Barrierefreiheitsmängel** behoben werden. Die übrigen Punkte sind empfehlenswert, aber nicht sperrend. Daher:

**VERDICT: CHANGES_REQUESTED**