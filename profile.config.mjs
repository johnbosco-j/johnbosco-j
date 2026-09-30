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

  // Intro under the banner: [text, bold?] runs
  intro: [
    ["I’m a third-year Computer Science student at LICET in Chennai, and I run "],
    ["Riven", true],
    [", the technology company I founded in 2026. I like problems where software meets the real world, and I build them end to end: database, API, interface, and the part that runs on your device."],
  ],

  // Linked buttons: icon is "mail" or a simple-icons slug
  buttons: [{ file: "email", label: "hello@rivendevs.in", icon: "mail" }],

  // Smaller cards under the projects (links are in README.md)
  work: [
    { file: "olearn", kicker: "E-LEARNING PLATFORM  ·  PROJECT LEAD", title: "oLearn", desc: "Led a 4-member team through a 14-day agile sprint.", accent: "#8FB2FF" },
    { file: "riven-site", kicker: "COMPANY WEBSITE", title: "Riven website", desc: "Next.js 16, TypeScript, Tailwind, Framer Motion and three.js.", accent: "#FF6B7A" },
    { file: "8086", kicker: "EMULATOR  ·  PYTHON", title: "8086 trainer UI", desc: "Full-stack 8086 assembly emulator with a Python backend.", accent: "#B69CFF" },
    { file: "lincys", kicker: "CLIENT WEBSITE  ·  LIVE", title: "Lincy’s Makeover Artistry", desc: "Website for a certified celebrity makeup artist in Chennai.", accent: "#FFC857" },
  ],

  // Tech stack rows: [label, [[simple-icons slug or "db", name], …]]
  stack: [
    ["LANGUAGES", [["typescript", "TypeScript"], ["javascript", "JavaScript"], ["python", "Python"], ["c", "C"], ["openjdk", "Java"], ["db", "SQL"], ["intel", "8086 ASM"]]],
    ["FRAMEWORKS", [["react", "React"], ["nextdotjs", "Next.js"], ["vite", "Vite"], ["tailwindcss", "Tailwind CSS"], ["threedotjs", "three.js"], ["nodedotjs", "Node.js"], ["fastapi", "FastAPI"], ["electron", "Electron"], ["webassembly", "WebAssembly"]]],
    ["DATA & CLOUD", [["supabase", "Supabase"], ["postgresql", "PostgreSQL"], ["firebase", "Firebase"], ["vercel", "Vercel"], ["resend", "Resend"]]],
    ["AI & VISION", [["opencv", "OpenCV"], ["mediapipe", "MediaPipe"], ["claude", "Claude API"]]],
    ["TOOLS", [["git", "Git"], ["github", "GitHub"], ["githubactions", "GitHub Actions"], ["linux", "Linux"], ["ubuntu", "Ubuntu"]]],
  ],

  // "Currently" card: [kicker, title, detail]
  now: [
    ["RUNNING", "Riven", "The company site, client websites and AI work."],
    ["BUILDING", "LICET CSE ERP", "Attendance, marks and leave for the department  ·  cseerp.vercel.app"],
    ["STUDYING", "B.E. Computer Science", "3rd year at LICET, Chennai."],
  ],
  nowUpdated: "UPDATED SEPTEMBER 2026",

  contact: ["Open to collaborations, client projects and hackathon teams.", "Riven builds websites and AI systems for people who need them, at a minimal cost."],

  footer: "Johnbosco J Elanjikal  ·  Full-stack developer  ·  Chennai, India",

  // Languages to leave out of the Top languages card.
  excludeLanguages: [],
};
