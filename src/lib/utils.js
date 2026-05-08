export const CAT_ORDER = [
  "Leadership", "Strategy", "Macro & Policy", "Finance", "Technology",
  "Operations", "Marketing", "Personal Growth", "India & SMEs",
  "Productivity", "Mental Models", "Personal Interests", "Other"
]

export const SOURCE_TYPES = [
  "Article", "AI Conversation", "Book Note", "Video",
  "Personal Note", "Research", "PDF", "Image / Screenshot", "Podcast"
]

export const CAT_COLORS = {
  "Leadership":       { bg: "#fdf3ee", dot: "#b5502a" },
  "Strategy":         { bg: "#eef3fd", dot: "#2a5ab5" },
  "Macro & Policy":   { bg: "#edf7f0", dot: "#1e7a45" },
  "Finance":          { bg: "#fdfaee", dot: "#b5932a" },
  "Technology":       { bg: "#eefdfb", dot: "#2ab5a3" },
  "Operations":       { bg: "#f5eefd", dot: "#752ab5" },
  "Marketing":        { bg: "#fdeef3", dot: "#b52a5a" },
  "Personal Growth":  { bg: "#eefdf3", dot: "#2ab55a" },
  "India & SMEs":     { bg: "#fdf3fd", dot: "#b52ab5" },
  "Productivity":     { bg: "#fff8ee", dot: "#b56a00" },
  "Mental Models":    { bg: "#f0f4ff", dot: "#3a4ab5" },
  "Personal Interests": { bg: "#fef9f0", dot: "#c47d0e" },
  "Other":            { bg: "#f7f7f7", dot: "#6a6a6a" },
}

export const getCatColor = (cat) =>
  CAT_COLORS[cat] || { bg: "#f7f7f7", dot: "#6a6a6a" }

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

export const isYouTubeUrl = (text) =>
  /youtu\.be\/|youtube\.com\/watch|youtube\.com\/embed/.test(text?.trim())

