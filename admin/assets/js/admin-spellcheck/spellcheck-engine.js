/**
 * Built-in English dictionary — a set of common English words used by the
 * spellcheck worker when vendored nspell libraries are not available.
 *
 * This list (~5 000 most-common words) provides reasonable coverage for
 * everyday admin content. It is loaded once into a Set for O(1) lookup.
 *
 * To upgrade to a full dictionary, see vendor/spellcheck/README.md.
 */
const COMMON_WORDS = new Set([
  "a","able","about","above","accept","according","account","across","act","action",
  "actually","add","address","admit","afraid","after","afternoon","again","against","age",
  "ago","agree","ahead","air","all","allow","almost","alone","along","already",
  "also","although","always","among","amount","an","and","animal","another","answer",
  "any","anyone","anything","appear","apply","area","argue","arm","around","arrive",
  "art","article","artist","as","ask","assume","at","attack","attention","attorney",
  "audience","author","authority","available","avoid","away","baby","back","bad","bag",
  "ball","bank","bar","base","be","beat","beautiful","because","become","bed",
  "before","begin","behavior","behind","believe","benefit","best","better","between","beyond",
  "big","bill","billion","bit","black","blood","blue","board","body","book",
  "born","both","box","boy","break","bring","brother","brown","build","building",
  "business","but","buy","by","call","camera","campaign","can","candidate","capital",
  "car","card","care","career","carry","case","catch","cause","cell","center",
  "central","century","certain","certainly","chair","challenge","chance","change","character","charge",
  "check","child","choice","choose","church","citizen","city","civil","claim","class",
  "clear","clearly","close","coach","cold","collection","college","color","come","commercial",
  "common","community","company","compare","computer","concern","condition","conference","congress","consider",
  "consumer","contain","continue","control","cost","could","country","couple","course","court",
  "cover","create","crime","cultural","culture","cup","current","customer","cut","dark",
  "data","daughter","day","dead","deal","death","debate","decade","decide","decision",
  "deep","defense","define","degree","democrat","democratic","describe","design","despite","detail",
  "determine","develop","development","die","difference","different","difficult","dinner","direction","director",
  "discover","discuss","discussion","do","doctor","dog","door","down","draw","dream",
  "drive","drop","drug","during","each","early","east","easy","eat","economic",
  "economy","edge","education","effect","effort","eight","either","election","else","employee",
  "end","energy","enjoy","enough","enter","entire","environment","environmental","especially","establish",
  "even","evening","event","ever","every","everybody","everyone","everything","evidence","exactly",
  "example","executive","exist","expect","experience","expert","explain","eye","face","fact",
  "factor","fail","fall","family","far","fast","father","fear","federal","feel",
  "feeling","few","field","fight","figure","fill","film","final","finally","financial",
  "find","fine","finger","finish","fire","firm","first","fish","five","floor",
  "fly","focus","follow","food","foot","for","force","foreign","forget","form",
  "former","forward","four","free","friend","from","front","full","fund","future",
  "game","garden","gas","general","generation","get","girl","give","glass","go",
  "goal","good","government","great","green","ground","group","grow","growth","guess",
  "gun","guy","hair","half","hand","hang","happen","happy","hard","have",
  "he","head","health","hear","heart","heavy","help","her","here","herself",
  "high","him","himself","his","history","hit","hold","home","hope","hospital",
  "hot","hotel","hour","house","how","however","huge","human","hundred","husband",
  "i","idea","identify","if","image","imagine","impact","important","improve","in",
  "include","including","increase","indeed","indicate","individual","industry","information","inside","instead",
  "institution","interest","interesting","international","interview","into","investment","involve","issue","it",
  "item","its","itself","job","join","just","keep","key","kid","kill",
  "kind","kitchen","know","knowledge","land","language","large","last","late","later",
  "laugh","law","lawyer","lay","lead","leader","learn","least","leave","left",
  "leg","legal","less","let","letter","level","lie","life","light","like",
  "likely","line","list","listen","little","live","local","long","look","lose",
  "loss","lot","love","low","machine","magazine","main","maintain","major","majority",
  "make","man","manage","management","manager","many","market","marriage","material","matter",
  "may","maybe","me","mean","measure","media","medical","meet","meeting","member",
  "memory","mention","message","method","middle","might","military","million","mind","minute",
  "miss","mission","model","modern","moment","money","month","more","morning","most",
  "mother","mouth","move","movement","movie","mr","mrs","much","music","must",
  "my","myself","name","nation","national","natural","nature","near","nearly","necessary",
  "need","network","never","new","news","newspaper","next","nice","night","no",
  "none","nor","north","not","note","nothing","notice","now","number","occur",
  "of","off","offer","office","officer","official","often","oh","oil","ok",
  "old","on","once","one","only","onto","open","operation","opportunity","option",
  "or","order","organization","other","others","our","out","outside","over","own",
  "owner","page","pain","painting","paper","parent","part","participant","particular","particularly",
  "partly","party","pass","past","patient","pattern","pay","peace","people","per",
  "perform","performance","perhaps","period","person","personal","phone","physical","pick","picture",
  "piece","place","plan","plant","play","player","pm","point","police","policy",
  "political","politics","poor","popular","population","position","positive","possible","power","practice",
  "prepare","present","president","pressure","pretty","prevent","price","private","probably","problem",
  "process","produce","product","production","professional","professor","program","project","property","protect",
  "prove","provide","public","pull","purpose","push","put","quality","question","quickly",
  "quite","race","radio","raise","range","rate","rather","reach","read","ready",
  "real","reality","realize","really","reason","receive","recent","recently","recognize","record",
  "red","reduce","reflect","region","relate","relationship","religious","remain","remember","remove",
  "report","represent","republican","require","research","resource","respond","response","rest","result",
  "return","reveal","rich","right","rise","risk","road","rock","role","room",
  "rule","run","safe","same","save","say","scene","school","science","scientist",
  "score","sea","season","seat","second","section","security","see","seek","seem",
  "sell","send","senior","sense","series","serious","serve","service","set","seven",
  "several","shake","share","she","shoot","short","shot","should","shoulder","show",
  "side","sign","significant","similar","simple","simply","since","sing","single","sister",
  "sit","site","situation","six","size","skill","skin","small","smile","so",
  "social","society","soldier","some","somebody","someone","something","sometimes","son","song",
  "soon","sort","sound","source","south","southern","space","speak","special","specific",
  "speech","spend","sport","spring","staff","stage","stand","standard","star","start",
  "state","statement","station","stay","step","still","stock","stop","store","story",
  "strategy","street","strong","structure","student","study","stuff","style","subject","success",
  "successful","such","suddenly","suffer","suggest","summer","support","sure","surface","system",
  "table","take","talk","task","tax","teach","teacher","team","technology","television",
  "tell","ten","tend","term","test","than","thank","that","the","their",
  "them","themselves","then","theory","there","these","they","thing","think","third",
  "this","those","though","thought","thousand","threat","three","through","throughout","throw",
  "thus","time","to","today","together","tonight","too","top","total","tough",
  "toward","town","trade","traditional","training","travel","treat","treatment","tree","trial",
  "trip","trouble","true","truth","try","turn","tv","two","type","under",
  "understand","unit","until","up","upon","us","use","usually","value","various",
  "very","victim","view","violence","visit","voice","vote","wait","walk","wall",
  "want","war","watch","water","way","we","weapon","wear","week","weight",
  "well","west","western","what","whatever","when","where","whether","which","while",
  "white","who","whole","whom","whose","why","wide","wife","will","win",
  "wind","window","wish","with","within","without","woman","wonder","word","work",
  "worker","world","worry","would","write","writer","wrong","yard","yeah","year",
  "yes","yet","you","young","your","yourself",
  // Additional common English words for better coverage
  "abandon","ability","abortion","abroad","absence","absolutely","absorb","abstract","abuse",
  "academic","accelerate","accent","access","accident","accompany","accomplish","accurate",
  "accuse","achieve","achievement","acknowledge","acquire","adapt","addition","adequate",
  "adjust","administration","admire","admission","adopt","adult","advance","advanced",
  "advantage","adventure","advertise","advice","advise","adviser","advocate","affair",
  "affect","afford","agent","aggressive","agriculture","aid","aim","aircraft",
  "airline","airport","alarm","album","alcohol","alien","alive","alliance","ally",
  "alter","alternative","amaze","ambassador","ambition","analysis","analyst","analyze",
  "ancient","anger","angle","anniversary","announce","annual","anxiety","apart",
  "apartment","apology","apparent","appeal","appearance","apple","application","appoint",
  "approach","appropriate","approval","approve","architect","argument","arise","army",
  "arrange","arrest","arrow","aside","aspect","assault","assess","asset","assign",
  "assist","associate","association","assume","assure","atmosphere","attach","attempt",
  "attend","attitude","attract","attribute","auction","aunt","automatic","automatically","average",
  "award","aware","bake","balance","ban","band","barely","barrier","baseball",
  "basic","basically","basis","basket","battle","bay","beach","bean","bear",
  "beauty","bedroom","beer","beginning","belief","bell","belong","below","belt",
  "bench","bend","beneath","beside","bet","bible","bicycle","bind","biological",
  "bird","birth","birthday","bite","blade","blame","blank","blanket","blind",
  "block","blow","boat","bomb","bond","bone","bonus","boot","border",
  "boss","bottle","bottom","boundary","bowl","brain","branch","brand","brave",
  "bread","breakfast","breast","breath","breathe","brick","bridge","brief","briefly",
  "bright","brilliant","broad","broadcast","broken","brush","buck","budget","bug",
  "bullet","bunch","burden","burn","burst","bury","bus","bush","butter",
  "button","buyer","cabin","cabinet","cable","cake","calculate","calm","camp",
  "cancer","cap","capable","capacity","captain","capture","carbon","cast","castle",
  "casualty","catalog","category","catholic","celebrate","celebration","celebrity","cement","ceremony",
  "chain","chairman","chamber","champion","channel","chapter","characteristic","chart","chase",
  "cheap","cheek","cheese","chef","chemical","chest","chicken","chief","childhood",
  "chocolate","cholesterol","christian","christmas","cigarette","circle","circumstance","cite","citizenship",
  "civilian","classic","classroom","clean","client","climate","climb","clinic","clock",
  "cloth","clothing","cloud","club","cluster","coach","coal","coalition","coast",
  "coat","code","coffee","cognitive","collapse","colleague","collect","colonial","colony",
  "column","combat","combination","combine","comedy","comfortable","command","commander","comment",
  "commit","commitment","committee","communicate","communication","companion","compare","comparison","compete",
  "competition","competitive","complain","complaint","complete","complex","complicated","component","compose",
  "composition","comprehensive","concentrate","concentration","concept","conclusion","concrete","conduct","confidence",
  "confirm","conflict","confront","confusion","congressional","connect","connection","conscious","consciousness",
  "consequence","conservative","considerable","consideration","consist","consistent","constant","constitute","construct",
  "construction","consultant","consume","contact","contemporary","content","contest","context","continent",
  "contract","contribute","contribution","controversial","convention","conversation","convert","conviction","convince",
  "cook","cookie","cool","cooperation","cope","copy","core","corner","corporate",
  "corporation","correct","correspondent","corruption","cotton","counsel","count","counter","county",
  "courage","cousin","craft","crash","cream","create","creation","creative","creature",
  "credit","crew","crisis","criteria","critic","critical","criticism","criticize","crop",
  "cross","crowd","crucial","cultural","curious","curriculum","curve","custom","cut",
  "cycle","dad","daily","dance","dangerous","dare","database","dawn","deadline",
  "dealer","dear","debate","debt","deck","declare","decline","decrease","deer",
  "defeat","defend","defendant","deficit","define","definitely","definition","degree","delay",
  "deliver","demand","democracy","demonstrate","deny","depart","department","depending","deploy",
  "depression","derive","describe","description","desert","deserve","designer","desire","desk",
  "desperate","despite","destroy","destruction","detect","determine","developing","device","devote",
  "dialog","diet","differ","dig","digital","dimension","dining","direct","directly",
  "dirty","disability","disagree","disappear","disaster","discipline","discount","discover","discovery",
  "discrimination","disease","dish","dismiss","disorder","display","dispute","distance","distant",
  "distinct","distinguish","distribute","distribution","district","diverse","division","document","domain",
  "domestic","dominant","dominate","double","doubt","downtown","dozen","draft","drama",
  "dramatic","dress","drink","driver","drought","drug","dry","due","dump",
  "dust","duty","eager","ear","earn","earth","earthquake","ease","eastern",
  "echo","ecosystem","edge","edition","editor","educate","efficiency","efficient","egg",
  "elderly","elect","electricity","electronic","element","eliminate","elite","elsewhere","embrace",
  "emerge","emergency","emission","emotion","emotional","emphasis","emphasize","employ","employer",
  "empty","enable","encounter","encourage","enemy","engage","engine","engineer","engineering",
  "enhance","enormous","ensure","enterprise","entertainment","enthusiasm","entirely","entrance","entry",
  "episode","equal","equipment","equivalent","era","error","escape","essay","essential",
  "essentially","establishment","estate","estimate","ethics","evaluate","evaluation","evolution","evolve",
  "exact","examine","exceed","excellent","exception","exchange","excite","executive","exercise",
  "exhibit","exhibition","exist","existence","expand","expansion","expectation","expense","experiment",
  "explain","explanation","explode","explore","explosion","export","expose","exposure","express",
  "expression","extend","extension","extensive","extent","external","extra","extraordinary","extreme",
  "extremely","fabric","facility","factory","faculty","fade","failure","fair","fairly",
  "faith","false","fame","familiar","famous","fan","fantasy","farm","farmer",
  "fashion","fat","fate","fault","favor","favorite","feature","feedback","female",
  "fiction","file","filter","finally","finance","finding","finish","firm","fishing",
  "fitness","fix","flag","flame","flat","flavor","flee","flesh","flight",
  "float","flood","flow","flower","fluid","folk","following","football","forest",
  "forever","form","formal","formation","formula","forth","fortune","foundation","founder",
  "frame","framework","freedom","freeze","frequency","frequently","fresh","friendly","fruit",
  "frustration","fuel","fulfill","fully","functional","fundamental","funding","funeral","funny",
  "furniture","gain","galaxy","gallery","gang","gap","garage","gather","gay",
  "gaze","gender","gene","generate","generous","genetic","genius","gentle","genuine",
  "gesture","ghost","giant","gift","glad","glance","global","glory","glove",
  "god","gold","golden","govern","governor","grab","grade","gradually","graduate",
  "grain","grand","grandmother","grant","grass","grave","greatest","green","grocery",
  "growing","guarantee","guard","guidance","guide","guilty","guitar","gut","habitat",
  "hall","handful","handle","happen","hardware","harm","hat","hate","headline",
  "headquarters","healthy","hearing","heaven","height","helicopter","hell","hello","heritage",
  "hero","hidden","highlight","highly","highway","hip","hire","historian","historical",
  "hole","holiday","holy","homeland","homeless","homework","honest","honor","hook",
  "horizon","horror","host","household","housing","humor","hunt","hunter","hurt",
  "hypothesis","ice","ideal","ignore","illegal","illustrate","imagination","immediate","immigrant",
  "immigration","implement","implication","imply","import","importance","impose","impress","impression",
  "improvement","incentive","incident","income","increasingly","independence","independent","indication","indicator",
  "infant","infection","inflation","influence","inform","ingredient","initial","initially","initiative",
  "injury","inner","innocent","innovation","input","inquiry","insight","inspect","install",
  "instance","insurance","intellectual","intelligence","intend","intense","intention","interaction","internal",
  "interpret","interpretation","intervention","introduce","introduction","invasion","invest","investigate",
  "investigation","investigator","investment","investor","invite","involvement","iron","ironically",
  "island","isolated","jail","jet","jewish","joint","joke","journal","journey",
  "joy","judge","judgment","juice","jump","jungle","junior","jury","justice",
  "justify","killer","king","kiss","kitchen","knee","knife","knock","label",
  "labor","laboratory","lack","lake","landscape","lap","latter","launch","lawn",
  "lawsuit","layer","leadership","leading","league","lean","leather","lecture","legacy",
  "legend","legislation","legislative","legislature","lemon","length","lesson","liberal","liberty",
  "library","license","lifestyle","lifetime","lift","lightning","limit","limitation","link",
  "lip","literally","literary","literature","load","loan","lobby","locate","lock",
  "log","logic","long-term","loose","lord","loss","lover","lower","luck",
  "lunch","lung","mad","magic","mail","mainstream","manufacturer","manufacturing","map",
  "margin","marker","marketing","mass","massive","master","match","mate","mathematics",
  "maximum","mayor","meal","meaning","meanwhile","measurement","mechanism","medal","medication",
  "medium","membership","mental","mentally","mentor","menu","merchant","mere","merely",
  "metal","meter","middle","midnight","migration","mild","mine","mineral","minimum",
  "minister","ministry","minor","minority","miracle","mirror","missile","missing","missionary",
  "mistake","mix","mixture","mobility","mode","moderate","modest","molecule","mom",
  "monitor","monster","monthly","monument","mood","moral","moreover","mortgage","mostly",
  "motor","mountain","mouse","muscle","museum","mushroom","musical","muslim","mutual",
  "mystery","myth","narrative","narrow","nasty","native","naturally","navy","necessarily",
  "necessity","negative","negotiate","neighbor","neighborhood","nerve","net","nevertheless",
  "newly","nightmare","nobody","nod","noise","nomination","nonprofit","normal","normally",
  "notion","novel","nowhere","nuclear","numerous","nurse","nut","object","objective",
  "obligation","observation","observe","observer","obtain","obvious","obviously","occasion","occasionally",
  "occupy","ocean","odd","offense","offensive","officially","online","opening","operate",
  "operator","opinion","opponent","oppose","opposite","opposition","oral","orange","ordinary",
  "organic","organization","organize","orientation","origin","original","originally","ought","outcome",
  "outline","output","overcome","overlook","owe","oxygen","pace","pack","package",
  "paint","pair","palace","pale","pan","panel","pant","pants","parent",
  "parish","park","parking","participate","participation","passage","passenger","passion","pastor",
  "patch","patience","pause","peak","peer","penalty","pension","percentage","perception",
  "perfect","perfectly","permit","personality","personally","personnel","perspective","persuade","phase",
  "philosophy","phrase","physically","physician","piano","pile","pilot","pin","pine",
  "pink","pipe","pitch","plane","planet","planning","platform","please","pleasure",
  "plenty","plot","plus","pocket","poem","poet","poetry","pole","poll",
  "pollution","pool","pop","popular","portion","portrait","portray","pose","possess",
  "possession","possibility","possibly","pot","potato","potential","potentially","pour","poverty",
  "powder","powerful","practically","pray","prayer","precisely","predict","prefer","pregnancy",
  "preliminary","premise","premium","preparation","prescription","presence","presentation","preserve","press",
  "presumably","pretend","prevail","previously","pride","primarily","primary","prime","principal",
  "principle","print","prior","priority","prison","prisoner","privacy","privilege","prize",
  "proceed","proceeding","producer","profile","profit","program","progress","promise","promote",
  "prompt","proof","proper","properly","proportion","proposal","propose","prosecutor","prospect",
  "protection","protein","protest","proud","provision","psychological","psychology","publication","publicly",
  "publish","publisher","pulse","pump","purchase","pure","purple","pursue","puzzle",
  "qualify","quarter","queen","quest","quiet","quit","quote","racial","radical",
  "rain","rapid","rapidly","rare","rarely","rating","ratio","raw","react",
  "reaction","reader","reading","realistic","rebel","rebuild","recall","receipt","recession",
  "recipe","recognition","recommend","recommendation","recover","recovery","recruit","reduction",
  "reference","reform","refugee","refuse","regarding","regime","register","regulate",
  "regulation","reinforce","reject","relate","relation","relative","relatively","release",
  "relevant","relief","relieve","religion","rely","remain","remaining","remarkable",
  "remedy","remind","remote","repeatedly","replace","reporter","representative",
  "reputation","request","requirement","resemble","reservation","resign","resist","resistance",
  "resolution","resolve","resort","respondent","restaurant","restore","restriction",
  "retail","retain","retire","retirement","reveal","revenue","reverse","review",
  "revolution","rhythm","rice","ride","rifle","ring","riot","rise","ritual",
  "river","robot","roll","romantic","roof","root","rope","rough","roughly",
  "route","routine","royal","rub","ruin","rural","rush","sacred","sacrifice",
  "safety","sail","sake","salad","salary","sale","salt","sample","sanction",
  "sand","satellite","satisfaction","satisfy","scale","scandal","scared","scenario",
  "schedule","scholar","scholarship","scientific","scope","scream","screen","script",
  "seal","search","season","secret","secretary","sector","secure","seed",
  "segment","select","selection","senate","senator","sensitive","sentence","separate",
  "sequence","settle","settlement","severe","sex","sexual","shadow","shape",
  "sharply","shelter","shift","ship","shock","shoe","shopping","shore",
  "shortly","shower","signal","signature","significance","silence","silent","silly",
  "silver","similarly","sin","sing","sink","ski","slave","sleep","slice",
  "slide","slight","slightly","slip","slow","slowly","smart","smell","smoke",
  "smooth","snap","snow","so-called","soccer","soft","software","soil",
  "solar","solid","solution","solve","somehow","soul","soup","span","speaker",
  "specialist","species","specifically","spectrum","speed","spell","spending","spin",
  "spirit","spiritual","split","spokesman","sponsor","spot","spread","squad",
  "stable","stadium","stake","stamp","standard","standing","stare","statistics",
  "statue","status","steady","steal","steel","steep","stem","stick","stimulus",
  "stir","stock","stomach","stone","storage","storm","straight","strange",
  "stranger","strategic","stream","strengthen","stress","stretch","strike","string",
  "strip","stroke","strongly","struggle","studio","submit","subsequent","substance",
  "substantial","substitute","succeed","sudden","sue","sufficient","sugar","suggestion",
  "suicide","suit","sum","summit","sun","super","superior","supply","supporter",
  "suppose","supreme","surgery","surplus","surprise","surround","survey","survival",
  "survive","survivor","suspect","sustain","swear","sweep","sweet","swim","swing",
  "switch","symbol","symptom","syndrome","tactic","tail","talent","tank","tap",
  "target","taste","taxpayer","tea","tear","technical","technique","teenager",
  "temperature","temple","temporary","tension","territory","terror","terrorism",
  "terrorist","testify","testimony","testing","text","texture","thanks","theme",
  "theological","theology","theoretical","therapy","thick","thin","thinking",
  "thoroughly","thought","threaten","throw","thumb","ticket","tie","tight",
  "till","tiny","tip","tire","tissue","title","tobacco","toe","toll",
  "tone","tool","topic","toss","tour","tourist","tournament","tower","track",
  "tradition","traffic","trail","trainer","trait","transaction","transfer",
  "transform","transition","translate","transportation","trap","treasure","treaty",
  "tremendous","trend","tribe","trick","troop","truck","truly","trustee",
  "tube","tumor","tune","tunnel","twelve","twenty","twin","twist","typical",
  "typically","ugly","ultimate","ultimately","unable","uncertainty","uncle",
  "uncover","undergo","undermine","understanding","undertake","unemployment",
  "unfortunately","uniform","union","unique","universal","universe","unknown",
  "unlike","unlikely","upper","upset","urban","urge","used","useful",
  "valley","variable","variation","variety","vast","vegetable","vehicle",
  "venture","version","versus","vessel","veteran","via","victory","village",
  "violate","violation","virtually","virtue","visible","vision","visual",
  "vital","volume","volunteer","voter","vulnerable","wage","wake","wander",
  "warning","warrior","wave","weak","weakness","wealth","wealthy","weapon",
  "weekly","weird","welfare","wheat","wheel","whereas","whisper","widely",
  "widespread","wild","willing","wine","wing","winner","wipe","wire",
  "wisdom","wise","withdraw","witness","wonderful","wood","wooden","workshop",
  "worldwide","worm","worship","worth","worthwhile","wound","wrap","yard",
  "yield","zone",
]);

