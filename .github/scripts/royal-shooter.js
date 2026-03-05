const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const GIFEncoder = require('gifencoder');

// 👑 God Mode Palette with Glow Support
const theme = {
  bg: '#0d0e15',
  shipBody: '#ffffff',
  shipWing: '#d4af37',
  laser: '#00e5ff',     // Cyan laser
  goldLight: '#d4af37', // High Commits
  goldDark: '#5a4b16',  // Low Commits (Darker to make the light ones pop)
  particle: '#00e5ff'   // Cyan explosions
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

  console.log(`> INITIATING V5 HUNTER-KILLER ENGINE FOR ${username}...`);
  const weeks = await fetchContributions(token, username);

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
  
  const gridStartX = 35;
  const blockSize = 10;
  const spacing = 15;
  
  // Load Commits into Target Array
  weeks.forEach((week, wIndex) => {
    week.contributionDays.forEach((day) => {
      if (day.contributionCount === 0) return;
      enemies.push({
        x: gridStartX + (wIndex * spacing),
        y: 20 + (day.weekday * spacing),
        size: blockSize,
        count: day.contributionCount, // Save the actual count for the AI to hunt
        health: day.contributionCount > 5 ? 3 : 1, // High commits take 3 hits
        color: day.contributionCount > 5 ? theme.goldLight : theme.goldDark
      });
    });
  });

  // The AI Ship
  let ship = { 
    x: width / 2, 
    y: 240, 
    speed: 8, // Very fast movement 
    cooldown: 0,
    target: null 
  };
  
  let stars = Array.from({length: 80}).map(() => ({
    x: Math.random() * width, y: Math.random() * height,
    speed: Math.random() * 1.5 + 0.2, size: Math.random() * 1.5
  }));

  // --- GAME LOOP ---
  const totalFrames = 200; // 5 seconds of absolute destruction
  
  for (let frame = 0; frame < totalFrames; frame++) {
    // 1. Clear Background (No Glow)
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
      star.y += star.speed;
      if (star.y > height) star.y = 0;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. HUNTER AI LOGIC 🤖
    // Find the highest commit block alive
    if (!ship.target || ship.target.health <= 0) {
      let aliveEnemies = enemies.filter(e => e.health > 0);
      if (aliveEnemies.length > 0) {
        // Sort by highest commits first. If tied, pick the closest one.
        aliveEnemies.sort((a, b) => b.count - a.count);
        ship.target = aliveEnemies[0];
      } else {
        ship.target = null; // All destroyed!
      }
    }

    // Move to track the target perfectly
    if (ship.target) {
      const targetCenter = ship.target.x + (ship.target.size / 2);
      const dx = targetCenter - ship.x;
      
      if (Math.abs(dx) > ship.speed) {
        ship.x += Math.sign(dx) * ship.speed; // Fly towards target
      } else {
        ship.x = targetCenter; // Lock on perfectly
        // Fire laser if cooldown is ready
        if (ship.cooldown <= 0) {
          bullets.push({ x: ship.x, y: ship.y - 15, speed: 18 }); // Ultra-fast lasers
          ship.cooldown = 4; // Rapid fire burst
        }
      }
    }
    if (ship.cooldown > 0) ship.cooldown--;

    // 4. Update Bullets & Collisions
    ctx.shadowBlur = 10;
    ctx.shadowColor = theme.laser; // Cyan Glow on lasers
    ctx.strokeStyle = theme.laser;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      let b = bullets[i];
      b.y -= b.speed;
      
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 15); ctx.stroke();

      for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (e.health > 0 && b.x > e.x && b.x < e.x + e.size && b.y < e.y + e.size && b.y > e.y) {
          e.health--;
          bullets.splice(i, 1); 
          
          if (e.health <= 0) {
            // Massive Cyan Particle Explosion
            for(let p=0; p<10; p++) {
              particles.push({
                x: e.x + e.size/2, y: e.y + e.size/2,
                vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
                life: 1.0
              });
            }
          }
          break;
        }
      }
      if (b.y < 0) bullets.splice(i, 1);
    }

    // 5. Draw Commits
    enemies.forEach(e => {
      if (e.health <= 0) return;
      
      // Only high-commit blocks get the Royal Gold Glow to save performance and look cool
      if (e.count > 5) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = theme.goldLight;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(e.x, e.y, e.size, e.size, 2) : ctx.rect(e.x, e.y, e.size, e.size);
      ctx.fill();
    });

    // 6. Draw Particles (Explosions)
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.particle; // Glowing explosions
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.08;
      if (p.life <= 0) particles.splice(i, 1);
      else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = theme.particle;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
    }
    ctx.globalAlpha = 1.0;

    // 7. Draw Ship (Glowing)
    ctx.shadowBlur = 12;
    ctx.shadowColor = theme.shipWing;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    // Wings
    ctx.fillStyle = theme.shipWing;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(20, 15); ctx.lineTo(-20, 15); ctx.fill();
    // Core
    ctx.shadowColor = theme.laser;
    ctx.fillStyle = theme.shipBody;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(8, 5); ctx.lineTo(-8, 5); ctx.fill();
    // Thruster
    ctx.fillStyle = theme.laser;
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.lineTo(0, 22 + (Math.random() * 5)); ctx.fill();
    ctx.restore();

    encoder.addFrame(ctx);
  }

  // --- FINISH ---
  encoder.finish();
  const dir = path.join(__dirname, '../../dist');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'royal-shooter.gif'), encoder.out.getData());
  console.log("> HUNTER-KILLER V5 GIF GENERATED SUCCESSFULLY.");
}

buildEngine().catch(console.error);