export const extractYouTubeId = (text) => {
  const m = text?.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export const ytThumbnail = (id) =>
  `https://img.youtube.com/vi/${id}/hqdefault.jpg`

// Keyword scoring rules — each category has exclusive keywords
const RULES = {
  "Macro & Policy": [
    "rbi","reserve bank","monetary policy","fiscal policy","repo rate","reverse repo",
    "crr","slr","vrr","variable rate repo","liquidity","banking system","liquidity surplus",
    "liquidity deficit","open market operation","omo","government securities","g-sec",
    "inflation targeting","mpc","monetary policy committee","cpi inflation","wpi",
    "current account deficit","fiscal deficit","forex reserve","exchange rate",
    "budget deficit","disinvestment","public debt","rbi circular","sebi circular",
    "interbank","call money rate","statutory liquidity","cash reserve ratio","net liquidity",
    "rate cut","rate hike","interest rate cycle","net interest margin"
  ],
  "India & SMEs": [
    "sme","msme","small business","medium enterprise","micro enterprise",
    "mudra loan","stand up india","startup india","make in india","atma nirbhar",
    "msme registration","udyam","msme credit","msme policy","nbfc","microfinance",
    "priority sector lending","india growth","indian economy","india gdp",
    "india startup","indian founder","indian entrepreneur","india market",
    "india opportunity","rupee","crore","lakh","india trade","india export"
  ],
  "Finance": [
    "revenue","profit","cash flow","working capital","balance sheet","p&l",
    "profit and loss","ebitda","valuation","funding","equity","debt","loan",
    "interest expense","tax planning","accounting","financial model","budget",
    "invoice","receivable","payable","margin","roi","irr","npv","cap table",
    "term sheet","due diligence","venture capital","private equity","angel investor",
    "ipo","fundraising","financial statement","cash burn","runway","unit economics",
    "gross margin","net margin","operating leverage","debt service","collateral"
  ],
  "Technology": [
    "artificial intelligence","machine learning","deep learning","neural network",
    "software","saas","paas","iaas","api","cloud computing","algorithm",
    "automation","digital transformation","tech stack","platform","genai",
    "generative ai","llm","large language model","gpt","blockchain","web3",
    "cybersecurity","data science","data analytics","product management",
    "agile","devops","microservices","open source","no-code","low-code"
  ],
  "Leadership": [
    "leadership","leader","ceo","founder","managing director","board",
    "team culture","organisational culture","vision","mission","values",
    "decision making","delegation","accountability","governance","succession",
    "mentoring","coaching","talent management","people management",
    "psychological safety","trust","influence","executive","stakeholder"
  ],
  "Strategy": [
    "strategy","strategic planning","competitive advantage","market share",
    "positioning","differentiation","growth strategy","expansion","pivot",
    "business model","economic moat","disruption","innovation","diversification",
    "portfolio strategy","market entry","go to market","blue ocean","red ocean",
    "swot","scenario planning","competitive landscape","value proposition"
  ],
  "Operations": [
    "operations","process improvement","supply chain","logistics","manufacturing",
    "quality control","efficiency","standard operating procedure","sop",
    "workflow","capacity planning","vendor management","procurement",
    "inventory management","lean","six sigma","throughput","bottleneck"
  ],
  "Marketing": [
    "marketing","brand building","brand strategy","customer acquisition",
    "sales funnel","retention","campaign","content marketing","seo","sem",
    "social media","advertising","pricing strategy","customer journey",
    "crm","net promoter","nps","customer lifetime value","clv","ltv",
    "market research","product launch","go-to-market","distribution channel"
  ],
  "Personal Growth": [
    "mindset","habit","learning","self reflection","goal setting","purpose",
    "discipline","resilience","focus","clarity","wellbeing","mental health",
    "emotional intelligence","personal development","career growth","skill building",
    "growth mindset","fixed mindset","journaling","self awareness","burnout"
  ],
  "Productivity": [
    "productivity","time management","prioritisation","deep work","flow state",
    "routine","daily planning","organise","task management","inbox zero",
    "distraction","focus block","second brain","note taking","knowledge management",
    "pkm","gtd","getting things done","calendar blocking"
  ],
  "Mental Models": [
    "mental model","first principles","second order thinking","inversion",
    "systems thinking","feedback loop","heuristic","cognitive bias",
    "decision framework","probabilistic thinking","bayesian","network effect",
    "compounding","opportunity cost","sunk cost","survivorship bias",
    "pareto principle","parkinson law","dunning kruger","occam razor"
  ],
  "Personal Interests": [
    "motorcycle","bike","riding","rider","touring","adventure bike","sports bike",
    "kawasaki","yamaha","honda","suzuki","bajaj","royal enfield","ducati",
    "ninja","engine cc","horsepower","torque","suspension","tyre","tire",
    "fuel tank","seat height","curb weight","ride mode","quickshifter",
    "photography","camera","nikon","canon","sony","lens","aperture","shutter",
    "wildlife","safari","bird watching","drone","gopro","insta360",
    "travel","trek","hiking","cycling","running","fitness","gym",
    "cricket","football","tennis","golf","chess","gaming","music",
    "cooking","recipe","food","restaurant","book","novel","reading",
    "movie","film","series","netflix","documentary","podcast episode"
  ],
}

export function localCategorise(text) {
  if (!text) return "Other"
  const lower = text.toLowerCase()
  const scores = {}
  for (const [cat, kws] of Object.entries(RULES)) {
    scores[cat] = kws.reduce((s, kw) =>
      s + (lower.includes(kw) ? (kw.includes(" ") ? 4 : 1) : 0), 0)
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted[0][1] >= 3 ? sorted[0][0] : "Other"
}

export function extractTags(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const found = []
  for (const kws of Object.values(RULES)) {
    for (const kw of kws) {
      if (kw.length > 4 && lower.includes(kw)) found.push(kw)
    }
  }
  return [...new Set(found)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .map(t => t.replace(/\b\w/g, c => c.toUpperCase()))
}

export function detectSourceType(text, fileType) {
  if (fileType?.includes("pdf")) return "PDF"
  if (fileType?.includes("image")) return "Image / Screenshot"
  const l = text?.toLowerCase() || ""
  if (/chapter|book|author/.test(l)) return "Book Note"
  if (/claude|chatgpt|you said|i asked/.test(l)) return "AI Conversation"
  if (/youtu\.be|youtube\.com/.test(l)) return "Video"
  if (/study|research|survey|data shows/.test(l)) return "Research"
  if (/episode|podcast|transcript/.test(l)) return "Podcast"
  return "Article"
}

export function generateTitle(text) {
  if (!text) return "Untitled"
  const first = text.trim().split(/[\n.!?]/)[0].trim()
  return first.split(/\s+/).slice(0, 8).join(" ")
}

export function generateSummary(text) {
  if (!text) return ""
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(s => s.length > 15)
  return sentences.slice(0, 3).join(" ")
}

export function generateInsight(text) {
  if (!text) return ""
  const lower = text.toLowerCase()
  const markers = ["bottom line", "key takeaway", "in summary", "therefore", "this means"]
  for (const m of markers) {
    const idx = lower.indexOf(m)
    if (idx !== -1) {
      const snippet = text.slice(idx, idx + 200).split(/[.!?\n]/)[0].trim()
      if (snippet.length > 20) return snippet + "."
    }
  }
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(s => s.length > 30)
  return sentences[Math.min(3, sentences.length - 1)] || sentences[0] || ""
}
