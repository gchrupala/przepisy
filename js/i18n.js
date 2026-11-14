// Interface texts in Polish and English. A value is a string or a function
// of its parameters. Values may hold HTML, so anything from the data must be
// escaped by the caller before it goes in. A link inside a sentence comes as
// a function (link) that turns the link text into the element.
//
// Every key must be in both languages (test/i18n.test.js checks it).

export const LANGS = ['pl', 'en'];

// The language to use: the one chosen in settings ('pl' | 'en'), else the
// first of the browser's languages that the app has, else English.
export function pickLang(choice, languages = []) {
  if (LANGS.includes(choice)) return choice;
  for (const l of languages ?? []) {
    const base = String(l ?? '').toLowerCase().split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return 'en';
}

const pl = {
  // common
  settings: 'Ustawienia',
  back: 'Wróć',
  close: 'Zamknij',
  done: 'Gotowe',
  delete: 'Usuń',
  confirmDelete: 'Na pewno usunąć?',
  tried: 'Wypróbowany',
  share: 'Udostępnij',

  // tabs
  tabAll: 'Wszystkie',
  tabTodo: 'Do wypróbowania',
  tabDone: 'Wypróbowane',

  // times
  justNow: 'przed chwilą',
  todayAt: (time) => `dziś, ${time}`,

  // sync button and notices
  syncing: 'Synchronizuję…',
  syncNotWorking: 'Synchronizacja nie działa',
  syncedAgo: (ago) => `Zsynchronizowano ${ago}. Synchronizuj teraz`,
  syncNow: 'Synchronizuj teraz',
  noStorage: 'Przeglądarka nie zapisuje danych na tym urządzeniu (np. tryb prywatny). Po zamknięciu strony zmiany przepadną.',
  syncBroken: 'Synchronizacja z GitHubem nie działa. Szczegóły w ustawieniach.',

  // sync errors
  syncErr_repoFormat: 'Wpisz repozytorium jako właściciel/nazwa, np. gchrupala/app-data.',
  syncErr_person: 'Wpisz imię. Od niego zależy folder z danymi w repozytorium.',
  syncErr_token: 'Wklej token.',
  syncErr_auth: 'GitHub nie przyjął tokena. Mógł wygasnąć; utwórz nowy i połącz ponownie.',
  syncErr_forbidden: 'Token nie ma prawa zapisu w tym repozytorium (Contents: Read and write).',
  syncErr_notFound: 'Nie ma takiego repozytorium albo token nie ma do niego dostępu.',
  syncErr_public: 'To repozytorium jest publiczne. Użyj prywatnego.',
  syncErr_conflict: 'Plik w repozytorium zmieniał się w trakcie. Spróbuj jeszcze raz.',
  syncErr_bad: 'Synchronizacja się nie udała. Plik w repozytorium może być uszkodzony.',

  // list
  newRecipe: 'Wpisz własny przepis',
  search: 'Szukaj albo wklej link',
  clear: 'Wyczyść',
  add: 'Dodaj',
  paste: 'Wklej',
  filters: 'Filtry',
  sortLabel: 'Kolejność',
  sortAdded: 'ostatnio dodane',
  sortOpened: 'ostatnio otwierane',
  nothingMatches: 'Nic tu nie pasuje',
  showAll: 'Pokaż wszystko',
  hintKnown: 'Ten przepis już jest zapisany. „Dodaj” go otworzy.',
  hintLink: 'To jest link. Naciśnij „Dodaj”, żeby zapisać przepis.',
  stateBlank: 'bez treści',
  stateWaiting: 'czeka na przepis',
  stateFailed: 'nie udało się pobrać',
  stateNone: 'bez przepisu',
  ownRecipeShort: 'własny przepis',
  triedShort: 'wypróbowany',
  emptyTitle: 'Nie ma jeszcze przepisów.',
  emptyBody: (link) =>
    `Udostępnij stronę z przepisem z innej aplikacji albo wklej link w pole powyżej. Aplikacja zapisze adres, a GitHub wyciągnie ze strony porcje, składniki i kroki. Przepis bez strony wpiszesz przyciskiem +. Sposoby dodawania i połączenie z GitHubem są w ${link('ustawieniach')}.`,

  // one recipe
  pageRecipeHidden: 'Przepis ze strony jest ukryty.',
  showAgain: 'Pokaż go znowu',
  recipeBlank: 'Ten przepis jest jeszcze pusty.',
  fillIn: 'Wpisz go',
  recipeSoon: 'Przepis pojawi się za minutę lub dwie, gdy GitHub pobierze stronę.',
  recipeNeedsSync: (link) =>
    `Przepis ze strony pobiera GitHub. Połącz aplikację z GitHubem w ${link('ustawieniach')} albo wpisz przepis sam.`,
  fetchFailed: (error, again) =>
    `Nie udało się pobrać strony (${error}).${again ? ' GitHub spróbuje jeszcze raz za dzień.' : ''} Możesz wpisać przepis sam.`,
  noRecipeFound: (noModel) =>
    `Na stronie nie znaleziono przepisu.${noModel ? ' Strona nie ma danych przepisu w kodzie, a odczyt tekstu przez model językowy jest wyłączony (brak klucza w repozytorium).' : ''} Możesz wpisać go sam.`,
  source_schema: 'Przepis z danych na stronie.',
  source_claude: 'Przepis odczytany z tekstu strony przez model Claude; może mieć błędy.',
  source_mistral: 'Przepis odczytany z tekstu strony przez model Mistral; może mieć błędy.',
  source_hand: 'Przepis poprawiony ręcznie.',
  source_own: 'Przepis wpisany ręcznie.',
  ingredients: 'Składniki',
  method: 'Przygotowanie',
  keepAwake: 'Nie wygaszaj ekranu',
  wakeOn: 'Ekran nie gaśnie. Wyłącz',
  amounts: 'Ilość składników',
  scaledServings: (n) => `Dla <strong>${n}</strong> ${n === 1 ? 'osoby' : 'osób'}`,
  scaledFactor: (f) => `Ilość <strong>×${f}</strong>`,
  fewerPeople: 'Mniej osób',
  morePeople: 'Więcej osób',
  less: 'Mniej',
  more: 'Więcej',
  ownRecipe: 'Własny przepis',
  titleTagsNote: 'Tytuł, tagi i notatka',
  correctRecipe: 'Popraw przepis',
  enterRecipe: 'Wpisz przepis',
  wakeRefused: 'Przeglądarka nie pozwoliła wyłączyć wygaszania ekranu.',
  copied: 'Skopiowano przepis. Wklej go, gdzie chcesz.',
  shareFailed: 'Przeglądarka nie pozwoliła udostępnić ani skopiować przepisu.',

  // edit sheet
  edit: 'Edycja',
  editRecipe: 'Edycja przepisu',
  yourTags: 'Twoje tagi',
  pageTitle: (title) => `Tytuł na stronie: „${title}”.`,
  afterSync: 'Porcje, składniki i kroki pojawią się po synchronizacji, gdy GitHub pobierze stronę.',
  withoutSync: 'Bez połączenia z GitHubem przepis trzeba wpisać samemu.',
  title: 'Tytuł',
  tags: 'Tagi',
  tagsHint: '(oddzielone przecinkami)',
  note: 'Notatka',
  address: 'Adres',
  addressHint: '(strona z przepisem, jeśli jest)',
  saved: 'Zapisano',
  alreadySaved: 'Już był zapisany',
  recipe: 'Przepis',
  restorePage: 'Przywróć przepis ze strony',
  formHelp: 'Jeden składnik albo krok w wierszu. Wiersz zaczynający się od # to nagłówek części, np. „# Ciasto”.',
  servings: 'Dla ilu osób',
  servingsExample: 'np. 4 albo „około 20 pierogów”',
  steps: 'Kroki',

  // settings
  language: 'Język',
  langAuto: 'Auto',
  android:
    'Zainstaluj aplikację: w Chrome menu ⋮ → „Zainstaluj aplikację” (albo „Dodaj do ekranu głównego”). Potem w dowolnej aplikacji wybierz „Udostępnij” → <strong>Przepisy</strong>.',
  iosIntro: 'Safari nie pozwala aplikacjom z sieci odbierać udostępnień. Można zrobić skrót w aplikacji Skróty:',
  iosStep1: 'Nowy skrót → w ustawieniach skrótu włącz „Pokaż w arkuszu udostępniania”, typ: adresy URL.',
  iosStep2: (code) => `Dodaj czynność „Tekst” z treścią ${code} i zaraz po niej zmienną „Dane wejściowe skrótu”.`,
  iosStep3: 'Dodaj czynność „Otwórz adresy URL”.',
  iosNote:
    'Skrót otwiera Przepisy w Safari. Dane w Safari i w aplikacji dodanej do ekranu początkowego są na iPhonie osobne; połącz obie z GitHubem, a będą takie same.',
  bookmarklet: (button) =>
    `Przeciągnij ten przycisk na pasek zakładek: ${button}. Kliknięty na stronie z przepisem zapisuje ją tutaj. Można też wkleić link w pole wyszukiwania.`,
  dragBookmarklet: 'Przeciągnij ten przycisk na pasek zakładek.',
  help: 'Pomoc',
  helpAndroid: 'Dodawanie na Androidzie',
  helpIos: 'Dodawanie na iPhonie i iPadzie',
  helpComputer: 'Dodawanie na komputerze',
  whereFrom: 'Skąd się bierze przepis',
  whereFromBody:
    'Przeglądarka nie może pobierać cudzych stron, więc robi to GitHub Action w repozytorium z danymi, po każdej synchronizacji. Większość stron z przepisami ma w kodzie dane przepisu (schema.org); wtedy porcje, składniki i kroki są takie jak na stronie. Inne strony czyta model językowy: Claude, jeśli w repozytorium jest sekret <code>ANTHROPIC_API_KEY</code>, a bez niego Mistral, jeśli jest sekret <code>MISTRAL_API_KEY</code>.',
  whereFromNote:
    'Strony za logowaniem (Instagram, TikTok, część serwisów) zwykle się nie pobiorą. Taki przepis można wpisać samemu: „Wpisz przepis” w widoku przepisu.',
  rename: 'Zmień nazwę',
  renameTag: (tag) => `Nowa nazwa tagu #${tag}:`,
  removeTag: (tag) => `Usunąć tag #${tag} ze wszystkich przepisów?`,
  backup: 'Kopia danych',
  download: 'Pobierz kopię',
  load: 'Wczytaj kopię',
  imported: (n) => `Wczytano. Nowych przepisów: ${n}.`,
  notBackup: 'To nie jest plik z kopią Przepisów.',
  version: (v, code) => `Przepisy · wersja ${v} · ${code('kod')}`,

  // sync settings
  syncHead: 'Synchronizacja z GitHubem',
  syncShort: 'Te same przepisy na wszystkich urządzeniach i przepisy pobierane ze stron.',
  syncHow: 'Jak połączyć',
  lastSync: (ago) => `Ostatnio: ${ago}.`,
  neverSynced: 'Jeszcze nie zsynchronizowano.',
  connectedTo: (repo, path) => `Połączono z <strong>${repo}</strong>, plik <code>${path}</code>.`,
  disconnect: 'Odłącz',
  confirmDisconnect: 'Na pewno odłączyć?',
  disconnectNote: 'Odłączenie usuwa token z tego urządzenia. Przepisy zostają tu i w repozytorium.',
  filledFrom: (app) =>
    `Formularz wypełniono danymi połączenia z ${{ doczytania: 'Doczytaniami', myo: 'Myo' }[app] ?? app} na tym urządzeniu.`,
  syncIntro:
    'Przepisy trafiają do pliku <code>&lt;imię&gt;/przepisy.json</code> w prywatnym repozytorium, tak jak w Doczytaniach i Myo. Każde urządzenie połączone z tym samym repozytorium i imieniem ma te same przepisy. Bez połączenia aplikacja działa, ale nie wyciąga przepisów ze stron.',
  syncStep1: (link) => `Prywatne repozytorium, np. <code>app-data</code>: ${link} (albo istniejące).`,
  syncStep2: (link) => `Token z uprawnieniem „Contents: Read and write” do tego repozytorium: ${link}. Może być ten sam co w Doczytaniach.`,
  syncStep3: 'Wpisz poniżej repozytorium, imię i token.',
  repo: 'Repozytorium',
  repoPlaceholder: 'właściciel/nazwa',
  person: 'Imię',
  personPlaceholder: 'np. Grzegorz',
  token: 'Token',
  connecting: 'Łączę…',
  connect: 'Połącz',

  // adding
  notALink: 'To nie jest link, który da się zapisać.',
  wasSaved: 'Ten przepis już był zapisany.',
  savedToast: 'Zapisano.',
  open: 'Otwórz',
  noLinkShared: 'W udostępnionym tekście nie było linku.',
  noLinkClipboard: 'W schowku nie ma linku.',
  noClipboard: 'Przeglądarka nie dała dostępu do schowka. Wklej link w pole.',
  deleted: 'Usunięto.',
  undo: 'Cofnij',
};

const en = {
  // common
  settings: 'Settings',
  back: 'Back',
  close: 'Close',
  done: 'Done',
  delete: 'Delete',
  confirmDelete: 'Really delete?',
  tried: 'Tried',
  share: 'Share',

  // tabs
  tabAll: 'All',
  tabTodo: 'To try',
  tabDone: 'Tried',

  // times
  justNow: 'just now',
  todayAt: (time) => `today, ${time}`,

  // sync button and notices
  syncing: 'Syncing…',
  syncNotWorking: 'Sync is not working',
  syncedAgo: (ago) => `Synced ${ago}. Sync now`,
  syncNow: 'Sync now',
  noStorage: 'The browser does not save data on this device (private mode, for example). Changes will be lost when the page closes.',
  syncBroken: 'Sync with GitHub is not working. Details in settings.',

  // sync errors
  syncErr_repoFormat: 'Enter the repository as owner/name, e.g. gchrupala/app-data.',
  syncErr_person: 'Enter a name. It sets the folder for the data in the repository.',
  syncErr_token: 'Paste the token.',
  syncErr_auth: 'GitHub did not accept the token. It may have expired; create a new one and connect again.',
  syncErr_forbidden: 'The token cannot write to this repository (Contents: Read and write).',
  syncErr_notFound: 'There is no such repository, or the token has no access to it.',
  syncErr_public: 'This repository is public. Use a private one.',
  syncErr_conflict: 'The file in the repository changed in the meantime. Try again.',
  syncErr_bad: 'Sync failed. The file in the repository may be damaged.',

  // list
  newRecipe: 'Add your own recipe',
  search: 'Search or paste a link',
  clear: 'Clear',
  add: 'Add',
  paste: 'Paste',
  filters: 'Filters',
  sortLabel: 'Order',
  sortAdded: 'recently added',
  sortOpened: 'recently opened',
  nothingMatches: 'Nothing matches',
  showAll: 'Show all',
  hintKnown: 'This recipe is already saved. “Add” will open it.',
  hintLink: 'This is a link. Press “Add” to save the recipe.',
  stateBlank: 'empty',
  stateWaiting: 'waiting for the recipe',
  stateFailed: 'could not be fetched',
  stateNone: 'no recipe',
  ownRecipeShort: 'own recipe',
  triedShort: 'tried',
  emptyTitle: 'No recipes yet.',
  emptyBody: (link) =>
    `Share a recipe page from another app or paste a link into the field above. The app saves the address, and GitHub extracts the servings, ingredients and steps from the page. A recipe without a page can be entered with the + button. Ways of adding recipes and the connection to GitHub are in ${link('settings')}.`,

  // one recipe
  pageRecipeHidden: 'The recipe from the page is hidden.',
  showAgain: 'Show it again',
  recipeBlank: 'This recipe is still empty.',
  fillIn: 'Enter it',
  recipeSoon: 'The recipe will appear in a minute or two, once GitHub fetches the page.',
  recipeNeedsSync: (link) =>
    `GitHub fetches the recipe from the page. Connect the app to GitHub in ${link('settings')}, or enter the recipe yourself.`,
  fetchFailed: (error, again) =>
    `The page could not be fetched (${error}).${again ? ' GitHub will try again in a day.' : ''} You can enter the recipe yourself.`,
  noRecipeFound: (noModel) =>
    `No recipe was found on the page.${noModel ? ' The page has no recipe data in its code, and reading the text with a language model is off (no key in the repository).' : ''} You can enter it yourself.`,
  source_schema: 'Recipe from the data on the page.',
  source_claude: 'Recipe read from the text of the page by the Claude model; it may contain mistakes.',
  source_mistral: 'Recipe read from the text of the page by the Mistral model; it may contain mistakes.',
  source_hand: 'Recipe corrected by hand.',
  source_own: 'Recipe written by hand.',
  ingredients: 'Ingredients',
  method: 'Method',
  keepAwake: 'Keep screen on',
  wakeOn: 'Screen stays on. Turn off',
  amounts: 'Ingredient amounts',
  scaledServings: (n) => `Serves <strong>${n}</strong>`,
  scaledFactor: (f) => `Amounts <strong>×${f}</strong>`,
  fewerPeople: 'Fewer people',
  morePeople: 'More people',
  less: 'Less',
  more: 'More',
  ownRecipe: 'Own recipe',
  titleTagsNote: 'Title, tags and note',
  correctRecipe: 'Edit recipe',
  enterRecipe: 'Enter recipe',
  wakeRefused: 'The browser did not allow keeping the screen on.',
  copied: 'Recipe copied. Paste it wherever you like.',
  shareFailed: 'The browser did not allow sharing or copying the recipe.',

  // edit sheet
  edit: 'Edit',
  editRecipe: 'Edit recipe',
  yourTags: 'Your tags',
  pageTitle: (title) => `Title on the page: “${title}”.`,
  afterSync: 'Servings, ingredients and steps will appear after syncing, once GitHub fetches the page.',
  withoutSync: 'Without a connection to GitHub, the recipe has to be entered by hand.',
  title: 'Title',
  tags: 'Tags',
  tagsHint: '(separated by commas)',
  note: 'Note',
  address: 'Address',
  addressHint: '(the recipe page, if there is one)',
  saved: 'Saved',
  alreadySaved: 'Already saved',
  recipe: 'Recipe',
  restorePage: 'Restore the recipe from the page',
  formHelp: 'One ingredient or step per line. A line starting with # is the heading of a part, e.g. “# Dough”.',
  servings: 'Servings',
  servingsExample: 'e.g. 4 or “about 20 dumplings”',
  steps: 'Steps',

  // settings
  language: 'Language',
  langAuto: 'Auto',
  android:
    'Install the app: in Chrome, menu ⋮ → “Install app” (or “Add to Home screen”). Then, in any app, choose “Share” → <strong>Przepisy</strong>.',
  iosIntro: 'Safari does not let web apps receive shares. You can make a shortcut in the Shortcuts app:',
  iosStep1: 'New shortcut → in the shortcut details turn on “Show in Share Sheet”, type: URLs.',
  iosStep2: (code) => `Add a “Text” action containing ${code} followed directly by the “Shortcut Input” variable.`,
  iosStep3: 'Add an “Open URLs” action.',
  iosNote:
    'The shortcut opens Przepisy in Safari. On an iPhone, Safari and the app added to the Home Screen keep separate data; connect both to GitHub and they will be the same.',
  bookmarklet: (button) =>
    `Drag this button to the bookmarks bar: ${button}. Clicked on a recipe page, it saves the page here. You can also paste a link into the search field.`,
  dragBookmarklet: 'Drag this button to the bookmarks bar.',
  help: 'Help',
  helpAndroid: 'Adding on Android',
  helpIos: 'Adding on iPhone and iPad',
  helpComputer: 'Adding on a computer',
  whereFrom: 'Where the recipe comes from',
  whereFromBody:
    'The browser cannot fetch other sites’ pages, so a GitHub Action in the data repository does it after each sync. Most recipe sites have the recipe data in their code (schema.org); then the servings, ingredients and steps are as on the page. Other pages are read by a language model: Claude if the repository has the secret <code>ANTHROPIC_API_KEY</code>, otherwise Mistral if it has the secret <code>MISTRAL_API_KEY</code>.',
  whereFromNote:
    'Pages behind a login (Instagram, TikTok, some other sites) usually cannot be fetched. You can enter such a recipe yourself: “Enter recipe” in the recipe view.',
  rename: 'Rename',
  renameTag: (tag) => `New name for the tag #${tag}:`,
  removeTag: (tag) => `Remove the tag #${tag} from all recipes?`,
  backup: 'Backup',
  download: 'Download backup',
  load: 'Load backup',
  imported: (n) => `Loaded. New recipes: ${n}.`,
  notBackup: 'This is not a Przepisy backup file.',
  version: (v, code) => `Przepisy · version ${v} · ${code('code')}`,

  // sync settings
  syncHead: 'Sync with GitHub',
  syncShort: 'The same recipes on all your devices, and recipes fetched from pages.',
  syncHow: 'How to connect',
  lastSync: (ago) => `Last synced: ${ago}.`,
  neverSynced: 'Not synced yet.',
  connectedTo: (repo, path) => `Connected to <strong>${repo}</strong>, file <code>${path}</code>.`,
  disconnect: 'Disconnect',
  confirmDisconnect: 'Really disconnect?',
  disconnectNote: 'Disconnecting removes the token from this device. The recipes stay here and in the repository.',
  filledFrom: (app) =>
    `The form was filled in from the connection of ${{ doczytania: 'Doczytania', myo: 'Myo' }[app] ?? app} on this device.`,
  syncIntro:
    'Recipes go to the file <code>&lt;name&gt;/przepisy.json</code> in a private repository, as in Doczytania and Myo. Every device connected to the same repository and name has the same recipes. Without a connection the app works, but does not extract recipes from pages.',
  syncStep1: (link) => `A private repository, e.g. <code>app-data</code>: ${link} (or an existing one).`,
  syncStep2: (link) => `A token with the “Contents: Read and write” permission for this repository: ${link}. It can be the same as in Doczytania.`,
  syncStep3: 'Enter the repository, name and token below.',
  repo: 'Repository',
  repoPlaceholder: 'owner/name',
  person: 'Name',
  personPlaceholder: 'e.g. Grzegorz',
  token: 'Token',
  connecting: 'Connecting…',
  connect: 'Connect',

  // adding
  notALink: 'This is not a link that can be saved.',
  wasSaved: 'This recipe was already saved.',
  savedToast: 'Saved.',
  open: 'Open',
  noLinkShared: 'There was no link in the shared text.',
  noLinkClipboard: 'There is no link on the clipboard.',
  noClipboard: 'The browser did not allow access to the clipboard. Paste the link into the field.',
  deleted: 'Deleted.',
  undo: 'Undo',
};

export const STRINGS = { pl, en };

let current = 'pl';

export const setLang = (lang) => {
  current = LANGS.includes(lang) ? lang : 'pl';
};

export const getLang = () => current;

export const has = (key) => key in STRINGS[current];

// The text for key in the current language, with its parameters filled in.
export function t(key, ...args) {
  const value = STRINGS[current][key] ?? STRINGS.pl[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}
