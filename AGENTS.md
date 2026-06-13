# AGENTS.md

Diese Vorgaben gelten für das gesamte Foundry-VTT-Modul in diesem Repository.

## Modulidentität und Namenskonventionen

- Modulname: **Greybeared Theater of the Mind**.
- Modul-ID: `greybeared-tiles`.
- Öffentlicher Kurzname / Namespace: `GBTM`.
- Verwende `greybeared-tiles` als Foundry-Modul-ID und als Namespace für Flags, Settings und Modulressourcen.
- Verwende `GBTM` bzw. `gbtm` als Präfix für Klassen, CSS-Klassen, interne Konstanten, DOM-IDs, Hook-Helfer und frei benannte Datenstrukturen.
- Neue Szenen-Flags sollen unter dem Modul-Namespace `greybeared-tiles` abgelegt werden und sprechende, stabile Keys nutzen.

## Primäres Qualitätsziel

- Der primäre Anspruch an dieses Modul ist, **ressourcenschonend** zu sein.
- Vermeide unnötige Render-Vorgänge, wiederholte DOM-Abfragen, dauerhaft laufende Timer und teure Canvas-Operationen.
- Reagiere möglichst ereignisgetrieben auf Foundry-Hooks und aktualisiere nur die betroffenen UI-Bereiche oder Daten.
- Halte gespeicherte Flag-Daten kompakt und vermeide redundante große Datenstrukturen.

## Code-Organisation und Wiederverwendung

- Bestehende Helferfunktionen sollen wiederverwendet werden, bevor neue Utility-Funktionen eingeführt werden.
- Halte Helferfunktionen klein, eindeutig benannt und seiteneffektarm, damit das Modul gut lesbar und einheitlich bleibt.
- Bevorzuge einheitliche Datenformen für Setpieces und Tile-Referenzen, damit UI, Scene-Flags und Tile-Updates dieselben Strukturen nutzen können.
- Neue UI-Bausteine sollen vorhandene CSS- und Template-Konventionen des Moduls aufgreifen, anstatt parallele Stile oder Markup-Muster einzuführen.

## Foundry-Kompatibilität

- Die Mindestkompatibilität ist Foundry VTT 13.
- Nutze bei neuen Oberflächen bevorzugt Application V2 und vermeide neue Abhängigkeiten von Legacy-Renderpfaden, sofern es keinen guten Grund dafür gibt.
