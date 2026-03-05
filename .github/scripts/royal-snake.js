const fs = require('fs');
const path = require('path');

// 👑 God Mode Palette
const theme = {
  bg: '#0d0e15',          // Obsidian deep background
  border: '#3d3310',      // Dark gold futuristic HUD border
  glass: '#1a1c23',       // Empty grid cells (dark glass)
  goldLight: '#d4af37',   // High commits (Pure Gold)
  goldDark: '#7a6620',    // Low commits
  snake: '#00e5ff',       // Cyan neon cyber-worm
  glow: '#d4af37'         // Gold aura
};

async function fetchContributions(token, username) {
  const query = `
    query { user(login: "${username}") { contributionsCollection {
      contributionCalendar { weeks { contributionDays { weekday, contributionCount } } }
    } } }
  `;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

async function buildEngine() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_REPOSITORY_OWNER || "Jayanth0124";

  if (!token) {
    console.error("No GITHUB_TOKEN found. Engine offline.");
    process.exit(1);
  }

  console.log(`> INITIATING ROYAL SNAKE SVG ENGINE FOR ${username}...`);
  const weeks = await fetchContributions(token, username);

  const width = 1000;
  const height = 320;
  const gridStartX = 60;
  const gridStartY = 60;
  const blockSize = 12;
  const spacing = 16;

  let blocksSvg = '';
  
  // 1. Build the Commits Grid
  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day) => {
      const x = gridStartX + (wIndex * spacing);
      const y = gridStartY + (day.weekday * spacing);
      
      let fill = theme.glass;
      let filter = '';
      let stroke = `stroke="#2a2d39" stroke-width="1"`; // Glass border

      if (day.contributionCount > 5) {
        fill = theme.goldLight;
        filter = `filter="url(#goldGlow)"`;
        stroke = '';
      } else if (day.contributionCount > 0) {
        fill = theme.goldDark;
        stroke = '';
      }

      blocksSvg += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="3" fill="${fill}" ${stroke} ${filter} />\n`;
    });
  });

  // 2. Generate a custom zig-zag path for the Cyber-Worm
  let snakePath = `M ${gridStartX} ${gridStartY} `;
  let isDown = true;
  for(let w = 0; w < 52; w += 2) {
    const x1 = gridStartX + (w * spacing);
    const x2 = gridStartX + ((w+1) * spacing);
    if (isDown) {
      snakePath += `L ${x1} ${gridStartY + (6 * spacing)} L ${x2} ${gridStartY + (6 * spacing)} `;
    } else {
      snakePath += `L ${x1} ${gridStartY} L ${x2} ${gridStartY} `;
    }
    isDown = !isDown;
  }
  snakePath += `L 1000 ${gridStartY}`; // Snake exits right

  // 3. Construct the Highly Animated SVG
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <style>
        /* Cyber-Worm Slither Animation */
        .cyber-worm {
          stroke-dasharray: 250 4000; /* Length of the worm vs length of empty space */
          animation: slither 12s linear infinite;
        }
        @keyframes slither {
          0% { stroke-dashoffset: 4000; }
          100% { stroke-dashoffset: 0; }
        }
        
        /* HUD Breathing Glow */
        .hud-border {
          animation: breathe 4s ease-in-out infinite alternate;
        }
        @keyframes breathe {
          0% { stroke-opacity: 0.5; }
          100% { stroke-opacity: 1; }
        }
      </style>

      <rect width="${width}" height="${height}" fill="${theme.bg}" rx="15" />

      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="10" fill="none" stroke="${theme.border}" stroke-width="2" class="hud-border" />
      <path d="M 15 40 L 15 15 L 40 15" fill="none" stroke="${theme.goldLight}" stroke-width="3" filter="url(#goldGlow)" />
      <path d="M ${width - 15} 40 L ${width - 15} 15 L ${width - 40} 15" fill="none" stroke="${theme.goldLight}" stroke-width="3" filter="url(#goldGlow)" />
      <path d="M 15 ${height - 40} L 15 ${height - 15} L 40 ${height - 15}" fill="none" stroke="${theme.goldLight}" stroke-width="3" filter="url(#goldGlow)" />
      <path d="M ${width - 15} ${height - 40} L ${width - 15} ${height - 15} L ${width - 40} ${height - 15}" fill="none" stroke="${theme.goldLight}" stroke-width="3" filter="url(#goldGlow)" />

      <g id="commit-grid">
        ${blocksSvg}
      </g>

      <path d="${snakePath}" fill="none" stroke="${theme.snake}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="cyber-worm" filter="url(#cyanGlow)" />

    </svg>
  `;

  // 4. Save the Masterpiece
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path.join(dir, 'royal-snake.svg'), svg.trim());
  console.log("> ROYAL SNAKE SVG GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
