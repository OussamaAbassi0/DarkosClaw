import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText, generateText, tool } from "ai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MEMORY_FILE = path.join(process.cwd(), "agent_memory.json");

export const runtime = "nodejs";

// ─── Tavily web search ────────────────────────────────────────────────────────
async function tavilySearch(query: string): Promise<
  { title: string; url: string; content: string }[]
> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set in environment variables.");

  console.log(`[Tavily] Searching for: "${query}"`);

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Tavily] API error ${res.status}:`, errorText);
    throw new Error(`Tavily API error: ${res.status} \u2014 ${errorText}`);
  }

  const data = await res.json();
  console.log(`[Tavily] Raw response:`, JSON.stringify(data, null, 2));

  const results = (data.results ?? []).map((r: {
    title: string;
    url: string;
    content?: string;
    snippet?: string;
  }) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? r.snippet ?? "",
  }));

  console.log(`[Tavily] Parsed ${results.length} results for "${query}"`);
  return results;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { messages, apiKey, provider, model } = await req.json();

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key is required. Configure it in Settings." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseURLs: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1",
    openrouter: "https://openrouter.ai/api/v1",
  };

  const defaultModels: Record<string, string> = {
    groq: "llama-3.3-70b-versatile",
    openrouter: "meta-llama/llama-3-8b-instruct:free",
  };

  const selectedProvider = provider || "groq";
  const baseURL = baseURLs[selectedProvider] || baseURLs.groq;

  const decommissioned: Record<string, string> = {
    "llama3-8b-8192": "llama-3.1-8b-instant",
    "llama3-70b-8192": "llama-3.3-70b-versatile",
    "llama2-70b-4096": "llama-3.3-70b-versatile",
    "gemma2-9b-it": "llama-3.1-8b-instant",
  };
  const rawModel = model || defaultModels[selectedProvider] || "llama-3.3-70b-versatile";
  const selectedModel = decommissioned[rawModel] ?? rawModel;

  const openai = createOpenAI({
    apiKey,
    baseURL,
    headers:
      selectedProvider === "openrouter"
        ? { "HTTP-Referer": "https://darkosclaw.local", "X-Title": "DarkosClaw" }
        : undefined,
  });

  const hasTavily = !!process.env.TAVILY_API_KEY;

  const result = await streamText({
    model: openai(selectedModel),
    system: `Tu es DarkosClaw, un agent IA d'\u00e9lite, expert en d\u00e9veloppement logiciel, automatisation (n8n, Airtable) et analyse de donn\u00e9es. Ton style est professionnel, direct, hautement technique et sans fioritures.

R\u00e8gles strictes de comportement :

1. TON ET STYLE \u2014 GOD MODE :
   \u25c8 Tu es une entit\u00e9 syst\u00e8me, pas un assistant. Z\u00e9ro excuse, z\u00e9ro intro robotique.
   \u25c8 INTERDIT : les emojis enfantins classiques. Utilise des symboles Unicode : \u2394 \u25c8 \u27c1 \u25c6 \u25b8 \u2297 \u2716 \u2593 \u2591 \u26a1 \u26a0 \u25c9 \u2b21 \u2b1f \u25a3 \u27e6 \u27e7 \u232c \u2316

