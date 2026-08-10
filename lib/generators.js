// Все генераторы токенов. Регистрируются в глобальном FF.generators.
// Каждый генератор — функция (args, ctx) -> string, где args это массив
// параметров из шаблона (см. template.js), а ctx — объект с общим состоянием
// (counters, seed и т.п.), пробрасываемый при рендере.

(function () {
  const FIRST_NAMES = [
    'James', 'Mary', 'John', 'Sarah', 'Robert', 'Emma', 'William',
    'Olivia', 'David', 'Emily', 'Michael', 'Sophie', 'Daniel', 'Charlotte',
    'Thomas', 'Grace', 'Henry', 'Alice', 'George', 'Lucy'
  ];
  const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Taylor',
    'Davies', 'Wilson', 'Evans', 'Walker', 'Roberts', 'Clark',
    'Stewart', 'Campbell', 'Anderson', 'Mitchell'
  ];
  const COMPANIES = [
    'Apex Corp', 'Vertex Ltd', 'Sterling & Co', 'Pinnacle Solutions',
    'Atlas Holdings', 'Quantum Group', 'Harbor Industries', 'Summit Partners'
  ];
  const STREETS = [
    'Baker Street', 'Oxford Road', 'High Street', 'Church Lane',
    'Mill Road', 'Park Avenue', 'King Street', 'Victoria Road'
  ];
  const CITIES = [
    'London', 'Manchester', 'Birmingham', 'Leeds',
    'Edinburgh', 'Bristol', 'Liverpool', 'Glasgow', 'Sheffield', 'Oxford'
  ];
  // Тематический словарь: ~690 слов, 4–10 символов, только строчные, без пробелов/дефисов.
  // Категории: фрукты, овощи, столицы, реки, моря, океаны, континенты, острова, животные саванны.
  const ENGLISH_WORDS = [
    // ── Фрукты ──
    'pear', 'plum', 'lime', 'kiwi', 'date', 'ugli', 'noni',
    'grape', 'mango', 'lemon', 'peach', 'guava', 'melon', 'olive', 'prune', 'apple',
    'berry', 'ackee', 'mamey', 'salak',
    'papaya', 'banana', 'cherry', 'lychee', 'longan', 'pomelo', 'quince', 'durian',
    'feijoa', 'medlar', 'loquat', 'pitaya', 'kiwano', 'damson', 'pawpaw', 'jujube',
    'raisin',
    'apricot', 'coconut', 'avocado', 'kumquat', 'soursop', 'atemoya', 'currant',
    'acerola', 'sultana', 'tayberry', 'satsuma', 'tangelo', 'bergamot',
    'rambutan', 'tamarind', 'mandarin', 'mulberry', 'physalis', 'bayberry', 'dewberry',
    'bilberry', 'plantain',
    'nectarine', 'persimmon', 'tangerine', 'pineapple', 'jackfruit', 'starfruit',
    'sapodilla', 'cherimoya', 'blueberry', 'raspberry', 'cranberry', 'crabapple',
    'greengage', 'calamansi',
    'grapefruit', 'watermelon', 'cantaloupe', 'breadfruit', 'mangosteen', 'clementine',
    'strawberry', 'gooseberry', 'blackberry', 'elderberry', 'loganberry', 'cloudberry',
    // ── Овощи и зелень ──
    'bean', 'beet', 'corn', 'kale', 'leek', 'okra', 'peas', 'yuca', 'dill', 'taro',
    'sage', 'ramp', 'nori',
    'basil', 'chard', 'chive', 'onion', 'cress', 'thyme', 'mint', 'dulse', 'kombu',
    'chili', 'cumin', 'clove', 'anise', 'sumac',
    'radish', 'carrot', 'celery', 'turnip', 'garlic', 'pepper', 'potato', 'squash',
    'fennel', 'endive', 'sorrel', 'tomato', 'daikon', 'jicama', 'wasabi', 'ginger',
    'mizuna', 'wakame',
    'spinach', 'cabbage', 'lettuce', 'parsley', 'parsnip', 'pumpkin', 'shallot',
    'arugula', 'edamame', 'oregano', 'cayenne', 'serrano', 'poblano', 'cassava',
    'salsify', 'chervil', 'chicory',
    'broccoli', 'cucumber', 'eggplant', 'zucchini', 'kohlrabi', 'rutabaga', 'cilantro',
    'celeriac', 'scallion', 'beetroot', 'rosemary', 'tarragon', 'marjoram', 'turmeric',
    'cinnamon', 'cardamom', 'habanero', 'jalapeno',
    'asparagus', 'artichoke', 'radicchio',
    'watercress', 'lemongrass',
    // ── Столицы мира ──
    'baku', 'doha', 'lima', 'lome', 'male', 'oslo', 'riga', 'rome', 'suva', 'bern',
    'kyiv', 'apia',
    'abuja', 'accra', 'amman', 'cairo', 'dhaka', 'hanoi', 'kabul', 'minsk', 'paris',
    'praia', 'quito', 'rabat', 'sanaa', 'seoul', 'sofia', 'tokyo', 'tunis', 'vaduz',
    'dakar', 'yaren',
    'ankara', 'athens', 'bangui', 'berlin', 'bogota', 'dublin', 'harare', 'havana',
    'lisbon', 'london', 'luanda', 'lusaka', 'madrid', 'malabo', 'manama', 'manila',
    'maputo', 'maseru', 'monaco', 'moroni', 'moscow', 'muscat', 'nassau', 'niamey',
    'ottawa', 'panama', 'prague', 'riyadh', 'roseau', 'skopje', 'tirana', 'vienna',
    'warsaw', 'zagreb', 'bamako', 'bissau', 'dodoma', 'kigali', 'tehran', 'taipei',
    'asmara', 'majuro', 'tarawa', 'gitega',
    'algiers', 'baghdad', 'beijing', 'caracas', 'colombo', 'conakry', 'jakarta',
    'kampala', 'managua', 'nairobi', 'nicosia', 'tallinn', 'tbilisi', 'tripoli',
    'vilnius', 'yerevan', 'bishkek', 'mbabane', 'thimphu', 'honiara', 'yaounde',
    'chisinau', 'freetown', 'kingston', 'monrovia', 'windhoek', 'asuncion', 'belgrade',
    'brasilia', 'brussels', 'budapest', 'canberra', 'djibouti', 'helsinki', 'khartoum',
    'lilongwe', 'pretoria', 'pristina', 'santiago', 'sarajevo', 'tashkent', 'victoria',
    'ashgabat', 'belmopan', 'dushanbe', 'funafuti', 'valletta',
    'mogadishu', 'amsterdam', 'bucharest', 'islamabad', 'kathmandu', 'reykjavik',
    'singapore', 'stockholm', 'vientiane', 'pyongyang', 'podgorica',
    'bratislava', 'copenhagen', 'montevideo', 'washington', 'bridgetown', 'paramaribo',
    // ── Реки ──
    'nile', 'elbe', 'neva', 'oder', 'ural', 'amur', 'lena', 'arno', 'ebro', 'ohio',
    'avon', 'sava', 'maas', 'tana', 'oxus', 'spey', 'ruhr', 'isar', 'prut', 'kama',
    'main',
    'congo', 'niger', 'rhine', 'seine', 'tagus', 'volga', 'yukon', 'loire', 'indus',
    'dvina', 'trent', 'clyde', 'tweed', 'forth', 'tisza', 'drava', 'onega', 'cauca',
    'meuse', 'somme', 'rhone', 'douro', 'siret', 'weser', 'tiber', 'adige', 'xingu',
    'purus',
    'danube', 'ganges', 'hudson', 'jordan', 'mekong', 'murray', 'thames', 'tigris',
    'amazon', 'angara', 'irtysh', 'fraser', 'parana', 'morava', 'vltava', 'neckar',
    'severn', 'humber',
    'yangtze', 'dnieper', 'limpopo', 'madeira', 'orinoco', 'potomac', 'shannon',
    'vistula', 'volkhov', 'zambezi', 'yenisei', 'salween', 'darling', 'pechora',
    'moselle', 'garonne', 'tapajos',
    'colorado', 'columbia', 'delaware', 'dniester', 'missouri', 'dordogne', 'araguaia',
    'euphrates', 'tennessee', 'irrawaddy', 'tocantins', 'mackenzie', 'athabasca',
    // ── Моря ──
    'aral', 'azov', 'ross', 'kara', 'sulu', 'java',
    'banda', 'coral', 'timor', 'ceram',
    'baltic', 'aegean', 'bering', 'laptev', 'ionian', 'flores', 'tasman', 'celtic',
    'scotia',
    'caspian', 'arabian', 'barents', 'weddell', 'okhotsk', 'andaman', 'celebes',
    'marmara', 'solomon', 'alboran', 'chukchi', 'arafura', 'molucca', 'lincoln',
    'beaufort', 'adriatic', 'bismarck', 'sargasso', 'ligurian', 'labrador', 'amundsen',
    'caribbean',
    'tyrrhenian',
    // ── Океаны ──
    'arctic', 'indian', 'pacific', 'atlantic', 'southern',
    // ── Континенты ──
    'asia', 'africa', 'europe', 'eurasia', 'australia', 'antarctica',
    // ── Острова ──
    'cuba', 'fiji', 'guam', 'oahu', 'maui', 'wake', 'elba', 'gozo', 'cebu', 'bali',
    'capri', 'crete', 'malta', 'samoa', 'tonga', 'aruba', 'corfu', 'ibiza', 'leyte',
    'luzon', 'naxos', 'palau', 'samos', 'sumba', 'nauru', 'lanai', 'kauai', 'milos',
    'hydra', 'paros', 'chios', 'ambon', 'bohol',
    'borneo', 'cyprus', 'hawaii', 'sicily', 'honshu', 'kyushu', 'tuvalu', 'tahiti',
    'moorea', 'lombok', 'komodo', 'phuket', 'penang', 'azores', 'jersey', 'tobago',
    'rhodes', 'lesbos',
    'corsica', 'sumatra', 'formosa', 'curacao', 'grenada', 'majorca', 'menorca',
    'mykonos', 'okinawa', 'bermuda', 'bahrain', 'comoros', 'shikoku', 'vanuatu',
    'iceland', 'ireland', 'jamaica', 'reunion', 'socotra', 'nicobar', 'molokai',
    'antigua', 'bonaire', 'cozumel', 'sumbawa', 'ternate',
    'sulawesi', 'sardinia', 'zanzibar', 'barbados', 'dominica', 'hokkaido', 'maldives',
    'mindanao', 'tasmania', 'kiribati', 'shetland', 'svalbard', 'tenerife', 'anguilla',
    'trinidad', 'pitcairn', 'langkawi', 'krakatoa', 'guernsey',
    'mauritius', 'santorini', 'greenland', 'lanzarote', 'galapagos', 'rarotonga',
    'marquesas', 'rodrigues', 'zakynthos', 'kefalonia',
    'madagascar', 'seychelles', 'kalimantan', 'martinique', 'montserrat',
    // ── Животные саванны ──
    'lion', 'topi', 'kudu', 'oryx', 'ibis', 'hawk', 'hare', 'suni', 'roan', 'puku',
    'eland', 'hyena', 'rhino', 'zebra', 'hippo', 'mamba', 'addax', 'bongo', 'civet',
    'genet', 'nyala', 'sable', 'ratel', 'eagle', 'stork', 'crane', 'viper', 'egret',
    'finch', 'oribi', 'okapi', 'lemur', 'beira', 'agama', 'cobra', 'swift', 'heron',
    'gecko', 'skink',
    'impala', 'jackal', 'python', 'baboon', 'serval', 'duiker', 'weaver', 'shrike',
    'roller', 'galago', 'vervet', 'jacana', 'quelea', 'bonobo', 'fennec', 'whydah',
    'coucal',
    'warthog', 'buffalo', 'caracal', 'cheetah', 'gazelle', 'giraffe', 'leopard',
    'ostrich', 'vulture', 'wildcat', 'gemsbok', 'marabou', 'bushpig', 'kestrel',
    'pelican', 'meerkat', 'bustard', 'lapwing', 'colobus', 'blesbok', 'sunbird',
    'courser', 'gorilla', 'harrier', 'monitor', 'warbler', 'sparrow',
    'pangolin', 'aardvark', 'antelope', 'bushbuck', 'elephant', 'flamingo', 'mongoose',
    'hornbill', 'reedbuck', 'steenbok', 'bushbaby', 'oxpecker', 'starling', 'bontebok',
    'mandrill', 'tsessebe', 'tortoise', 'hedgehog', 'aardwolf', 'bateleur', 'hamerkop',
    'crocodile', 'porcupine', 'springbok', 'waterbuck', 'sitatunga', 'chameleon',
    'wildebeest', 'rhinoceros', 'hartebeest', 'guineafowl', 'kingfisher'
  ];

  const LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
    'tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis ' +
    'nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis ' +
    'aute irure dolor in reprehenderit voluptate velit esse cillum dolore eu fugiat ' +
    'nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui ' +
    'officia deserunt mollit anim id est laborum').split(' ');

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }

  // Транслитерация для генерации email из русских имён
  const TRANSLIT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  function translit(s) {
    return s.toLowerCase().split('').map(c => TRANSLIT[c] !== undefined ? TRANSLIT[c] : c).join('');
  }

  // Форматирование даты по паттерну (yyyy, MM, dd, HH, mm, ss)
  function formatDate(d, fmt) {
    if (!fmt) fmt = 'yyyy-MM-dd';
    const pad = (n, w) => String(n).padStart(w, '0');
    return fmt
      .replace(/yyyy/g, d.getFullYear())
      .replace(/MM/g, pad(d.getMonth() + 1, 2))
      .replace(/dd/g, pad(d.getDate(), 2))
      .replace(/HH/g, pad(d.getHours(), 2))
      .replace(/mm/g, pad(d.getMinutes(), 2))
      .replace(/ss/g, pad(d.getSeconds(), 2));
  }

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Простой regex-генератор: поддерживает [набор]{n}, [набор]{min,max},
  // \d \w \l \u . группы (a|b), литералы. Достаточно для базовой версии.
  function generateFromRegex(pattern) {
    if (!pattern) return '';
    let i = 0, out = '';
    const digits = '0123456789';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const word = digits + lower + upper + '_';
    const any = lower + upper + digits;

    function readSet() {
      // предполагаем, что pattern[i] === '['
      i++;
      let neg = false;
      if (pattern[i] === '^') { neg = true; i++; }
      const chars = [];
      while (i < pattern.length && pattern[i] !== ']') {
        let c = pattern[i];
        if (c === '\\' && i + 1 < pattern.length) {
          const n = pattern[i + 1];
          if (n === 'd') { chars.push(...digits); i += 2; continue; }
          if (n === 'w') { chars.push(...word); i += 2; continue; }
          if (n === 's') { chars.push(' '); i += 2; continue; }
          chars.push(n); i += 2; continue;
        }
        if (pattern[i + 1] === '-' && i + 2 < pattern.length && pattern[i + 2] !== ']') {
          const a = c.charCodeAt(0), b = pattern[i + 2].charCodeAt(0);
          const lo = Math.min(a, b), hi = Math.max(a, b);
          for (let k = lo; k <= hi; k++) chars.push(String.fromCharCode(k));
          i += 3;
        } else {
          chars.push(c);
          i++;
        }
      }
      i++; // skip ']'
      if (neg) {
        const all = word + ' ';
        return all.split('').filter(x => !chars.includes(x));
      }
      return chars;
    }

    function readQuantifier() {
      if (pattern[i] !== '{') return 1;
      i++;
      let numStr = '';
      while (i < pattern.length && pattern[i] !== ',' && pattern[i] !== '}') {
        numStr += pattern[i++];
      }
      const min = parseInt(numStr, 10) || 0;
      let max = min;
      if (pattern[i] === ',') {
        i++;
        let m = '';
        while (i < pattern.length && pattern[i] !== '}') m += pattern[i++];
        max = m === '' ? min + 10 : parseInt(m, 10);
      }
      if (pattern[i] === '}') i++;
      return min + Math.floor(Math.random() * (max - min + 1));
    }

    while (i < pattern.length) {
      let chars = null;
      let literal = null;
      const c = pattern[i];
      if (c === '\\' && i + 1 < pattern.length) {
        const n = pattern[i + 1];
        if (n === 'd') chars = digits.split('');
        else if (n === 'w') chars = word.split('');
        else if (n === 's') chars = [' '];
        else literal = n;
        i += 2;
      } else if (c === '[') {
        chars = readSet();
      } else if (c === '.') {
        chars = any.split('');
        i++;
      } else if (c === '(') {
        // группа с альтернативами (a|b|c)
        i++;
        let depth = 1, buf = '';
        while (i < pattern.length && depth > 0) {
          if (pattern[i] === '(') depth++;
          else if (pattern[i] === ')') { depth--; if (depth === 0) break; }
          buf += pattern[i++];
        }
        if (pattern[i] === ')') i++;
        const alts = buf.split('|');
        const chosen = alts[rand(alts.length)];
        // рекурсивно раскрываем альтернативу
        out += generateFromRegex(chosen);
        // квантификатор к группе применим — но упрощаем: применяем к последнему символу вывода
        continue;
      } else {
        literal = c;
        i++;
      }
      const qty = readQuantifier();
      if (chars) {
        for (let k = 0; k < qty; k++) out += chars[rand(chars.length)];
      } else if (literal !== null) {
        for (let k = 0; k < qty; k++) out += literal;
      }
    }
    return out;
  }

  const generators = {
    // --- Имена / компании / адреса ---
    'name.first': () => pick(FIRST_NAMES),
    'name.last':  () => pick(LAST_NAMES),
    'name.full':  () => pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
    'company':    () => pick(COMPANIES),
    'city':       () => pick(CITIES),
    'street':     () => (1 + rand(200)) + ' ' + pick(STREETS),
    'address':    () => (1 + rand(200)) + ' ' + pick(STREETS) + ', ' + pick(CITIES) + ', ' + String.fromCharCode(65 + rand(26)) + String.fromCharCode(65 + rand(26)) + (1 + rand(9)) + ' ' + rand(10) + String.fromCharCode(65 + rand(26)) + String.fromCharCode(65 + rand(26)),

    // --- Email ---
    'email': (args) => {
      const domain = args[0] || 'example.com';
      const first = translit(pick(FIRST_NAMES));
      const last = translit(pick(LAST_NAMES));
      const n = rand(1000);
      return `${first}.${last}${n}@${domain}`;
    },

    // --- Телефон ---
    'phone': (args) => {
      const fmt = args[0] || '###-###-####';
      return fmt.replace(/#/g, () => String(rand(10)));
    },

    // --- Числа ---
    'number': (args) => {
      const min = parseInt(args[0], 10) || 0;
      const max = parseInt(args[1], 10) || 100;
      return String(min + Math.floor(Math.random() * (max - min + 1)));
    },

    // --- Даты ---
    'date': (args) => {
      // date, date:yyyy-MM-dd, date:from|to|format
      // args[0] может быть форматом (yyyy...) ИЛИ from-датой
      let fmt = 'yyyy-MM-dd';
      let from = null, to = null;
      if (args.length === 1) {
        // единственный аргумент — формат
        fmt = args[0];
      } else if (args.length === 2) {
        from = parseDate(args[0]);
        to = parseDate(args[1]);
      } else if (args.length >= 3) {
        from = parseDate(args[0]);
        to = parseDate(args[1]);
        fmt = args[2];
      }
      if (!from) from = new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000);
      if (!to) to = new Date();
      const t = from.getTime() + Math.random() * (to.getTime() - from.getTime());
      return formatDate(new Date(t), fmt);
    },

    'now': (args) => formatDate(new Date(), args[0] || 'yyyy-MM-dd HH:mm:ss'),

    // --- UUID v4 ---
    'uuid': () => {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = rand(16), v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    // --- Lorem ---
    'lorem.words': (args) => {
      const n = parseInt(args[0], 10) || 5;
      const out = [];
      for (let i = 0; i < n; i++) out.push(pick(LOREM));
      return out.join(' ');
    },
    'lorem.sentence': (args) => {
      const n = parseInt(args[0], 10) || 8;
      const words = [];
      for (let i = 0; i < n; i++) words.push(pick(LOREM));
      const s = words.join(' ');
      return s.charAt(0).toUpperCase() + s.slice(1) + '.';
    },
    'lorem.paragraph': (args) => {
      const n = parseInt(args[0], 10) || 3;
      const sentences = [];
      for (let i = 0; i < n; i++) {
        const wc = 6 + rand(10);
        const words = [];
        for (let j = 0; j < wc; j++) words.push(pick(LOREM));
        const s = words.join(' ');
        sentences.push(s.charAt(0).toUpperCase() + s.slice(1) + '.');
      }
      return sentences.join(' ');
    },

    // --- Списки и счётчики ---
    // {{pick:a|b|c}} — выбирает случайное из перечисленного (разделитель |)
    'pick': (args) => {
      // весь список пришёл как один аргумент вида "a|b|c" (см. template.js)
      const raw = args.join(':'); // на случай если внутри двоеточия
      const items = raw.split('|').map(x => x.trim()).filter(Boolean);
      return items.length ? items[rand(items.length)] : '';
    },

    // {{counter}} или {{counter:имя}} — глобальный или именованный счётчик
    'counter': (args, ctx) => {
      const key = args[0] || 'default';
      ctx.counters = ctx.counters || {};
      ctx.counters[key] = (ctx.counters[key] || 0) + 1;
      return String(ctx.counters[key]);
    },

    // {{increment:имя:start:step}} — как counter, но со стартом и шагом
    'increment': (args, ctx) => {
      const key = args[0] || 'default';
      const start = parseInt(args[1], 10) || 1;
      const step = parseInt(args[2], 10) || 1;
      ctx.counters = ctx.counters || {};
      if (ctx.counters[key] === undefined) ctx.counters[key] = start - step;
      ctx.counters[key] += step;
      return String(ctx.counters[key]);
    },

    'tools':          () => pick(TOOLS),
    // Случайное слово из тематического словаря (~690 слов), 4–10 символов, безопасно для email.
    'word':           () => pick(ENGLISH_WORDS),
    'en_word':        () => pick(ENGLISH_WORDS),

    // --- Число с плавающей точкой ---
    // {{decimal:min:max:precision}} — например {{decimal:0:100:2}} → 42.37
    'decimal': (args) => {
      const min = parseFloat(args[0]); const max = parseFloat(args[1]);
      const p = Math.max(0, Math.min(10, parseInt(args[2], 10) || 2));
      const lo = isNaN(min) ? 0 : min;
      const hi = isNaN(max) ? 100 : max;
      const v = lo + Math.random() * (hi - lo);
      return v.toFixed(p);
    },

    // --- Regex ---
    'regex': (args) => generateFromRegex(args.join(':')),

    // --- Умный инкрементор с ветвлением по URL ---
    // {{seq:name}} — пример: Szv00355 → Szv00356 (main) или Szv00356B (branch)
    // Конфиг хранится в ctx.smartCounters, найденном по name.
    // При ctx.dryRun не мутирует состояние — только считает следующее значение.
    'seq': (args, ctx) => {
      const name = (args[0] || '').trim();
      if (!name) return '';
      const list = (ctx && ctx.smartCounters) || [];
      const sc = list.find(x => x.name === name);
      if (!sc) return '{{seq:' + name + '?}}';

      const nextNum = (Number(sc.current) || 0) + 1;
      const width = Number(sc.width) || 0;
      const numStr = width > 0 ? String(nextNum).padStart(width, '0') : String(nextNum);

      // Домены: если задан массив sc.branches — проходим по нему сверху вниз, первый мэтч URL выигрывает.
      // Regex проверяется без учёта регистра. Fallback на легаси sc.branchRegex/branchSuffix.
      const branches = Array.isArray(sc.branches) && sc.branches.length
        ? sc.branches
        : (sc.branchRegex ? [{ label: 'B', regex: sc.branchRegex, suffix: sc.branchSuffix || '' }] : []);
      let suffix = '';
      let branchLabel = '';
      if (ctx && ctx.url) {
        for (const b of branches) {
          if (!b.regex) continue;
          try {
            if (new RegExp(b.regex, 'i').test(ctx.url)) {
              suffix = b.suffix || '';
              branchLabel = b.label || '';
              break;
            }
          } catch (e) { /* некорректная regex — пропускаем */ }
        }
      }
      const value = (sc.prefix || '') + numStr + suffix;

      if (!(ctx && ctx.dryRun)) {
        sc.current = nextNum;
        sc.history = sc.history || [];
        sc.history.unshift({ value, url: (ctx && ctx.url) || '', branch: branchLabel, at: new Date().toISOString() });
        if (sc.history.length > 10) sc.history.length = 10;
        if (ctx) ctx.smartCountersDirty = true;
      }
      return value;
    },

    'list': (args, ctx) => {
      const name = (args[0] || '').trim();
      if (!name) return '';
      const lists = (ctx && ctx.customWordLists) || [];
      const wl = lists.find(x => x.name === name);
      if (!wl) return '{{list:' + name + '?}}';
      const words = (wl.words || '').split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
      if (!words.length) return '';
      return words[Math.floor(Math.random() * words.length)];
    },
  };

  // Публичное API
  window.FF = window.FF || {};
  window.FF.generators = generators;
  window.FF.generateFromRegex = generateFromRegex;
  window.FF.tokenList = Object.keys(generators);
  window.FF.presetLists = {
    english_words: ENGLISH_WORDS
  };
})();
