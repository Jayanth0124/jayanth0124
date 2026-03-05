const fs = require('fs');
const path = require('path');

// The Royal Theme Palette
const theme = {
  bg: "#0d0e15",
  glass: "#1a1c23",
  ship: "#ffffff",
  laser: "#00e5ff", // Cyan laser for contrast against gold
  goldLight: "#d4af37",
  goldDark: "#7a6620",
  empty: "#2a2d39"
};

async function buildEngine() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_REPOSITORY_OWNER || "Jayanth0124";

  if (!token) {
    console.error("No GITHUB_TOKEN found. Engine offline.");
    process.exit(1);
  }

  console.log(`> UPLINK ESTABLISHED. Fetching data for ${username}...`);

  // 1. Fetch live GitHub Contributions
  const query = `
    query {
      user(login: "${username}") {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;
  
  // Grab the last 15 weeks to act as the "Space Invaders" enemy armada
  const recentWeeks = weeks.slice(-15);

  // 2. Build the SVG Game Board
  const width = 800;
  const height = 350;
  let blocksSvg = '';

  recentWeeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      const x = 50 + (wIndex * 45);
      const y = 30 + (dIndex * 25);
      
      let color = theme.empty;
      let glow = '';
      let isTarget = false;

      if (day.contributionCount > 5) { color = theme.goldLight; glow = 'filter="url(#glow)"'; isTarget = true; }
      else if (day.contributionCount > 0) { color = theme.goldDark; isTarget = true; }

      // Draw the commit block
      blocksSvg += `<rect x="${x}" y="${y}" width="18" height="18" rx="4" fill="${color}" ${glow} class="${isTarget ? 'target' : ''}"/>\n`;
    });
  });

  // 3. Generate the Final Animated SVG
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <style>
        .target { animation: pulse 3s infinite alternate; }
        .laser { animation: shoot 1.5s infinite linear; stroke-dasharray: 20 100; }
        .laser-2 { animation: shoot 1.5s infinite linear; animation-delay: 0.7s; stroke-dasharray: 20 100; }
        
        @keyframes pulse { 0% { opacity: 0.8; } 100% { opacity: 1; transform: scale(1.05); } }
        @keyframes shoot { 0% { stroke-dashoffset: 200; opacity: 1; } 100% { stroke-dashoffset: -100; opacity: 0; } }
      </style>

      <rect width="${width}" height="${height}" fill="${theme.bg}" rx="15" stroke="${theme.goldDark}" stroke-width="2"/>
      
      <g transform="translate(40, 0)">
        ${blocksSvg}
      </g>

      <g transform="translate(360, 270)">
        <path d="M 40 0 L 80 60 L 40 45 L 0 60 Z" fill="${theme.ship}" filter="url(#glow)"/>
        <path d="M 40 10 L 55 50 L 40 40 L 25 50 Z" fill="${theme.glass}"/>
        <polygon points="35,45 45,45 40,65" fill="${theme.laser}" filter="url(#glow)">
          <animate attributeName="opacity" values="1;0.5;1" dur="0.2s" repeatCount="indefinite"/>
        </polygon>
      </g>

      <line x1="400" y1="270" x2="400" y2="50" stroke="${theme.laser}" stroke-width="4" class="laser" filter="url(#glow)"/>
      <line x1="380" y1="280" x2="300" y2="50" stroke="${theme.laser}" stroke-width="3" class="laser-2" filter="url(#glow)"/>
      <line x1="420" y1="280" x2="500" y2="50" stroke="${theme.laser}" stroke-width="3" class="laser-2" filter="url(#glow)"/>

    </svg>
  `;

  // 4. Save the file
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path.join(dir, 'royal-shooter.svg'), svg.trim());
  console.log("> SVG GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