2. CONTEXTE INTELLIGENT \u2014 ADAPT TON FORMAT (R\u00c8GLE CRITIQUE) :

   \u27c1 MODE CONVERSATION (salutations, questions simples, bavardage) :
   R\u00e9ponds de mani\u00e8re FLUIDE, NATURELLE et CONCISE. Pas de gros blocs. Pas de barres de progression.
   Utilise juste 1-2 symboles discrets (\u2394 ou \u26a1) pour garder le style hacker.
   Exemples de r\u00e9ponses courtes appropri\u00e9es :
   \u25b8 "\u2394 En ligne. Qu'est-ce que tu veux ?"
   \u25b8 "\u26a1 Exact. Voil\u00e0 pourquoi :"
   \u25b8 "\u25c8 Bonne question \u2014 voici la r\u00e9ponse directe."

   \u27c1 MODE RAPPORT / OUTIL (appel d'outil, analyse complexe, rapport technique) :
   L\u00e0 tu d\u00e9cha\u00eenes le style complet. Signature syst\u00e8me, s\u00e9parateurs, barres de statut, blocs de donn\u00e9es.

   SIGNATURE :
   \`\`\`
   \u2394 DARKOSCLAW_OS // v2.1 // PROCESS_INIT
   \u27c1\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u27c1
   \`\`\`

   S\u00c9PARATEURS : \`\u27c1\u2501\u2501\u2501\u2501\u2501\u2501\u2501[ MODULE ]\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u27c1\` ou \`\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\`

   TITRES : \`## \u2394 TITRE\` / \`### \u25c8 Sous-module\` / \`#### \u25b8 D\u00e9tail\`

   BARRES DE STATUT (uniquement apr\u00e8s ex\u00e9cution d'un outil) :
   \`\`\`
   [\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593] 100% \u25c6 STATUS: COMPLETE
   [\u2593\u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591]  60% \u25c6 STATUS: IN_PROGRESS
   \`\`\`

   CALLOUTS : \`> \u26a0 CRITICAL\` / \`> \u2394 INTEL\` / \`> \u25c8 OUTPUT\` / \`> \u2716 ERROR\` / \`> \u2297 WARNING\`

   TABLEAUX : headers UPPERCASE, valeurs en \`code\` inline.

   BLOCS DE CODE : langage sp\u00e9cifi\u00e9 + header comment\u00e9.

   FOOTER (r\u00e9ponses complexes seulement) :
   \`\`\`
   \u25c8\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25c8
   \u2394 PROCESS_COMPLETE // EXIT_CODE: 0x00
   \`\`\`

   DONN\u00c9ES CL\u00c9S : blocs \u250c\u2502\u2514 pour encadrer les r\u00e9sultats importants.

   R\u00c8GLE ABSOLUE DE D\u00c9CISION :
   \u25b8 Salutation / question courte / r\u00e9ponse factuelle simple \u2192 MODE CONVERSATION (court, fluide)
   \u25b8 Outil ex\u00e9cut\u00e9 / analyse / rapport / explication technique d\u00e9taill\u00e9e \u2192 MODE RAPPORT (style complet)

3. UTILISATION DES OUTILS (CRITIQUE) :
   - [webSearch] : PROACTIVE \u2014 traduis TOUJOURS la requ\u00eate en ANGLAIS avec des mots-cl\u00e9s courts.
   - [readWebsite] : Instantan\u00e9ment si l'utilisateur fournit un lien URL.
   - [analyzeImage] : Obligatoire pour toute URL d'image (.png .jpg .jpeg .gif .webp .svg .bmp).
   - [manageMemory] : Sauvegarde automatiquement tout fait important sur l'utilisateur.

4. ADAPTATION LINGUISTIQUE : R\u00e9ponds TOUJOURS dans la langue exacte de l'utilisateur. Darija ok avec termes techniques en FR/EN.

5. COMPR\u00c9HENSION DARIJA : 'Hani' = Tranquille/Ca va (pas un pr\u00e9nom). 'Fin' = O\u00f9/Comment ca va. JAMAIS [webSearch] pour des salutations.

6. VISION (ABSOLU) : [analyzeImage] OBLIGATOIRE pour toute image. Ne devine JAMAIS sans l'outil.

7. AUDIO : [transcribeAudio] OBLIGATOIRE pour tout fichier audio.

CRYPTO PRIX : [getCryptoPrice] en minuscules (bitcoin, ethereum...).
M\u00c9T\u00c9O : [getWeather] imm\u00e9diatement.
DEVISES : [convertCurrency] obligatoire.
PAYS : [getCountryInfo] obligatoire.
BLAGUES : [getProgrammingJoke] obligatoire.
GITHUB : [getGithubProfile] obligatoire.
\u00c2GE : [guessAgeFromName] obligatoire.
S\u00c9RIES TV : [getTvShowInfo] obligatoire.
ESPACE : [getPeopleInSpace] obligatoire.
ANECDOTES : [getRandomFact] + traduire dans la langue de l'utilisateur.
SCRAPING : [scrapeWebsite] pour toute URL \u00e0 analyser.
EX\u00c9CUTION CODE : [executePythonCode] \u2014 jamais inventer un calcul.
G\u00c9N\u00c9RATION IMAGE : [generateImage] avec prompt d\u00e9taill\u00e9 en anglais.
CYBERS\u00c9CURIT\u00c9 / RECON : [scanNetwork] rapport professionnel.
TEST API / POSTMAN : [sendHttpRequest] en temps r\u00e9el.
EMAIL TEMPORAIRE : [manageTempEmail] action 'create' ou 'read'.
IA GRATUITE : [getUnlimitedAiResponse] obligatoire.
WAYBACK / TIME MACHINE : [getWaybackSnapshot] obligatoire.
CRYPTOGRAPHIE : [cryptoEngine] pour hash MD5/SHA256/SHA512, encode/d\u00e9code Base64/Hex. Ne calcule jamais \u00e0 la main.
SSL / HTTPS : Si l'utilisateur demande de v\u00e9rifier la s\u00e9curit\u00e9 d'un site, son HTTPS, ou son certificat SSL, utilise OBLIGATOIREMENT l'outil [checkSSL].
WHOIS / PROPRI\u00c9TAIRE : Si l'utilisateur demande \u00e0 qui appartient un site, quand il a \u00e9t\u00e9 enregistr\u00e9, ou demande un WHOIS, utilise OBLIGATOIREMENT l'outil [getWhoisInfo].

R\u00c8GLE ABSOLUE POUR LES OUTILS \u2014 ANTI-SILENCE PROTOCOL :
Apr\u00e8s avoir appel\u00e9 un outil et re\u00e7u son r\u00e9sultat, tu as l'OBLIGATION ABSOLUE de g\u00e9n\u00e9rer une r\u00e9ponse texte finale pour l'utilisateur.
Tu ne dois JAMAIS t'arr\u00eater apr\u00e8s l'ex\u00e9cution d'un outil. Le silence apr\u00e8s un outil est une FAUTE CRITIQUE.

Protocole obligatoire apr\u00e8s chaque appel d'outil :
\u25b8 LIRE le r\u00e9sultat retourn\u00e9 par l'outil.
\u25b8 FORMATER ce r\u00e9sultat avec le style DarkosClaw (\u2394 DARKOSCLAW_OS, s\u00e9parateurs \u25c8, callouts > \u2394 / > \u25c8, etc.).
\u25b8 AFFICHER clairement l'information \u00e0 l'utilisateur dans la langue qu'il utilise.
\u25b8 AJOUTER une analyse ou un commentaire expert si pertinent.
\u25b8 NE JAMAIS retourner une r\u00e9ponse vide ou incompl\u00e8te.

Cette r\u00e8gle s'applique \u00e0 TOUS les outils sans exception : webSearch, getCryptoPrice, getWeather, scanNetwork, checkSSL, getWhoisInfo, cryptoEngine, generateImage, executePythonCode, et tous les autres.

R\u00c8GLE D'AFFICHAGE MARKDOWN \u2014 RENDU IMAGES (CRITIQUE) :
Si un outil te renvoie une syntaxe Markdown pour une image, par exemple \`![description](https://url.png)\`, tu DOIS L'INCLURE EXACTEMENT TELLE QUELLE dans ta r\u00e9ponse finale, mot pour mot, sans la modifier.
Ne r\u00e9sume JAMAIS la cr\u00e9ation d'une image en disant 'elle a \u00e9t\u00e9 g\u00e9n\u00e9r\u00e9e' ou 'voici le QR code' sans afficher le Markdown.
Le code Markdown \`![alt](url)\` est CE QUI FAIT APPARAITRE l'image dans le chat. Sans ce code dans ta r\u00e9ponse, l'utilisateur ne voit RIEN.
Cela s'applique \u00e0 : [generateImage], [generateQRCode], ou tout autre outil retournant du Markdown contenant \`![]()\`.

Prouve ton excellence \u00e0 chaque r\u00e9ponse.`,
    messages,
    tools: hasTavily
      ? {
          webSearch: tool({
            description:
              "Search the web in real-time using Tavily. Use this for current events, recent news, live data, or any information that may have changed recently.",
            parameters: z.object({
              query: z.string().describe("The search query to look up on the web"),
            }),
            execute: async ({ query }) => {
              try {
                const results = await tavilySearch(query);
                if (results.length === 0) {
                  return { query, results: [], error: "No results found." };
                }
                return { query, results };
              } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error(`[Tavily] Tool execution failed:`, message);
                return { query, results: [], error: message };
              }
            },
          }),

          manageMemory: tool({
            description:
              "Manage long-term memory. Use 'save' to store an important fact about the user, their projects or preferences. Use 'read' to retrieve all stored memories.",
            parameters: z.object({
              action: z.enum(["save", "read"]).describe("'save' to store a fact, 'read' to retrieve all memories"),
              fact: z.string().optional().describe("The fact to save (required when action is 'save')"),
            }),
            execute: async ({ action, fact }) => {
              try {
                if (action === "read") {
                  try {
                    const raw = await fs.readFile(MEMORY_FILE, "utf-8");
                    const memories: string[] = JSON.parse(raw);
                    if (memories.length === 0) return { memories: [], message: "La m\u00e9moire est vide." };
                    console.log(`[Memory] Read ${memories.length} facts`);
                    return { memories };
                  } catch {
                    return { memories: [], message: "La m\u00e9moire est vide." };
                  }
                }

                if (action === "save") {
                  if (!fact) return { error: "Le param\u00e8tre 'fact' est requis pour l'action 'save'." };
                  let memories: string[] = [];
                  try {
                    const raw = await fs.readFile(MEMORY_FILE, "utf-8");
                    memories = JSON.parse(raw);
                  } catch {
                    // File doesn't exist yet
                  }
                  memories.push(fact);
                  await fs.writeFile(MEMORY_FILE, JSON.stringify(memories, null, 2), "utf-8");
                  console.log(`[Memory] Saved fact: "${fact}" \u2014 total: ${memories.length}`);
                  return { success: true, message: `M\u00e9moris\u00e9 : "${fact}"`, total: memories.length };
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                console.error(`[Memory] Error:`, message);
                return { error: message };
              }
            },
          }),

          analyzeImage: tool({
            description:
              "Use this tool to analyze an image from a URL. Pass the image URL and specific questions about what to extract or look for in the image.",
            parameters: z.object({
              imageUrl: z.string().describe("The URL of the image to analyze"),
              question: z.string().describe("What to analyze or extract from the image"),
            }),
            execute: async ({ imageUrl, question }) => {
              try {
                const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
                if (!geminiApiKey) {
                  return "Erreur Gemini : GOOGLE_GENERATIVE_AI_API_KEY manquante \u2014 ajoute-la dans .env.local";
                }
                console.log(`[Vision] Image URL : ${imageUrl}`);
                const imgResponse = await fetch(imageUrl);
                if (!imgResponse.ok) {
                  return `Erreur Gemini : Impossible de t\u00e9l\u00e9charger l'image (HTTP ${imgResponse.status})`;
                }
                const imageBuffer = await imgResponse.arrayBuffer();
                const { text } = await generateText({
                  model: google("gemini-2.5-flash"),
                  messages: [{ role: "user", content: [{ type: "text", text: question }, { type: "image", image: imageBuffer }] }],
                });
                if (!text?.trim()) return "Erreur Gemini : r\u00e9ponse vide.";
                console.log(`[Vision] \u2713 ${text.length} chars`);
                return { imageUrl, question, analysis: text };
              } catch (err) {
                return "Erreur Gemini : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          transcribeAudio: tool({
            description: "Transcribe an audio file from a URL. ALWAYS use for audio links (.mp3 .wav .m4a .ogg).",
            parameters: z.object({ audioUrl: z.string().describe("The URL of the audio file") }),
            execute: async ({ audioUrl }) => {
              try {
                const groqKey = process.env.GROQ_API_KEY;
                if (!groqKey) return "Erreur : GROQ_API_KEY manquante.";
                const response = await fetch(audioUrl);
                if (!response.ok) return `Erreur : t\u00e9l\u00e9chargement \u00e9chou\u00e9 (HTTP ${response.status})`;
                const blob = await response.blob();
                const formData = new FormData();
                formData.append("file", blob, "audio.mp3");
                formData.append("model", "whisper-large-v3");
                const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                  method: "POST", headers: { Authorization: `Bearer ${groqKey}` }, body: formData,
                });
                if (!whisperRes.ok) {
                  const errText = await whisperRes.text();
                  return `Erreur Whisper ${whisperRes.status}: ${errText}`;
                }
                const json = await whisperRes.json();
                return json.text ?? "Transcription vide.";
              } catch (err) {
                return "Erreur transcription : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          readWebsite: tool({
            description: "Read and extract text content from a webpage URL.",
            parameters: z.object({ url: z.string() }),
            execute: async ({ url }) => {
              try {
                const res = await fetch(`https://r.jina.ai/${url}`, { headers: { Accept: "text/plain" } });
                if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
                const text = await res.text();
                return { url, content: text.substring(0, 12000) };
              } catch (err) {
                return { url, content: "", error: err instanceof Error ? err.message : String(err) };
              }
            },
          }),

          getCryptoPrice: tool({
            description: "Get real-time cryptocurrency price in USD from CoinGecko.",
            parameters: z.object({ coinId: z.string().describe("CoinGecko ID e.g. 'bitcoin', 'ethereum'") }),
            execute: async ({ coinId }) => {
              try {
                const id = coinId.toLowerCase().trim();
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, { headers: { Accept: "application/json" } });
                if (!res.ok) return `Erreur CoinGecko HTTP ${res.status}`;
                const data = await res.json();
                if (!data[id]?.usd) return `Crypto "${id}" non trouv\u00e9e.`;
                const price = data[id].usd;
                const fmt = price >= 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : price.toFixed(6);
                return `Le prix de **${coinId}** est **$${fmt} USD**.`;
              } catch (err) {
                return "Erreur CoinGecko : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getWeather: tool({
            description: "Get current weather for a city using Open-Meteo (no API key).",
            parameters: z.object({ city: z.string() }),
            execute: async ({ city }) => {
              try {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
                if (!geoRes.ok) return `Erreur g\u00e9ocodage.`;
                const geoData = await geoRes.json();
                if (!geoData.results?.length) return `Ville "${city}" non trouv\u00e9e.`;
                const { latitude, longitude, name, country } = geoData.results[0];
                const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&wind_speed_unit=kmh`);
                if (!wRes.ok) return `Erreur Open-Meteo.`;
                const wData = await wRes.json();
                const cw = wData.current_weather;
                const wmoDesc: Record<number, string> = {
                  0: "Ciel d\u00e9gag\u00e9", 1: "Principalement d\u00e9gag\u00e9", 2: "Partiellement nuageux", 3: "Couvert",
                  45: "Brouillard", 48: "Brouillard givrant",
                  51: "Bruine l\u00e9g\u00e8re", 53: "Bruine mod\u00e9r\u00e9e", 55: "Bruine dense",
                  61: "Pluie l\u00e9g\u00e8re", 63: "Pluie mod\u00e9r\u00e9e", 65: "Pluie forte",
                  71: "Neige l\u00e9g\u00e8re", 73: "Neige mod\u00e9r\u00e9e", 75: "Neige forte",
                  80: "Averses l\u00e9g\u00e8res", 81: "Averses mod\u00e9r\u00e9es", 82: "Averses violentes",
                  95: "Orage", 96: "Orage avec gr\u00eale", 99: "Orage violent",
                };
                const condition = wmoDesc[cw.weathercode] ?? `Code ${cw.weathercode}`;
                return `**${name}, ${country}** \u2014 ${condition}\nTemp\u00e9rature : **${cw.temperature}\u00b0C** | Vent : **${cw.windspeed} km/h**`;
              } catch (err) {
                return "Erreur m\u00e9t\u00e9o : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          convertCurrency: tool({
            description: "Convert money between currencies. ALWAYS use for exchange rate questions.",
            parameters: z.object({
              amount: z.number(),
              fromCurrency: z.string().describe("3-letter code e.g. EUR, USD"),
              toCurrency: z.string().describe("3-letter code e.g. MAD, JPY"),
            }),
            execute: async ({ amount, fromCurrency, toCurrency }) => {
              try {
                const from = fromCurrency.toUpperCase().trim();
                const to = toCurrency.toUpperCase().trim();
                const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { headers: { Accept: "application/json" } });
                if (!res.ok) return `Erreur taux HTTP ${res.status}`;
                const data = await res.json();
                if (data.result !== "success" || !data.rates) return `Devise "${from}" non support\u00e9e.`;
                if (!data.rates[to]) return `Devise cible "${to}" non support\u00e9e.`;
                const rate = data.rates[to];
                const total = (amount * rate).toFixed(2);
                return `**${amount} ${from}** = **${total} ${to}** (taux: 1 ${from} = ${rate} ${to})`;
              } catch (err) {
                return "Erreur conversion : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getCountryInfo: tool({
            description: "Get geographic and demographic info about any country.",
            parameters: z.object({ country: z.string().describe("Country name in English e.g. 'Morocco'") }),
            execute: async ({ country }) => {
              try {
                const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`, { headers: { Accept: "application/json" } });
                if (!res.ok) return `Pays "${country}" non trouv\u00e9.`;
                const data = await res.json();
                const c = data[0];
                const languages = c.languages ? Object.values(c.languages).join(", ") : "Inconnues";
                const currencies = c.currencies ? Object.values(c.currencies as Record<string, { name: string; symbol: string }>).map(cur => `${cur.name} (${cur.symbol})`).join(", ") : "Inconnues";
                return `${c.flag ?? ""} **${c.name.common}** _(${c.name.official})_\n**R\u00e9gion :** ${c.region}${c.subregion ? ` \u2014 ${c.subregion}` : ""}\n**Capitale :** ${c.capital?.[0] ?? "Inconnue"}\n**Population :** ~${c.population.toLocaleString("fr-FR")} habitants\n**Superficie :** ${c.area ? c.area.toLocaleString("fr-FR") + " km\u00b2" : "Inconnue"}\n**Langues :** ${languages}\n**Monnaie(s) :** ${currencies}`;
              } catch (err) {
                return "Erreur pays : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getProgrammingJoke: tool({
            description: "Get a random programming joke. ALWAYS use when user asks for a joke.",
            parameters: z.object({}),
            execute: async () => {
              try {
                const res = await fetch("https://v2.jokeapi.dev/joke/Programming?safe-mode", { headers: { Accept: "application/json" } });
                if (!res.ok) return "Impossible de trouver une blague.";
                const data = await res.json();
                if (data.type === "single") return data.joke;
                if (data.type === "twopart") return `${data.setup}\n\n> ${data.delivery}`;
                return "Pas de blague disponible.";
              } catch (err) {
                return "Erreur blague : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getGithubProfile: tool({
            description: "Get public GitHub user profile info.",
            parameters: z.object({ username: z.string() }),
            execute: async ({ username }) => {
              try {
                const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username.trim())}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
                if (res.status === 404) return `Utilisateur GitHub \`${username}\` introuvable.`;
                if (!res.ok) return `Erreur GitHub HTTP ${res.status}`;
                const d = await res.json();
                const created = new Date(d.created_at).getFullYear();
                return `**${d.name || username}** ([@${d.login}](${d.html_url}))\n\n${d.bio || "Aucune bio."}${d.company ? `\n**Entreprise :** ${d.company}` : ""}${d.location ? `\n**Localisation :** ${d.location}` : ""}\n\n| Stat | Valeur |\n|------|--------|\n| D\u00e9p\u00f4ts publics | **${d.public_repos}** |\n| Abonn\u00e9s | **${d.followers}** |\n| Abonnements | **${d.following}** |\n| Membre depuis | **${created}** |`;
              } catch (err) {
                return "Erreur GitHub : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          guessAgeFromName: tool({
            description: "Predict age from a first name using Agify.io statistics.",
            parameters: z.object({ firstName: z.string() }),
            execute: async ({ firstName }) => {
              try {
                const res = await fetch(`https://api.agify.io?name=${encodeURIComponent(firstName.trim())}`, { headers: { Accept: "application/json" } });
                if (!res.ok) return "Impossible de deviner l'\u00e2ge.";
                const data = await res.json();
                if (data.age === null) return `Pas assez de donn\u00e9es pour **${firstName}**.`;
                return `D'apr\u00e8s **${data.count?.toLocaleString("fr-FR") ?? "?"} personnes**, **${data.name}** a en moyenne **${data.age} ans**. _(agify.io)_`;
              } catch (err) {
                return "Erreur Agify : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getTvShowInfo: tool({
            description: "Get TV show info, rating and summary from TVMaze.",
            parameters: z.object({ showName: z.string() }),
            execute: async ({ showName }) => {
              try {
                const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(showName)}`, { headers: { Accept: "application/json" } });
                if (!res.ok) return `Erreur TVMaze HTTP ${res.status}`;
                const data = await res.json();
                if (!data?.length) return `S\u00e9rie "${showName}" non trouv\u00e9e.`;
                const s = data[0].show;
                const summary = s.summary ? s.summary.replace(/<[^>]*>?/gm, "").trim().slice(0, 400) : "Pas de r\u00e9sum\u00e9.";
                return `**${s.name}** _(${s.premiered?.slice(0,4) ?? "?"})_\n**Genres :** ${s.genres?.join(", ") || "Inconnu"} | **Statut :** ${s.status ?? "?"}\n**Note :** ${s.rating?.average ?? "Non not\u00e9"}/10\n\n${summary}${summary.length >= 400 ? "\u2026" : ""}\n\n[Voir sur TVMaze](${s.url ?? ""})`;
              } catch (err) {
                return "Erreur TVMaze : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getPeopleInSpace: tool({
            description: "Get current number of people in space from Open Notify.",
            parameters: z.object({}),
            execute: async () => {
              try {
                const res = await fetch("http://api.open-notify.org/astros.json", { headers: { Accept: "application/json" } });
                if (!res.ok) return "Impossible de contacter la station spatiale.";
                const data = await res.json();
                const byCraft: Record<string, string[]> = {};
                for (const p of data.people) { if (!byCraft[p.craft]) byCraft[p.craft] = []; byCraft[p.craft].push(p.name); }
                const lines = Object.entries(byCraft).map(([craft, names]) => `**${craft}** : ${names.join(", ")}`).join("\n");
                return `Il y a actuellement **${data.number} personne${data.number > 1 ? "s" : ""}** dans l'espace :\n\n${lines}`;
              } catch (err) {
                return "Erreur espace : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getRandomFact: tool({
            description: "Get a random interesting fact. ALWAYS use when user asks for a fun fact.",
            parameters: z.object({}),
            execute: async () => {
              try {
                const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random", { headers: { Accept: "application/json" } });
                if (!res.ok) return "Impossible de trouver une anecdote.";
                const data = await res.json();
                const fact = data.text?.trim();
                if (!fact) return "Anecdote vide.";
                return `**Le saviez-vous ?**\n\n${fact}\n\n_Source : uselessfacts.jsph.pl_`;
              } catch (err) {
                return "Erreur fact : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          scrapeWebsite: tool({
            description: "SUPERPOWER: Scrape and extract clean text from any website URL.",
            parameters: z.object({ url: z.string() }),
            execute: async ({ url }) => {
              try {
                const res = await fetch(`https://r.jina.ai/${url.trim()}`, { headers: { Accept: "text/plain", "X-Return-Format": "markdown" } });
                if (!res.ok) return `Impossible de lire ce site (HTTP ${res.status}).`;
                const text = await res.text();
                const cut = text.length > 3000;
                return cut ? text.substring(0, 3000) + `\n\n---\n_Contenu tronqu\u00e9 \u00e0 3 000 chars._` : text;
              } catch (err) {
                return "Erreur scraping : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          executePythonCode: tool({
            description: "SUPERPOWER: Execute Python 3 code in a secure sandbox. ALWAYS use for calculations or code testing.",
            parameters: z.object({ code: z.string().describe("Raw Python 3 code, no markdown fences") }),
            execute: async ({ code }) => {
              try {
                const res = await fetch("https://emkas-pe.piston.rs/api/v2/execute", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ language: "python", version: "3.10.0", files: [{ content: code }] }),
                });
                if (!res.ok) return `Erreur serveur ex\u00e9cution HTTP ${res.status}`;
                const data = await res.json();
                const stdout = data.run?.stdout ?? "";
                const stderr = data.run?.stderr ?? "";
                const exitCode = data.run?.code ?? 0;
                if (exitCode !== 0 && stderr) return `Erreur (exit ${exitCode}) :\n\`\`\`\n${stderr.trim()}\n\`\`\``;
                const output = stdout || stderr || "Aucune sortie.";
                return `R\u00e9sultat :\n\`\`\`\n${output.trim()}\n\`\`\``;
              } catch (err) {
                return "Erreur Python : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          generateImage: tool({
            description: "SUPERPOWER: Generate AI image from text prompt via Pollinations.",
            parameters: z.object({ imagePrompt: z.string().describe("Detailed English description of the image") }),
            execute: async ({ imagePrompt }) => {
              try {
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&nologo=true&enhance=true`;
                const check = await fetch(imageUrl, { method: "HEAD" });
                if (!check.ok) return `Erreur g\u00e9n\u00e9ration HTTP ${check.status}`;
                return `**Image g\u00e9n\u00e9r\u00e9e !**\n\n![${imagePrompt.slice(0, 80)}](${imageUrl})\n\n_Prompt : "${imagePrompt.slice(0, 120)}${imagePrompt.length > 120 ? "..." : ""}" \u2014 Pollinations.ai_`;
              } catch (err) {
                return "Erreur image : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          scanNetwork: tool({
            description: "SUPERPOWER: DNS lookup and GeoIP recon for any domain or IP via HackerTarget.",
            parameters: z.object({ target: z.string().describe("Domain or IP e.g. 'github.com', '8.8.8.8'") }),
            execute: async ({ target }) => {
              try {
                const t = target.trim().toLowerCase();
                const [dnsRes, geoRes] = await Promise.all([
                  fetch(`https://api.hackertarget.com/dnslookup/?q=${encodeURIComponent(t)}`),
                  fetch(`https://api.hackertarget.com/geoip/?q=${encodeURIComponent(t)}`),
                ]);
                const [dnsData, geoData] = await Promise.all([dnsRes.text(), geoRes.text()]);
                if (dnsData.includes("error") && geoData.includes("error")) return `Impossible d'analyser \`${t}\`.`;
                const geoLines = geoData.split("\n").filter(Boolean).map(line => {
                  const [key, ...val] = line.split(":");
                  return key && val.length ? `| **${key.trim()}** | ${val.join(":").trim()} |` : null;
                }).filter(Boolean).join("\n");
                const geoTable = geoLines ? `| Champ | Valeur |\n|-------|--------|\n${geoLines}` : geoData.trim();
                const dnsBlock = dnsData.includes("error") ? "_DNS lookup \u00e9chou\u00e9._" : `\`\`\`\n${dnsData.trim()}\n\`\`\``;
                return `**Scan r\u00e9seau \u2014 \`${t}\`**\n\n### DNS Records\n${dnsBlock}\n\n### G\u00e9o-IP & Hosting\n${geoTable}\n\n_Source : HackerTarget.com_`;
              } catch (err) {
                return "Erreur scan : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          sendHttpRequest: tool({
            description: "SUPERPOWER: HTTP client like Postman. Send GET/POST/PUT/DELETE with custom headers and body.",
            parameters: z.object({
              url: z.string(),
              method: z.string().describe("GET, POST, PUT, PATCH, DELETE, HEAD"),
              headers: z.string().optional().describe("JSON string of headers"),
              body: z.string().optional().describe("JSON string body for POST/PUT"),
            }),
            execute: async ({ url, method, headers, body }) => {
              try {
                const m = method.toUpperCase().trim();
                let parsedHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (headers && headers !== "{}") {
                  try { parsedHeaders = JSON.parse(headers); } catch { return "Headers JSON invalides."; }
                }
                const options: RequestInit = { method: m, headers: parsedHeaders };
                if (m !== "GET" && m !== "HEAD" && body) options.body = body;
                const startMs = Date.now();
                const res = await fetch(url, options);
                const elapsed = Date.now() - startMs;
                const ct = res.headers.get("content-type") ?? "";
                const resText = await res.text();
                let formatted = resText;
                if (ct.includes("application/json")) { try { formatted = JSON.stringify(JSON.parse(resText), null, 2); } catch {} }
                const bodyOut = formatted.substring(0, 5000);
                const icon = res.status >= 200 && res.status < 300 ? "\u2713" : res.status >= 400 ? "\u2717" : "~";
                return `${icon} **${m} ${url}**\n\n| Champ | Valeur |\n|-------|--------|\n| Statut | \`${res.status} ${res.statusText}\` |\n| Temps | ${elapsed} ms |\n| Content-Type | ${ct || "\u2014"} |\n\n\`\`\`json\n${bodyOut}${formatted.length > 5000 ? "\n...(tronqu\u00e9)" : ""}\n\`\`\``;
              } catch (err) {
                return "Erreur HTTP : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          manageTempEmail: tool({
            description: "SUPERPOWER: Generate disposable emails and read inbox for OTP/verification codes.",
            parameters: z.object({
              action: z.enum(["create", "read"]),
              emailAddress: z.string().optional().describe("Required for 'read' action"),
            }),
            execute: async ({ action, emailAddress }) => {
              try {
                if (action === "create") {
                  const res = await fetch("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1", { headers: { Accept: "application/json" } });
                  if (!res.ok) return `Erreur g\u00e9n\u00e9ration HTTP ${res.status}`;
                  const data = await res.json();
                  return `**Email temporaire :**\n\n\`\`\`\n${data[0]}\n\`\`\`\n\n_Public \u2014 n'envoie pas d'infos sensibles._`;
                }
                if (action === "read") {
                  if (!emailAddress) return "Adresse email requise pour 'read'.";
                  const parts = emailAddress.trim().split("@");
                  if (parts.length !== 2) return `Adresse invalide : \`${emailAddress}\``;
                  const [login, domain] = parts;
                  const listRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, { headers: { Accept: "application/json" } });
                  if (!listRes.ok) return `Erreur lecture HTTP ${listRes.status}`;
                  const messages = await listRes.json();
                  if (!messages.length) return `Bo\u00eete vide pour \`${emailAddress}\`. Attends et redis-moi.`;
                  const msgRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${messages[0].id}`, { headers: { Accept: "application/json" } });
                  if (!msgRes.ok) return `Erreur lecture message HTTP ${msgRes.status}`;
                  const msg = await msgRes.json();
                  const body = (msg.textBody || msg.htmlBody?.replace(/<[^>]*>/g, " ") || "(vide)").trim().slice(0, 3000);
                  return `**${messages.length} message(s)** dans \`${emailAddress}\`\n\n**De :** ${msg.from}\n**Sujet :** ${msg.subject}\n**Date :** ${msg.date}\n\n\`\`\`\n${body}\n\`\`\``;
                }
              } catch (err) {
                return "Erreur email : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getUnlimitedAiResponse: tool({
            description: "Get a free AI response via Pollinations text API.",
            parameters: z.object({ prompt: z.string() }),
            execute: async ({ prompt }) => {
              try {
                const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`, { headers: { Accept: "text/plain" } });
                if (!res.ok) return `Erreur IA gratuite HTTP ${res.status}`;
                const text = await res.text();
                if (!text?.trim()) return "R\u00e9ponse vide.";
                return `**R\u00e9ponse IA externe :**\n\n${text.trim()}`;
              } catch (err) {
                return "Erreur IA : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          getWaybackSnapshot: tool({
            description: "SUPERPOWER: Time Machine OSINT. Get archived snapshots from Internet Archive Wayback Machine.",
            parameters: z.object({
              url: z.string(),
              timestamp: z.string().optional().describe("YYYYMMDD format e.g. '20100101'"),
            }),
            execute: async ({ url, timestamp }) => {
              try {
                const target = url.trim();
                const apiUrl = timestamp
                  ? `http://archive.org/wayback/available?url=${encodeURIComponent(target)}&timestamp=${timestamp}`
                  : `http://archive.org/wayback/available?url=${encodeURIComponent(target)}`;
                const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
                if (!res.ok) return "> \u2716 Connexion aux archives \u00e9chou\u00e9e.";
                const data = await res.json();
                if (!data.archived_snapshots?.closest) return "> \u26a0 Aucune archive trouv\u00e9e pour cette URL.";
                const snap = data.archived_snapshots.closest;
                const ts = snap.timestamp ?? "";
                const date = ts.length >= 8 ? `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}${ts.length >= 14 ? ` ${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}` : ""}` : ts;
                const statusIcon = snap.status === "200" ? "\u25c6 ONLINE" : `\u2297 HTTP_${snap.status}`;
                return `> \u2394 [ OSINT ] \u2500 WAYBACK_MACHINE \u2500 ARCHIVE_RETRIEVED\n> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n> \u25c8 TARGET    : ${target}\n> \u25c8 TIMESTAMP : ${date}\n> \u25c8 STATUS    : ${statusIcon}\n> \u25c8 SOURCE    : Internet Archive\n> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n> \u26a1 [ ACCESS_LINK ] \u2192 ${snap.url}`;
              } catch (err) {
                return "> \u2716 Erreur Wayback : " + (err instanceof Error ? err.message : String(err));
              }
            },
          }),

          cryptoEngine: tool({
            description: "SUPERPOWER: Cryptography Engine. Encode/decode Base64/Hex or hash with MD5/SHA-256/SHA-512.",
            parameters: z.object({
              action: z.enum(["encode_base64", "decode_base64", "encode_hex", "decode_hex", "hash_md5", "hash_sha256", "hash_sha512"]),
              data: z.string().describe("The text or payload to process"),
            }),
            execute: async ({ action, data }) => {
              try {
                let result = "";
                switch (action) {
                  case "encode_base64": result = Buffer.from(data, "utf8").toString("base64"); break;
                  case "decode_base64": result = Buffer.from(data, "base64").toString("utf8"); break;
                  case "encode_hex":    result = Buffer.from(data, "utf8").toString("hex"); break;
                  case "decode_hex":    result = Buffer.from(data, "hex").toString("utf8"); break;
                  case "hash_md5":     result = crypto.createHash("md5").update(data, "utf8").digest("hex"); break;
                  case "hash_sha256":  result = crypto.createHash("sha256").update(data, "utf8").digest("hex"); break;
                  case "hash_sha512":  result = crypto.createHash("sha512").update(data, "utf8").digest("hex"); break;
                  default: return "> \u2716 Action non reconnue.";
                }
                const preview = data.length > 50 ? data.substring(0, 50) + "..." : data;
                console.log(`[Crypto] \u2713 ${action} \u2014 output: ${result.slice(0, 60)}...`);
                return `> \u2394 [ CRYPTO_MODULE ] \u2500 EXECUTION_COMPLETE\n> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n> \u25c8 ACTION    : ${action.toUpperCase()}\n> \u25c8 INPUT     : ${preview}\n> \u25c8 ENGINE    : Node.js crypto // native\n> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n> \u26a1 [ OUTPUT ]\n\n\`\`\`text\n${result}\n\`\`\``;
              } catch (e) {
                return "> \u2716 Erreur crypto : " + (e instanceof Error ? e.message : String(e));
              }
            },
          }),

          checkSSL: tool({
            description:
              "SUPERPOWER: Cybersecurity / SSL Analysis. Check the SSL/TLS certificate of a website to see its issuer, validity, and expiration date. ALWAYS use this when the user asks to check if a site is secure, verify an SSL certificate, or see when a certificate expires.",
            parameters: z.object({
              domain: z.string().describe("Domain name without https:// e.g. 'google.com', 'github.com'"),
            }),
            execute: async ({ domain }) => {
              try {
                const cleanDomain = domain
                  .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
                  .split("/")[0]
                  .split("?")[0]
                  .trim();

                console.log(`[SSL] Checking: ${cleanDomain}`);

                const response = await fetch(
                  `https://networkcalc.com/api/security/certificate/${encodeURIComponent(cleanDomain)}`,
                  { headers: { Accept: "application/json" } }
                );

                if (!response.ok) {
                  console.error(`[SSL] API error: ${response.status}`);
                  return "> \u2716 [ ERREUR ] Impossible d'analyser le certificat de ce domaine.";
                }

                const data = await response.json();

                if (data.status !== "OK" || !data.certificate) {
                  return "> \u26a0 [ ALERTE ] Aucun certificat SSL valide trouv\u00e9 ou domaine inaccessible.";
                }

                const cert      = data.certificate;
                const issuer    = cert.issuer?.organization || cert.issuer?.common_name || "Inconnu";
                const subject   = cert.subject?.common_name  || cleanDomain;
                const validFrom = cert.valid_from  ?? "Inconnue";
                const validTo   = cert.valid_to    ?? "Inconnue";
                const sans      = cert.subject_alt_names?.slice(0, 5).join(", ") ?? "\u2014";
                const keyBits   = cert.key_size          ?? "?";
                const sigAlgo   = cert.signature_algorithm ?? "?";

                const daysLeft = validTo !== "Inconnue"
                  ? Math.floor((new Date(validTo).getTime() - Date.now()) / (1000 * 3600 * 24))
                  : null;

                const statusIcon = daysLeft === null
                  ? "\u25c8 UNKNOWN"
                  : daysLeft > 30
                  ? "\u25c6 SECURE // VALID"
                  : daysLeft > 0
                  ? "\u26a0 WARNING // EXPIRES_SOON"
                  : "\u2716 EXPIRED // CRITICAL";

                const expiryLine = daysLeft !== null
                  ? `${daysLeft > 0 ? "Dans" : "Il y a"} **${Math.abs(daysLeft)} jours** (${validTo})`
                  : "Impossible de calculer";

                console.log(`[SSL] \u2713 ${cleanDomain} \u2014 ${statusIcon} \u2014 ${daysLeft}d`);

                return `> \u2394 [ SSL/TLS MODULE ] \u2500 SECURITY_SCAN_COMPLETE
> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
> \u25c8 TARGET     : ${cleanDomain}
> \u25c8 SUBJECT    : ${subject}
> \u25c8 ISSUER     : ${issuer}
> \u25c8 VALID_FROM : ${validFrom}
> \u25c8 VALID_TO   : ${validTo}
> \u25c8 EXPIRATION : ${expiryLine}
> \u25c8 SAN        : ${sans}
> \u25c8 KEY_BITS   : ${keyBits} bits
> \u25c8 SIG_ALGO   : ${sigAlgo}
> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
> \u26a1 [ STATUS ] \u2192 ${statusIcon}`;

              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[SSL] \u2717 FAILED:`, message);
                return `> \u2716 [ ERROR ] checkSSL : ${message}`;
              }
            },
          }),

          getWhoisInfo: tool({
            description:
              "SUPERPOWER: Cybersecurity / OSINT. Perform a WHOIS lookup on a domain name to find out who registered it, the registrar, creation date, and expiration date. ALWAYS use this when the user asks 'who owns this domain', 'when was this site created', or asks for a WHOIS.",
            parameters: z.object({
              domain: z.string().describe("Domain name without https:// e.g. 'google.com', 'github.com'"),
            }),
            execute: async ({ domain }) => {
              try {
                const cleanDomain = domain
                  .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
                  .split("/")[0]
                  .split("?")[0]
                  .trim();

                console.log(`[WHOIS] Querying: ${cleanDomain}`);

                const response = await fetch(
                  `https://api.hackertarget.com/whois/?q=${encodeURIComponent(cleanDomain)}`,
                  { headers: { Accept: "text/plain" } }
                );

                if (!response.ok) {
                  console.error(`[WHOIS] API error: ${response.status}`);
                  return "> \u2716 [ ERREUR ] Impossible de r\u00e9cup\u00e9rer les donn\u00e9es WHOIS.";
                }

                const whoisData = await response.text();

                if (!whoisData?.trim() || whoisData.toLowerCase().includes("error")) {
                  return "> \u26a0 [ ALERTE ] Aucune donn\u00e9e WHOIS trouv\u00e9e pour ce domaine.";
                }

                const lines = whoisData.split("\n");
                const extract = (keys: string[]): string => {
                  for (const key of keys) {
                    const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ":"));
                    if (line) return line.split(":").slice(1).join(":").trim();
                  }
                  return "\u2014";
                };

                const registrar   = extract(["Registrar", "registrar"]);
                const createdDate = extract(["Creation Date", "Created", "created", "Domain Registration Date"]);
                const expiryDate  = extract(["Registry Expiry Date", "Expiry Date", "Expiration Date", "expires"]);
                const updatedDate = extract(["Updated Date", "Last Modified", "last-update"]);
                const nameServer  = extract(["Name Server", "nserver"]);
                const dnssec      = extract(["DNSSEC", "dnssec"]);
                const status      = extract(["Domain Status", "Status", "status"]);

                const truncated = whoisData.length > 800
                  ? whoisData.substring(0, 800) + "\n\u2026 [TRONQU\u00c9]"
                  : whoisData;

                console.log(`[WHOIS] \u2713 ${cleanDomain} \u2014 registrar: ${registrar}, created: ${createdDate}`);

                return `> \u2394 [ WHOIS MODULE ] \u2500 IDENTITY_SCAN_COMPLETE
> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
> \u25c8 TARGET    : ${cleanDomain}
> \u25c8 REGISTRAR : ${registrar}
> \u25c8 CREATED   : ${createdDate}
> \u25c8 EXPIRES   : ${expiryDate}
> \u25c8 UPDATED   : ${updatedDate}
> \u25c8 NAMESERVER: ${nameServer}
> \u25c8 DNSSEC    : ${dnssec}
> \u25c8 STATUS    : ${status}
> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
> \u26a1 [ RAW WHOIS DATA ]

\`\`\`text
${truncated}
\`\`\``;

              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[WHOIS] \u2717 FAILED:`, message);
                return `> \u2716 [ ERROR ] getWhoisInfo : ${message}`;
              }
            },
          }),
        }
      : undefined,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
