// Content for the images in assets/. Edit this file and push; the
// "Update profile assets" workflow rebuilds the SVGs.
// Local build:  npm ci && GITHUB_TOKEN=$(gh auth token) npm run build

export default {
  login: "johnbosco-j",

  name: { first: "JOHNBOSCO", last: "J  ELANJIKAL", full: "Johnbosco J Elanjikal" },
  tag: "BUILDING AT RIVEN",
  role: "Full-stack developer  ·  Founder of Riven  ·  B.E. CSE, LICET",
  chips: ["TYPESCRIPT · PYTHON", "AI & COMPUTER VISION", "CHENNAI, INDIA"],

  // Rows on the About card: [label, value]
  about: [
    ["BASED IN", "Chennai, India"],
    ["EDUCATION", "B.E. Computer Science & Engineering, LICET  ·  3rd year"],
    ["ROLE", "Founder of Riven  ·  Full-stack developer"],
    ["FOCUS", "Web platforms, APIs and on-device computer vision"],
    ["STACK", "TypeScript · React · Next.js · Python · FastAPI · Supabase"],
    ["LANGUAGES", "English  ·  Tamil  ·  Malayalam"],
  ],
  motto: "Clear technology for the real world.",
  mottoBy: "RIVEN",

  // Section headers, in page order: file name -> title
  headers: {
    about: "About",
    projects: "Projects",
    stack: "Tech stack",
    now: "Currently",
    achievements: "Achievements",
    activity: "GitHub activity",
    contact: "Contact",
  },

  // Project cards. `accent` tints the card.
  projects: [
    {
      file: "clareo",
      title: "Clareo",
      kind: "WEB + DESKTOP  ·  FOUNDER & LEAD ENGINEER",
      status: { text: "SHIPPING", tone: "live" },
      summary: "Private, on-device fatigue, eye-strain and posture coaching for people who work at a screen all day.",
      metrics: [["12/12", "closed eyes caught"], ["0/46", "false positives"], ["115", "automated tests"]],
      stack: ["React", "TypeScript", "MediaPipe", "FastAPI", "Postgres", "Electron"],
      accent: "#3DDC97",
    },
    {
      file: "eyeguard",
      title: "EyeGuard",
      kind: "REAL-TIME FATIGUE API  ·  LEAD DEVELOPER",
      status: { text: "7TH · CTRL ALT HACK 2.0", tone: "gold" },
      summary: "A research-grade REST API that detects fatigue from a normal camera in real time, deployed live in one hackathon.",
      metrics: [["468", "face landmarks"], ["EAR·MAR", "PERCLOS + head pose"], ["REST+WS", "live streams"]],
      stack: ["Python", "FastAPI", "MediaPipe", "OpenCV", "WebSocket"],
      accent: "#FFC857",
    },
    {
      file: "licet-erp",
      title: "LICET CSE ERP",
      kind: "DEPARTMENT ERP  ·  FULL-STACK & ARCHITECT",
      status: { text: "LIVE", tone: "live" },
      summary: "The department ERP for Computer Science & Engineering at LICET: attendance, marks, leave, grievances and GPA under Regulations 2024.",
      metrics: [["3", "user roles"], ["RLS", "enforced in Postgres"], ["Audit", "append-only log"]],
      stack: ["Next.js", "Supabase", "Postgres", "Resend"],
      accent: "#8FB2FF",
    },
    {
      file: "chess",
      title: "Stockfish Chess",
      kind: "BROWSER ENGINE CLIENT  ·  DEVELOPER",
      status: { text: "SHIPPED", tone: "done" },
      summary: "Runs the Stockfish engine in WebAssembly workers behind a React UI, so the board stays responsive while it thinks.",
      metrics: [["WASM", "Stockfish in-browser"], ["Workers", "off the main thread"], ["React", "responsive board"]],
      stack: ["React", "WebAssembly", "Web Workers"],
      accent: "#FF6B7A",
    },
  ],

  // Achievement medals: [big, title, small]
  achievements: [
    ["7th", "Ctrl Alt Hack 2.0", "with EyeGuard"],
    ["5th", "Buildathon 3.0", "build sprint"],
    ["2026", "Founded Riven", "founder & owner"],
    ["DBMS", "Oracle certified", "Oracle"],
    ["DE", "German I", "NPTEL"],
  ],

  footer: "Johnbosco J Elanjikal  ·  Full-stack developer  ·  Chennai, India",

  // Languages to leave out of the Top languages card.
  excludeLanguages: [],
};
