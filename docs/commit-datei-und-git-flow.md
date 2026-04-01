# Commit-Datei und Git-Flow

## Was ist die "Commit-Datei"?
- Git nutzt intern die Datei `.git/COMMIT_EDITMSG`.
- Diese Datei enthaelt nur die letzte Commit-Nachricht im lokalen Repository.
- Sie ist eine temporaere Hilfsdatei fuer Git und wird nicht als Projektdatei versioniert.

## Was macht sie?
- Wenn du `git commit` ohne `-m` startest, schreibt Git dort den Nachrichtentext.
- Nach dem Commit bleibt sie als letzte Referenz bestehen.
- Sie steuert keine Website-Funktion, kein Deployment und keine App-Logik.

## Wie damit am besten umgehen?
1. Nicht manuell bearbeiten, ausser du willst bewusst die Commit-Nachricht vorbereiten.
2. Nicht loeschen muessen, Git verwaltet sie selbst.
3. Nie als "Datenquelle" fuer Inhalte verwenden.
4. Fuer saubere Historie:
   - kurze praezise Commit-Messages
   - zusammenhaengende Aenderungen pro Commit
   - vor Push immer `git status` und relevante Checks laufen lassen

## Empfohlener Ablauf
1. `npm run finish:all`
2. `git status`
3. `git add <dateien>`
4. `git commit -m "feat(...): ..."`
5. `git push`
