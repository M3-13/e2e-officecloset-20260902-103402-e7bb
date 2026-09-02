export default function DatenschutzPage() {
  return (
    <section className="page">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Anwendung ist:
        <br />
        Glamour Closet
        <br />
        [Vor- und Nachname des Betreibers]
        <br />
        [Straße und Hausnummer]
        <br />
        [Postleitzahl und Ort]
        <br />
        E-Mail: [kontakt@beispiel.de]
      </p>

      <h2>2. Verarbeitete Daten</h2>
      <p>
        Bei der Nutzung der Anwendung verarbeiten wir folgende personenbezogene
        Daten:
      </p>
      <ul>
        <li>
          Kontodaten: E-Mail-Adresse und Passwort (ausschließlich als
          verschlüsselter Hash) für die Erstellung und Verwaltung des
          Benutzerkontos.
        </li>
        <li>
          Kleidungsstück-Daten: Bezeichnung und Kategorie der von Ihnen
          angelegten Kleidungsstücke.
        </li>
        <li>
          Bilder: von Ihnen hochgeladene Fotos Ihrer Kleidungsstücke zur
          Darstellung in Ihrer Garderobe und in Outfits.
        </li>
      </ul>

      <h2>3. Zweck der Verarbeitung</h2>
      <p>
        Die Verarbeitung erfolgt ausschließlich zur Bereitstellung der
        Funktionen der Anwendung, insbesondere zur Verwaltung Ihrer Garderobe,
        zur Erstellung von Outfits und zur Anzeige der von Ihnen hochgeladenen
        Bilder. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
      </p>

      <h2>4. Speicherung von Bildern</h2>
      <p>
        Die von Ihnen hochgeladenen Bilder werden serverseitig in einem
        geschützten Verzeichnis gespeichert und ausschließlich Ihrem
        Benutzerkonto zugeordnet. Es werden nur Bilddateien in den Formaten
        JPEG, PNG oder WebP mit einer maximalen Größe von 5 MB akzeptiert.
        Eine Weitergabe an Dritte findet nicht statt.
      </p>

      <h2>5. Speicherdauer und Löschung</h2>
      <p>
        Ihre Daten werden gespeichert, solange Ihr Benutzerkonto besteht. Sie
        können Ihr Konto jederzeit über die Kontoeinstellungen löschen. Bei der
        Löschung des Kontos werden sämtliche personenbezogenen Daten
        einschließlich aller hochgeladenen Bilder vollständig und
        unwiderruflich entfernt. Einzelne Kleidungsstücke können Sie zudem
        jederzeit selbst löschen; dabei werden auch die zugehörigen Bilder
        entfernt.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit sowie das Recht
        auf Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten.
        Zur Ausübung Ihrer Rechte können Sie sich jederzeit an die oben
        genannte Kontaktadresse wenden.
      </p>

      <h2>7. Datensicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten
        gegen Verlust, Missbrauch und unbefugten Zugriff zu schützen. Die
        Übertragung erfolgt verschlüsselt; Zugriffe auf Ihre Daten sind durch
        ein Authentifizierungsverfahren geschützt.
      </p>
    </section>
  );
}
