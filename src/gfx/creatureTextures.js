import { canvasTex, frameStrip } from './util.js';

/**
 * Enemy and boss art. Enemy bodies are near-black with white highlights/eyes so a
 * per-type tint colours their glow while the silhouette stays dark.
 */
export default function makeCreatureTextures(scene) {
  slime(scene);
  bat(scene);
  hunter(scene);
  guardian(scene);
  slimeKing(scene);
  golem(scene);
  noctis(scene);
  prism(scene);
}

const BODY = '#08070c';
const rim = (ctx, blur = 6) => {
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = blur;
};
const eyes = (ctx, pts, rx = 2, ry = 3) => {
  ctx.save();
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

function slime(scene) {
  frameStrip(scene, 'slime', 44, 32, { slime0: { sx: 1, sy: 1 }, slime1: { sx: 1.15, sy: 0.82 }, slime2: { sx: 0.88, sy: 1.15 } }, (ctx, ox, f) => {
    const cx = ox + 22;
    const bottom = 31;
    const w = 17 * f.sx;
    const h = 22 * f.sy;
    ctx.save();
    rim(ctx);
    ctx.fillStyle = BODY;
    ctx.beginPath();
    ctx.moveTo(cx - w, bottom);
    ctx.bezierCurveTo(cx - w - 2, bottom - h * 0.9, cx - w * 0.3, bottom - h - 3, cx + 2, bottom - h);
    ctx.bezierCurveTo(cx + w * 0.7, bottom - h, cx + w + 2, bottom - h * 0.7, cx + w, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    eyes(ctx, [[cx + 3, bottom - h * 0.55], [cx + 10, bottom - h * 0.55]], 2, 3);
  });
}

function bat(scene) {
  const wing = (ctx, cx, cy, dir, lift) => {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 4, cy);
    ctx.quadraticCurveTo(cx + dir * 12, cy - 6 - lift, cx + dir * 20, cy - 2 - lift * 1.3);
    ctx.lineTo(cx + dir * 17, cy + 3 - lift * 0.4);
    ctx.lineTo(cx + dir * 13, cy + 1);
    ctx.lineTo(cx + dir * 9, cy + 5);
    ctx.closePath();
    ctx.fill();
  };
  frameStrip(scene, 'bat', 48, 34, { bat0: { lift: 8 }, bat1: { lift: 0 }, bat2: { lift: -8 }, batHang: { hang: true } }, (ctx, ox, f) => {
    const cx = ox + 24;
    const cy = 17;
    ctx.save();
    rim(ctx, 5);
    ctx.fillStyle = BODY;
    if (f.hang) {
      // Wrapped in wings, hanging upside down (feet at the top).
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 8, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 3, 1, 2, 5);
      ctx.fillRect(cx + 1, 1, 2, 5);
      ctx.restore();
      eyes(ctx, [[cx - 3, cy + 8], [cx + 3, cy + 8]], 1.3, 1.6);
      return;
    }
    wing(ctx, cx, cy, -1, f.lift);
    wing(ctx, cx, cy, 1, f.lift);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 5);
    ctx.lineTo(cx - 5, cy - 12);
    ctx.lineTo(cx - 1, cy - 6);
    ctx.lineTo(cx + 1, cy - 6);
    ctx.lineTo(cx + 5, cy - 12);
    ctx.lineTo(cx + 6, cy - 5);
    ctx.fill();
    ctx.restore();
    eyes(ctx, [[cx - 3, cy - 1], [cx + 3, cy - 1]], 1.5, 2);
  });
}

