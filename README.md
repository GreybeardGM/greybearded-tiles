# Greybearded Tile Manager

Foundry-VTT-Modul zur Verwaltung von Setpieces und Tiles.

## Modul-ID und Namespace

- **Modulname:** Greybearded Tile Manager
- **Kürzel / Namespace:** GBTM
- **Modul-ID:** `greybeared-tiles`

Das Modul speichert Setpiece-Slots als Szenen-Flag unter `greybeared-tiles.setpieces`. Die automatische Tile-Sortierung wird pro Szene unter `greybeared-tiles.autoTileSort` aktiviert; ohne dieses Flag verändert das Modul die Sortierung nicht.

## Funktionen

- Fügt den Token-Scene-Controls eine Schaltfläche hinzu, die eine Application-V2-Setpiece-Leiste öffnet oder schließt.
- Die Setpiece-Leiste ist absolut am oberen mittleren Bildrand positioniert.
- Gespeicherte Setpieces werden als flexible Thumbnail-Leiste angezeigt.
- Ein Klick auf ein Thumbnail öffnet den gewählten Picker, um das Bild der verbundenen Tile zu ändern.
- Über „Config“ lassen sich die Setpieces einer Szene nebeneinander anzeigen, ihre Namen ändern und zwischen „File Picker“ und „SmartPicker“ wählen.
- SmartPicker zeigt Bilder aus dem Ordner des aktuellen Setpieces, deren erstes Wort im Dateinamen übereinstimmt. „Mehr anzeigen“ zeigt alle Bilder dieses Ordners. Nach einem Bildwechsel richtet sich die nächste Auswahl nach dem neuen Dateinamen.
- Eine zweite Schaltfläche in den Tile-Controls legt aus der aktuell ausgewählten Tile einen neuen Setpiece-Slot für die Szene an.
- Ein Toggle in den Tile-Controls aktiviert die automatische Sortierung für die aktuelle Szene und sortiert vorhandene Tiles sofort anhand ihrer unteren Kante.
- Solange der Toggle aktiv ist, wird der Sortierwert neuer, verschobener oder skalierter Tiles automatisch aktualisiert.