/**
 * Simple built-in spellchecker using the common words dictionary.
 * Provides `check(word)` → { correct, suggestions } with basic suggestions
 * generated via Levenshtein-distance lookups against the dictionary.
 */

/**
 * Compute Levenshtein distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

/**
 * Check if a word is correctly spelled.
 * @param {string} word
 * @param {Set<string>} customWords - additional learned/ignored words
 * @returns {{ correct: boolean, suggestions: string[] }}
 */
function check(word, customWords) {
  const lower = word.toLowerCase();

  // Allow words that are numbers, URLs, or contain special chars
  if (/^[0-9.]+$/.test(lower)) return { correct: true, suggestions: [] };
  if (lower.includes("://") || lower.includes("@")) return { correct: true, suggestions: [] };

  // Check custom dictionary first
  if (customWords && customWords.has(lower)) return { correct: true, suggestions: [] };

  // Check built-in dictionary
  if (COMMON_WORDS.has(lower)) return { correct: true, suggestions: [] };

  // Check common inflections (simple rules)
  if (lower.endsWith("s") && COMMON_WORDS.has(lower.slice(0, -1))) return { correct: true, suggestions: [] };
  if (lower.endsWith("es") && COMMON_WORDS.has(lower.slice(0, -2))) return { correct: true, suggestions: [] };
  if (lower.endsWith("ed") && COMMON_WORDS.has(lower.slice(0, -2))) return { correct: true, suggestions: [] };
  if (lower.endsWith("ing") && COMMON_WORDS.has(lower.slice(0, -3))) return { correct: true, suggestions: [] };
  if (lower.endsWith("er") && COMMON_WORDS.has(lower.slice(0, -2))) return { correct: true, suggestions: [] };
  if (lower.endsWith("est") && COMMON_WORDS.has(lower.slice(0, -3))) return { correct: true, suggestions: [] };
  if (lower.endsWith("ly") && COMMON_WORDS.has(lower.slice(0, -2))) return { correct: true, suggestions: [] };
  if (lower.endsWith("'s") && COMMON_WORDS.has(lower.slice(0, -2))) return { correct: true, suggestions: [] };

  // Generate suggestions via Levenshtein distance
  const suggestions = [];
  const threshold = Math.max(2, Math.floor(lower.length / 3));
  for (const dictWord of COMMON_WORDS) {
    const dist = levenshtein(lower, dictWord);
    if (dist <= threshold && dist > 0) {
      suggestions.push({ word: dictWord, dist });
    }
  }
  suggestions.sort((a, b) => a.dist - b.dist);
  return {
    correct: false,
    suggestions: suggestions.slice(0, 5).map((s) => s.word),
  };
}