function hunter(scene) {
  const frames = {
    hunter0: { legs: [-6, 4, -2, 8], crouch: 0, tail: 0 },
    hunter1: { legs: [4, -6, 8, -2], crouch: 1, tail: 3 },
    hunterWind: { legs: [-2, 2, -2, 2], crouch: 5, tail: -4 },
  };
  frameStrip(scene, 'hunter', 56, 40, frames, (ctx, ox, f) => {
    const bottom = 39;
    const body = bottom - 12 + f.crouch;
    const x0 = ox + 8;
    ctx.save();
    rim(ctx, 5);
    ctx.fillStyle = BODY;
    // legs
    const legX = [x0 + 8, x0 + 14, x0 + 30, x0 + 36];
    legX.forEach((lx, i) => {
      ctx.beginPath();
      ctx.moveTo(lx, body);
      ctx.lineTo(lx + f.legs[i] * 0.6, bottom);
      ctx.lineTo(lx + f.legs[i] * 0.6 + 3, bottom);
      ctx.lineTo(lx + 4, body);
      ctx.fill();
    });
    // torso
    ctx.beginPath();
    ctx.moveTo(x0, body - 4);
    ctx.quadraticCurveTo(x0 + 18, body - 16 + f.crouch, x0 + 34, body - 12);
    ctx.lineTo(x0 + 42, body - 16);
    ctx.lineTo(x0 + 44, body - 24 + f.crouch * 0.5);
    ctx.lineTo(x0 + 47, body - 16);
    ctx.lineTo(x0 + 50, body - 10);
    ctx.lineTo(x0 + 44, body - 4);
    ctx.quadraticCurveTo(x0 + 22, body + 4, x0 + 4, body + 2);
    ctx.closePath();
    ctx.fill();
    // wispy tail
    ctx.beginPath();
    ctx.moveTo(x0 + 2, body - 4);
    ctx.quadraticCurveTo(x0 - 6, body - 12 + f.tail, x0 - 8, body - 18 + f.tail);
    ctx.quadraticCurveTo(x0 - 2, body - 8, x0 + 6, body);
    ctx.fill();
    ctx.restore();
    eyes(ctx, [[x0 + 44, body - 11 + f.crouch * 0.3]], 2.4, 1.4);
  });
}

function guardian(scene) {
  frameStrip(scene, 'guardian', 48, 60, { guard0: { glow: 0.5 }, guardCharge: { glow: 1 } }, (ctx, ox, f) => {
    const cx = ox + 20;
    const bottom = 59;
    ctx.save();
    rim(ctx, 4);
    ctx.fillStyle = BODY;
    // legs + robe
    ctx.beginPath();
    ctx.moveTo(cx - 10, bottom);
    ctx.lineTo(cx - 8, bottom - 26);
    ctx.lineTo(cx + 8, bottom - 26);
    ctx.lineTo(cx + 10, bottom);
    ctx.closePath();
    ctx.fill();
    // torso
    ctx.beginPath();
    ctx.roundRect(cx - 10, bottom - 44, 20, 22, 4);
    ctx.fill();
    // helmet with crest
    ctx.beginPath();
    ctx.roundRect(cx - 7, bottom - 56, 14, 14, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2, bottom - 56);
    ctx.lineTo(cx - 8, bottom - 60);
    ctx.lineTo(cx + 2, bottom - 58);
    ctx.fill();
    // lantern arm (raised, in front)
    ctx.fillRect(cx + 8, bottom - 42, 10, 4);
    ctx.restore();
    // shield (facing right, front)
    ctx.save();
    ctx.fillStyle = '#d9d2ee';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 9, bottom - 36);
    ctx.lineTo(cx + 17, bottom - 34);
    ctx.lineTo(cx + 17, bottom - 18);
    ctx.lineTo(cx + 13, bottom - 10);
    ctx.lineTo(cx + 9, bottom - 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // lantern
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8 + f.glow * 10;
    ctx.fillStyle = `rgba(255,255,255,${0.6 + f.glow * 0.4})`;
    ctx.beginPath();
    ctx.roundRect(cx + 17, bottom - 48, 8, 11, 2);
    ctx.fill();
    ctx.restore();
    eyes(ctx, [[cx + 3, bottom - 49]], 3, 1.2);
  });
}

