# Przepisy

Zbiór przepisów z sieci. Stronę z przepisem udostępnia się do aplikacji (albo wkleja link); aplikacja zapisuje adres, a GitHub Action wyciąga ze strony przepis: dla ilu osób, składniki i kroki. Działa w przeglądarce telefonu i komputera, da się ją zainstalować (PWA) i działa bez internetu. Zbudowana tak jak [Doczytania](https://github.com/gchrupala/doczytania).

Adres: `https://gchrupala.github.io/przepisy/` (po włączeniu GitHub Pages: Settings → Pages → „Deploy from a branch”, katalog `/ (root)`).

## Co robi

- **Dodawanie.** Android: po instalacji Przepisy są na liście „Udostępnij”. Komputer: przycisk „+ Przepisy” na pasku zakładek albo wklejenie linku w pole wyszukiwania. iPhone: skrót w aplikacji Skróty (instrukcje w ustawieniach).
- **Własne przepisy.** Przycisk „+” na liście tworzy przepis bez strony: tytuł, porcje, składniki i kroki wpisuje się ręcznie. Adres można dopisać później.
- **Przepis.** Widok przepisu pokazuje zdjęcie, liczbę osób, czas, składniki i kroki. Składniki i kroki można odhaczać w trakcie gotowania; przycisk ze słońcem na górnym pasku trzyma ekran włączony. Przyciski − i + przy składnikach przeliczają ilości: na inną liczbę osób, gdy przepis ją podaje, a w przeciwnym razie mnożnikiem (×½, ×2…). Miary zapisane słowem („szklanka mąki”, „a cup of flour”) liczą się jako jedna i dostają właściwą formę („2 szklanki”, „5 szklanek”). Wymiary, temperatury i czasy zostają; nazwy składników nie zmieniają końcówek. Przepis da się poprawić albo wpisać ręcznie („Popraw przepis”); poprawka ma pierwszeństwo przed wyciągiem ze strony i można do niego wrócić.
- **Porządkowanie i szukanie.** Zakładki „Wszystkie”, „Do wypróbowania”, „Wypróbowane”, tagi, notatka. Kolejność: ostatnio dodane albo ostatnio otwierane (czas otwarcia zapisuje się tylko na danym urządzeniu). Szukanie po tytule, serwisie, tagach, notatce i składnikach, bez polskich znaków i z grubsza bez końcówek („pomidory” znajdzie „pomidorów”).

## Skąd się bierze przepis

Przeglądarka nie może pobierać cudzych stron (CORS), więc robi to workflow `.github/workflows/przepisy-recipes.yml` w repozytorium z danymi (`gchrupala/app-data`), po każdej synchronizacji i raz dziennie:

1. Dane schema.org na stronie, przez bibliotekę [recipe-scrapers](https://github.com/hhursev/recipe-scrapers). Ma je większość serwisów z przepisami.
2. Gdy ich brak lub są niepełne: tekst strony czyta model językowy. Claude, gdy w repozytorium jest sekret `ANTHROPIC_API_KEY` (domyślnie `claude-opus-5-5`, zmienna `PRZEPISY_MODEL`); bez niego Mistral, gdy jest sekret `MISTRAL_API_KEY` (domyślnie `mistral-small-latest`, zmienna `PRZEPISY_MISTRAL_MODEL`). Bez żadnego klucza zostają tylko strony z danymi schema.org.

Wynik trafia do pola `meta` przepisu; aplikacja ma go po następnej synchronizacji (sama sprawdza kilka razy przez kilka minut po dodaniu). Strony za logowaniem (Instagram, TikTok) zwykle się nie pobiorą.

## Synchronizacja

Jak w Doczytaniach i Myo: plik `<imię>/przepisy.json` w prywatnym repozytorium, token fine-grained z uprawnieniem „Contents: Read and write”. Na tym samym urządzeniu formularz podpowiada połączenie z Doczytań albo Myo.

## Praca nad kodem

```sh
npm start   # serwer lokalny na http://localhost:8080
npm test    # testy logiki (Node 18+)
```

| Plik | Co zawiera |
| --- | --- |
| `index.html`, `styles.css` | strona i wygląd (jasny i ciemny motyw) |
| `manifest.webmanifest` | instalacja i `share_target` |
| `js/store.js` | model danych: adresy, przepisy, poprawki, tagi, wyszukiwanie, łączenie kopii |
| `js/sync.js` | synchronizacja z plikiem w repozytorium GitHub |
| `js/app.js` | widoki i obsługa zdarzeń |
| `sw.js` | praca bez internetu |
| `test/` | testy `node --test` |
