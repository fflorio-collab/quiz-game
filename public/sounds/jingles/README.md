# Jingle per categoria (opzionali)

Lo splash di cambio round (nome categoria + jingle) usa un **jingle sintetizzato**
di default — a tema in base al nome della categoria. Se vuoi un jingle **vero**,
metti qui un MP3 con questo nome:

```
public/sounds/jingles/<slug>.mp3
```

dove `<slug>` è il nome della categoria: minuscolo, senza accenti, spazi e simboli
sostituiti da `-`. Esempi:

| Categoria        | File                          |
|------------------|-------------------------------|
| Sport            | `sport.mp3`                   |
| Cinema e TV      | `cinema-e-tv.mp3`             |
| Musica           | `musica.mp3`                  |
| Città del mondo  | `citta-del-mondo.mp3`         |

Se il file manca, si usa automaticamente il jingle sintetizzato (nessun errore).

Suggerimenti:
- MP3 brevi (2–4 s), volume normalizzato.
- Il file viene precaricato quando appare la schermata "Round completato", quindi è
  pronto quando parte lo splash. Per il round 1 (nessuna schermata precedente) il
  primo utilizzo potrebbe ricadere sulla sintesi finché il file non è in cache.