// ------------------------------------------------------------------ bosses
function slimeKing(scene) {
  frameStrip(scene, 'slimeKing', 170, 130, { king0: { mood: 0 }, king1: { mood: 1 }, kingDaze: { mood: 2 } }, (ctx, ox, f) => {
    const cx = ox + 85;
    const bottom = 128;
    ctx.save();
    ctx.shadowColor = 'rgba(160,240,120,0.9)';
    ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(0, 20, 0, 128);
    g.addColorStop(0, '#16261a');
    g.addColorStop(1, '#070a08');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 76, bottom);
    ctx.bezierCurveTo(cx - 84, bottom - 70, cx - 40, bottom - 102, cx, bottom - 100);
    ctx.bezierCurveTo(cx + 44, bottom - 100, cx + 84, bottom - 70, cx + 76, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // crown
    ctx.save();
    ctx.fillStyle = '#e8c76a';
    ctx.shadowColor = '#ffe6a3';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 26, bottom - 96);
    ctx.lineTo(cx - 30, bottom - 122);
    ctx.lineTo(cx - 14, bottom - 106);
    ctx.lineTo(cx, bottom - 126);
    ctx.lineTo(cx + 14, bottom - 106);
    ctx.lineTo(cx + 30, bottom - 122);
    ctx.lineTo(cx + 26, bottom - 96);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // face
    ctx.save();
    ctx.fillStyle = '#d8ffb8';
    ctx.shadowColor = '#b8ff8a';
    ctx.shadowBlur = 10;
    const ey = bottom - 62;
    if (f.mood === 2) {
      ctx.strokeStyle = '#d8ffb8';
      ctx.lineWidth = 4;
      for (const ex of [cx - 22, cx + 22]) {
        ctx.beginPath();
        ctx.moveTo(ex - 7, ey - 7);
        ctx.lineTo(ex + 7, ey + 7);
        ctx.moveTo(ex + 7, ey - 7);
        ctx.lineTo(ex - 7, ey + 7);
        ctx.stroke();
      }
    } else {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * 22, ey, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f.mood === 1) {
        ctx.fillStyle = '#16261a';
        ctx.shadowBlur = 0;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * 34, ey - 14);
          ctx.lineTo(cx + s * 10, ey - 4);
          ctx.lineTo(cx + s * 34, ey - 4);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#d8ffb8';
    ctx.beginPath();
    ctx.ellipse(cx, bottom - 34, f.mood === 1 ? 20 : 14, f.mood === 1 ? 8 : 4, 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  });
}

function golem(scene) {
  let { tex, ctx } = canvasTex(scene, 'golemBody', 130, 150);
  const stone = (c) => {
    const g = c.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, '#5a4c3e');
    g.addColorStop(1, '#2a221b');
    return g;
  };
  ctx.fillStyle = stone(ctx);
  ctx.shadowColor = 'rgba(255,180,90,0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  // legs
  ctx.roundRect(28, 110, 28, 40, 6);
  ctx.roundRect(74, 110, 28, 40, 6);
  // torso
  ctx.moveTo(14, 40);
  ctx.lineTo(116, 40);
  ctx.lineTo(108, 118);
  ctx.lineTo(22, 118);
  ctx.closePath();
  // head
  ctx.roundRect(42, 6, 46, 38, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1c1611';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 50);
  ctx.lineTo(44, 70);
  ctx.lineTo(38, 94);
  ctx.moveTo(98, 52);
  ctx.lineTo(86, 76);
  ctx.lineTo(96, 104);
  ctx.stroke();
  // chest socket
  ctx.fillStyle = '#16110d';
  ctx.beginPath();
  ctx.arc(65, 78, 18, 0, Math.PI * 2);
  ctx.fill();
  // eye slit
  ctx.fillStyle = '#ffb35c';
  ctx.shadowColor = '#ffb35c';
  ctx.shadowBlur = 10;
  ctx.fillRect(50, 22, 30, 6);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'golemFist', 48, 44));
  ctx.fillStyle = stone(ctx);
  ctx.beginPath();
  ctx.roundRect(2, 4, 44, 38, 9);
  ctx.fill();
  ctx.strokeStyle = '#1c1611';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(4 + i * 11, 6);
    ctx.lineTo(4 + i * 11, 18);
  }
  ctx.stroke();
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'golemCore', 40, 40));
  const g = ctx.createRadialGradient(20, 20, 2, 20, 20, 19);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.5, '#ffb35c');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 40, 40);
  tex.refresh();
}

