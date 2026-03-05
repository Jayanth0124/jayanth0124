const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const GIFEncoder = require('gifencoder');

// 👑 God Mode Palette
const theme = {
  bg: '#0d0e15',
  shipBody: '#ffffff',
  shipWing: '#d4af37',
  laser: '#00e5ff',
  goldLight: '#d4af37', // High Commits
  goldDark: '#8a7322',  // Low Commits
  particle: '#d4af37'
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
  // 🟢 FIX 1: Fetch all 52 weeks of the year, exactly like a real GitHub graph
  return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

async function buildEngine() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_REPOSITORY_OWNER || "Jayanth0124";

  if (!token) {
    console.error("No GITHUB_TOKEN found. Engine offline.");
    process.exit(1);
  }

  console.log(`> INITIATING TRUE 52-WEEK PHYSICS ENGINE FOR ${username}...`);
  const weeks = await fetchContributions(token, username);

  // 🟢 FIX 2: Widen the canvas to fit 52 weeks perfectly
  const width = 900; 
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);   
  encoder.setDelay(25);   // 40 FPS
  encoder.setQuality(10); 

  // --- GAME STATE ---
  let enemies = [];
  let bullets = [];
  let particles = [];
  
  // Center the 52-week grid horizontally
  const gridStartX = 35;
  const blockSize = 10;
  const spacing = 15;
  
  // Load Commits into Enemy Blocks
  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day) => {
      if (day.contributionCount === 0) return;
      // 🟢 FIX 3: Map exactly to the day of the week (day.weekday) so empty days leave perfect gaps
      enemies.push({
        x: gridStartX + (wIndex * spacing),
        y: 20 + (day.weekday * spacing),
        size: blockSize,
        health: day.contributionCount > 5 ? 2 : 1, 
        color: day.contributionCount > 5 ? theme.goldLight : theme.goldDark
      });
    });
  });

  // 🟢 FIX 4: Slow down the ship's movement speed to look heavier and more tactical
  let ship = { x: width / 2, y: 230, speed: 3.5, direction: 1 };
  
  let stars = Array.from({length: 80}).map(() => ({
    x: Math.random() * width, y: Math.random() * height,
    speed: Math.random() * 1.5 + 0.2, size: Math.random() * 1.5
  }));

  // --- GAME LOOP ---
  const totalFrames = 180; // Extended to ~4.5 seconds to watch the action
  
  for (let frame = 0; frame < totalFrames; frame++) {
    // 1. Draw Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
      star.y += star.speed;
      if (star.y > height) star.y = 0;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. Update Ship
    ship.x += ship.speed * ship.direction;
    if (ship.x > width - 50 || ship.x < 50) ship.direction *= -1;

    // 🟢 FIX 5: Slow down shooting drastically (Fires every 16 frames instead of 6)
    if (frame % 16 === 0) {
      // Switched to a single, powerful center laser instead of double lasers for better aiming at tiny blocks
      bullets.push({ x: ship.x, y: ship.y - 15, speed: 9 });
    }

    // 4. Update Bullets & Collisions
    ctx.strokeStyle = theme.laser;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      let b = bullets[i];
      b.y -= b.speed;
      
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 12); ctx.stroke();

      for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (b.x > e.x && b.x < e.x + e.size && b.y < e.y + e.size && b.y > e.y) {
          e.health--;
          bullets.splice(i, 1); 
          
          if (e.health <= 0) {
            for(let p=0; p<6; p++) {
              particles.push({
                x: e.x + e.size/2, y: e.y + e.size/2,
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                life: 1.0
              });
            }
            enemies.splice(j, 1);
          }
          break;
        }
      }
      if (b.y < 0) bullets.splice(i, 1);
    }

    // 5. Draw Commits
    enemies.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(e.x, e.y, e.size, e.size, 2) : ctx.rect(e.x, e.y, e.size, e.size);
      ctx.fill();
    });

    // 6. Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.06;
      if (p.life <= 0) particles.splice(i, 1);
      else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = theme.particle;
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
      }
    }
    ctx.globalAlpha = 1.0;

    // 7. Draw Ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.fillStyle = theme.shipWing;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(20, 12); ctx.lineTo(-20, 12); ctx.fill();
    ctx.fillStyle = theme.shipBody;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.fill();
    if (frame % 4 < 2) {
      ctx.fillStyle = theme.laser;
      ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 20); ctx.fill();
    }
    ctx.restore();

    encoder.addFrame(ctx);
  }

  // --- FINISH ---
  encoder.finish();
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'royal-shooter.gif'), encoder.out.getData());
  console.log("> TRUE 52-WEEK PHYSICS GIF GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