/**
 * Check grammar in text. Returns an array of { start, end, message } for
 * each grammar issue found.
 *
 * Simple rule-based checks:
 * - Passive voice (common patterns: "was/were/is/are/been/being + past participle")
 * - Repeated words ("the the", "is is", etc.)
 * - Indefinite article ("a" before vowel sound)
 *
 * @param {string} text
 * @returns {{ start: number, end: number, message: string }[]}
 */
function checkGrammar(text) {
  const issues = [];

  // ── Repeated words ──────────────────────────────────────────────────
  const repeatedPattern = /\b(\w+)\s+\1\b/gi;
  let match;
  while ((match = repeatedPattern.exec(text)) !== null) {
    issues.push({
      start: match.index,
      end: match.index + match[0].length,
      message: `Repeated word: "${match[1]}"`,
    });
  }

  // ── Passive voice patterns ──────────────────────────────────────────
  const passivePatterns = [
    /\b(is|are|was|were|been|being|am)\s+(\w+(?:ed|en|t|d))\b/gi,
    /\b(is|are|was|were|been|being|am)\s+(\w+)\s+by\b/gi,
  ];
  for (const pattern of passivePatterns) {
    while ((match = pattern.exec(text)) !== null) {
      // Avoid re-flagging a range already marked
      const alreadyFlagged = issues.some(
        (i) => match.index >= i.start && match.index < i.end,
      );
      if (!alreadyFlagged) {
        issues.push({
          start: match.index,
          end: match.index + match[0].length,
          message: "Possible passive voice",
        });
      }
    }
  }

  // ── Indefinite article "a" before vowel sound ───────────────────────
  const aBeforeVowel = /\ba\s+(a[eiou]|e[eiou]|i[eiou]|o[eiou]|u[eiou]|honest|hour|heir)/gi;
  while ((match = aBeforeVowel.exec(text)) !== null) {
    const alreadyFlagged = issues.some(
      (i) => match.index >= i.start && match.index < i.end,
    );
    if (!alreadyFlagged) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        message: 'Use "an" instead of "a" before a vowel sound',
      });
    }
  }

  return issues;
}

export { check, checkGrammar };
