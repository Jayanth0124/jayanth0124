const fs = require('fs');
const path = require('path');

// 👑 God Mode Palette
const theme = {
  bg: "#0d0e15",
  shipBody: "#ffffff",
  shipWing: "#d4af37", // Royal Gold wings
  laser: "#00e5ff",    // Cyan lasers
  goldLight: "#d4af37", // High Commits
  goldDark: "#8a7322",  // Low Commits
};

async function buildEngine() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_REPOSITORY_OWNER || "Jayanth0124";

  if (!token) {
    console.error("No GITHUB_TOKEN found. Engine offline.");
    process.exit(1);
  }

  console.log(`> INITIATING ROYAL SHOOTER V2 FOR ${username}...`);

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
  
  // Grab the last 16 weeks to act as the enemy armada
  const recentWeeks = weeks.slice(-16);

  const width = 800;
  const height = 400;
  
  // 2. Generate the Starfield Background
  let starsSvg = '';
  for(let i = 0; i < 50; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sr = Math.random() * 1.5;
    const delay = Math.random() * 3;
    starsSvg += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="0.3" style="animation: twinkle 3s infinite ${delay}s alternate;" />\n`;
  }

  // 3. Generate the Exploding Alien Grid (Your Commits)
  let blocksSvg = '';
  // Center the grid dynamically
  const gridStartX = (width - (16 * 25)) / 2; 

  recentWeeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      // 🚫 CRITICAL FIX: If no commits, DO NOT DRAW THE BOX. 
      if (day.contributionCount === 0) return;

      const x = gridStartX + (wIndex * 25);
      const y = 40 + (dIndex * 25);
      const blockSize = 14;
      
      let color = day.contributionCount > 5 ? theme.goldLight : theme.goldDark;
      
      // Randomize the explosion timing so they pop continuously
      const explodeDelay = (Math.random() * 8).toFixed(2);
      
      blocksSvg += `
        <rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="3" fill="${color}" class="alien" style="transform-origin: ${x + (blockSize/2)}px ${y + (blockSize/2)}px; animation-delay: ${explodeDelay}s;" />
      `;
    });
  });

  // 4. Construct the Highly Animated SVG
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="laserGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <style>
        /* Background Stars */
        @keyframes twinkle { 0% { opacity: 0.1; } 100% { opacity: 0.8; } }
        
        /* The Exploding Commits */
        @keyframes explode {
          0%, 75% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; fill: #ffffff; transform: scale(1.4); } /* Flashes white and puffs up */
          85%, 100% { opacity: 0; transform: scale(0); } /* Vaporizes */
        }
        .alien { animation: explode 8s infinite linear; }

        /* The Strafing Ship */
        @keyframes strafe {
          0% { transform: translateX(-180px); }
          50% { transform: translateX(180px); }
          100% { transform: translateX(-180px); }
        }
        .ship-group { animation: strafe 6s infinite ease-in-out; }

        /* The Laser Blasts */
        @keyframes fireLaser {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-350px); opacity: 0; }
        }
        .laser-beam { animation: fireLaser 0.6s infinite linear; }
        .laser-beam-delayed { animation: fireLaser 0.6s infinite linear; animation-delay: 0.3s; }
      </style>

      <rect width="${width}" height="${height}" fill="${theme.bg}" rx="15" />
      ${starsSvg}

      <g id="commit-grid">
        ${blocksSvg}
      </g>

      <g transform="translate(400, 360)" class="ship-group">
        
        <line x1="-12" y1="-10" x2="-12" y2="-30" stroke="${theme.laser}" stroke-width="3" stroke-linecap="round" class="laser-beam" filter="url(#laserGlow)"/>
        <line x1="12" y1="-10" x2="12" y2="-30" stroke="${theme.laser}" stroke-width="3" stroke-linecap="round" class="laser-beam-delayed" filter="url(#laserGlow)"/>

        <path d="M 0 -20 L 30 20 L -30 20 Z" fill="${theme.shipWing}" filter="url(#glow)"/>
        <path d="M 0 -25 L 15 15 L -15 15 Z" fill="${theme.shipBody}"/>
        <polygon points="-8,15 8,15 0,30" fill="${theme.laser}">
          <animate attributeName="opacity" values="1;0.4;1" dur="0.1s" repeatCount="indefinite"/>
        </polygon>
      </g>
    </svg>
  `;

  // 5. Save the Masterpiece
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path.join(dir, 'royal-shooter.svg'), svg.trim());
  console.log("> ROYAL SHOOTER V2 GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
