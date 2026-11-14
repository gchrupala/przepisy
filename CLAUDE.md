# Przepisy

Aplikacja webowa (PWA) do zbierania przepisów z sieci. Statyczne pliki w katalogu głównym, bez zależności i bez budowania. Wzorowana na Doczytaniach (gchrupala/doczytania): ta sama synchronizacja i ten sam układ plików.

- `js/store.js`: model danych i logika (adresy, przepisy, `editRecipe`, tagi, wyszukiwanie, `mergeDocs`). Czysta logika bez DOM, czas jako argument. Logikę dodawaj tu, z testami.
- `js/sync.js`: synchronizacja z `<osoba>/przepisy.json` w prywatnym repozytorium. `parsePerson` musi dawać ten sam folder co w Myo, MaxApkach i Doczytaniach.
- `js/app.js`: widoki i zdarzenia.
- `js/i18n.js`: teksty interfejsu po polsku i angielsku (`t(klucz, …)`). Nowy tekst dopisz do obu słowników; test sprawdza, że mają te same klucze. Język wybiera się przełącznikiem PL | EN na liście albo w ustawieniach (`prefs.lang`: `auto`, `pl`, `en`); `auto` bierze język przeglądarki.
- `sw.js`: nowe pliki dopisz do `APP_FILES`; przy każdej zmianie plików aplikacji podbij `VERSION`. Usuwa tylko własne stare cache (prefiks `przepisy-app-`), bo inne aplikacje na gchrupala.github.io dzielą cache.
- Przepis ze strony (`meta`, z `meta.recipe`) dopisuje skrypt `.github/scripts/przepisy_recipes.py` w gchrupala/app-data. Nie zmienia `updatedAt`; `meta` łączy się według `meta.fetchedAt`. Zmiana formatu `meta` wymaga zmian po obu stronach (`parseMeta`).
- Przepis bez strony ma `url: ''` i tylko pole `recipe`; akcja go pomija (`needs_work`).
- Poprawka ręczna to pole `recipe` przepisu; łączy się według `updatedAt` i ma pierwszeństwo przed `meta.recipe`.
- Tytuł: `title` to tytuł wpisany ręcznie, `sharedTitle` to tytuł, który przyszedł z udostępnionym adresem (zwykle tytuł strony). Wyświetlany jest `title`, potem `meta.title`, potem `sharedTitle` (`titleOf`).

## Zasady

- Interfejs po polsku i po angielsku: żadnych tekstów na sztywno w `app.js`. Słowa w `store.js` (etykiety porcji i czasu, tekst do udostępnienia) biorą argument `lang`. Komentarze w kodzie po angielsku.
- Dane w `localStorage` pod `przepisy:v1`; zmiany modelu muszą wczytywać stare dane (`parseDoc`).
- Token GitHuba pod osobnym kluczem `przepisy:sync`; nie może trafić do danych ani kopii.
- Każde usunięcie dopisuje tombstone, inaczej przepis wróci z innego urządzenia.
- Przed wypchnięciem: `npm test`.
