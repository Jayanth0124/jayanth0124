const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const GIFEncoder = require('gifencoder');

// 👑 God Mode Palette
const theme = {
  bg: '#0d0e15',
  glass: '#1a1c23',
  shipBody: '#ffffff',
  shipWing: '#d4af37',
  laser: '#00e5ff',
  goldLight: '#d4af37',
  goldDark: '#8a7322',
  particle: '#d4af37'
};

async function fetchContributions(token, username) {
  const query = `
    query { user(login: "${username}") { contributionsCollection {
      contributionCalendar { weeks { contributionDays { contributionCount } } }
    } } }
  `;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  return data.data.user.contributionsCollection.contributionCalendar.weeks.slice(-16);
}

async function buildEngine() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_REPOSITORY_OWNER || "Jayanth0124";

  if (!token) {
    console.error("No GITHUB_TOKEN found. Engine offline.");
    process.exit(1);
  }

  console.log(`> INITIATING TRUE PHYSICS ENGINE FOR ${username}...`);
  const weeks = await fetchContributions(token, username);

  // --- ENGINE SETUP ---
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);   // Infinite loop
  encoder.setDelay(25);   // 40 FPS (1000ms / 40)
  encoder.setQuality(10); // High quality

  // --- GAME STATE ---
  let enemies = [];
  let bullets = [];
  let particles = [];
  const gridStartX = (width - (16 * 20)) / 2;
  
  // Load Commits into Enemy Blocks
  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day, dIndex) => {
      if (day.contributionCount === 0) return;
      enemies.push({
        x: gridStartX + (wIndex * 25),
        y: 40 + (dIndex * 25),
        size: 14,
        health: day.contributionCount > 5 ? 2 : 1, // High commits take 2 hits
        color: day.contributionCount > 5 ? theme.goldLight : theme.goldDark
      });
    });
  });

  // Ship Setup
  let ship = { x: width / 2, y: 350, speed: 6, direction: 1 };
  
  // Stars Setup
  let stars = Array.from({length: 60}).map(() => ({
    x: Math.random() * width, y: Math.random() * height,
    speed: Math.random() * 2 + 0.5, size: Math.random() * 1.5
  }));

  // --- GAME LOOP (Simulate 150 Frames = ~4 seconds of GIF) ---
  const totalFrames = 150;
  
  for (let frame = 0; frame < totalFrames; frame++) {
    // 1. Clear Screen (Draw Background)
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Update & Draw Stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
      star.y += star.speed;
      if (star.y > height) star.y = 0;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. Update Ship Logic
    ship.x += ship.speed * ship.direction;
    if (ship.x > width - 100 || ship.x < 100) ship.direction *= -1;

    // Ship Shooting (Fire every 6 frames)
    if (frame % 6 === 0) {
      bullets.push({ x: ship.x - 10, y: ship.y - 10, speed: 12 });
      bullets.push({ x: ship.x + 10, y: ship.y - 10, speed: 12 });
    }

    // 4. Update & Draw Bullets
    ctx.strokeStyle = theme.laser;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      let b = bullets[i];
      b.y -= b.speed;
      
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y + 15);
      ctx.stroke();

      // Check Collision with Enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (b.x > e.x && b.x < e.x + e.size && b.y < e.y + e.size && b.y > e.y) {
          e.health--;
          bullets.splice(i, 1); // Destroy bullet
          
          if (e.health <= 0) {
            // SPRAWN PARTICLE EXPLOSION
            for(let p=0; p<8; p++) {
              particles.push({
                x: e.x + e.size/2, y: e.y + e.size/2,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                life: 1.0
              });
            }
            enemies.splice(j, 1); // Destroy enemy
          }
          break;
        }
      }
      if (b.y < 0) bullets.splice(i, 1);
    }

    // 5. Draw Enemies
    enemies.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(e.x, e.y, e.size, e.size, 3) : ctx.rect(e.x, e.y, e.size, e.size);
      ctx.fill();
    });

    // 6. Update & Draw Particles (Explosions)
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05; // Fade out
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = theme.particle;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
    }
    ctx.globalAlpha = 1.0;

    // 7. Draw Ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    
    // Wings
    ctx.fillStyle = theme.shipWing;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(25, 15); ctx.lineTo(-25, 15); ctx.fill();
    // Core
    ctx.fillStyle = theme.shipBody;
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.fill();
    // Thruster (Flickers)
    if (frame % 2 === 0) {
      ctx.fillStyle = theme.laser;
      ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(6, 10); ctx.lineTo(0, 25); ctx.fill();
    }
    ctx.restore();

    // 8. Capture Frame to GIF
    encoder.addFrame(ctx);
  }

  // --- FINISH AND SAVE ---
  encoder.finish();
  const buffer = encoder.out.getData();
  
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(path.join(dir, 'royal-shooter.gif'), buffer);
  console.log("> TRUE PHYSICS GIF GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