function noctis(scene) {
  const frames = { noct0: { lift: 16 }, noct1: { lift: -6 }, noctDaze: { lift: -18, daze: true } };
  frameStrip(scene, 'noctis', 150, 100, frames, (ctx, ox, f) => {
    const cx = ox + 75;
    const cy = 52;
    ctx.save();
    ctx.shadowColor = 'rgba(255,90,122,0.85)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#0a060c';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * 12, cy - 6);
      ctx.quadraticCurveTo(cx + d * 40, cy - 30 - f.lift, cx + d * 72, cy - 18 - f.lift * 1.4);
      ctx.lineTo(cx + d * 62, cy - 2 - f.lift * 0.6);
      ctx.lineTo(cx + d * 52, cy - 8 - f.lift * 0.3);
      ctx.lineTo(cx + d * 44, cy + 6 - f.lift * 0.3);
      ctx.lineTo(cx + d * 32, cy);
      ctx.lineTo(cx + d * 22, cy + 14);
      ctx.closePath();
      ctx.fill();
    }
    // cape/body
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 10);
    ctx.lineTo(cx + 16, cy - 10);
    ctx.lineTo(cx + 22, cy + 40);
    ctx.lineTo(cx + 8, cy + 32);
    ctx.lineTo(cx, cy + 44);
    ctx.lineTo(cx - 8, cy + 32);
    ctx.lineTo(cx - 22, cy + 40);
    ctx.closePath();
    ctx.fill();
    // head + ears
    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 13, 14, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - 12, cy - 22);
    ctx.lineTo(cx - 14, cy - 44);
    ctx.lineTo(cx - 3, cy - 30);
    ctx.moveTo(cx + 12, cy - 22);
    ctx.lineTo(cx + 14, cy - 44);
    ctx.lineTo(cx + 3, cy - 30);
    ctx.fill();
    ctx.restore();
    // collar
    ctx.fillStyle = '#7a1630';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 8);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx + 18, cy - 8);
    ctx.lineTo(cx + 14, cy - 2);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 14, cy - 2);
    ctx.fill();
    ctx.save();
    ctx.fillStyle = '#ffd0da';
    ctx.shadowColor = '#ff5a7a';
    ctx.shadowBlur = 8;
    if (f.daze) {
      ctx.fillRect(cx - 9, cy - 20, 6, 2);
      ctx.fillRect(cx + 3, cy - 20, 6, 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 24);
      ctx.lineTo(cx - 3, cy - 19);
      ctx.lineTo(cx - 9, cy - 18);
      ctx.moveTo(cx + 10, cy - 24);
      ctx.lineTo(cx + 3, cy - 19);
      ctx.lineTo(cx + 9, cy - 18);
      ctx.fill();
    }
    ctx.restore();
  });
}

function prism(scene) {
  let { tex, ctx } = canvasTex(scene, 'prismCore', 64, 72);
  ctx.shadowColor = '#9ff0ff';
  ctx.shadowBlur = 12;
  const g = ctx.createLinearGradient(0, 0, 64, 72);
  g.addColorStop(0, '#e9fdff');
  g.addColorStop(0.5, '#5fd3ff');
  g.addColorStop(1, '#2a5fa0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(58, 30);
  ctx.lineTo(32, 68);
  ctx.lineTo(6, 30);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 30);
  ctx.lineTo(32, 38);
  ctx.lineTo(58, 30);
  ctx.moveTo(32, 4);
  ctx.lineTo(32, 68);
  ctx.stroke();
  tex.refresh();

  // Background colossus silhouette (decorative, drawn behind the arena)
  ({ tex, ctx } = canvasTex(scene, 'colossus', 360, 380));
  ctx.fillStyle = 'rgba(30,80,120,0.55)';
  ctx.strokeStyle = 'rgba(160,240,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(180, 10);
  ctx.lineTo(230, 70);
  ctx.lineTo(300, 90);
  ctx.lineTo(350, 230);
  ctx.lineTo(300, 240);
  ctx.lineTo(270, 140);
  ctx.lineTo(250, 380);
  ctx.lineTo(200, 380);
  ctx.lineTo(180, 250);
  ctx.lineTo(160, 380);
  ctx.lineTo(110, 380);
  ctx.lineTo(90, 140);
  ctx.lineTo(60, 240);
  ctx.lineTo(10, 230);
  ctx.lineTo(60, 90);
  ctx.lineTo(130, 70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,250,255,0.9)';
  ctx.shadowColor = '#9ff0ff';
  ctx.shadowBlur = 10;
  ctx.fillRect(160, 44, 14, 6);
  ctx.fillRect(188, 44, 14, 6);
  tex.refresh();
}
