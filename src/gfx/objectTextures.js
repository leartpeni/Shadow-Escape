import { TILE } from '../config.js';
import { canvasTex } from './util.js';

/** Hazards, platforms, props, pickups, projectiles and particle textures. */
export default function makeObjectTextures(scene) {
  spike(scene);
  saw(scene);
  platforms(scene);
  checkpoints(scene);
  portal(scene);
  particles(scene);
  laserParts(scene);
  rock(scene);
  shard(scene);
  projectiles(scene);
}

function spike(scene) {
  const { tex, ctx } = canvasTex(scene, 'spike', TILE, TILE);
  const g = ctx.createLinearGradient(0, 12, 0, 32);
  g.addColorStop(0, '#f1ecff');
  g.addColorStop(1, '#6c5f8f');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,80,120,0.6)';
  ctx.shadowBlur = 4;
  for (let i = 0; i < 2; i++) {
    const x = i * 16;
    ctx.beginPath();
    ctx.moveTo(x + 1, 32);
    ctx.lineTo(x + 8, 13);
    ctx.lineTo(x + 15, 32);
    ctx.closePath();
    ctx.fill();
  }
  tex.refresh();
}

function saw(scene) {
  const size = 44;
  const { tex, ctx } = canvasTex(scene, 'saw', size, size);
  const c = size / 2;
  ctx.fillStyle = '#c9c1e3';
  ctx.beginPath();
  const teeth = 12;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? c - 1 : c - 7;
    ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4b4266';
  ctx.beginPath();
  ctx.arc(c, c, c - 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5a7a';
  ctx.beginPath();
  ctx.arc(c, c, 4, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();

  const ch = canvasTex(scene, 'chain', 8, 8);
  ch.ctx.fillStyle = 'rgba(200,190,230,0.45)';
  ch.ctx.beginPath();
  ch.ctx.arc(4, 4, 2.5, 0, Math.PI * 2);
  ch.ctx.fill();
  ch.tex.refresh();
}

function platforms(scene) {
  let { tex, ctx } = canvasTex(scene, 'platform', TILE * 3, 16);
  ctx.fillStyle = '#2b2142';
  ctx.beginPath();
  ctx.roundRect(0, 0, TILE * 3, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#5fd3ff';
  ctx.fillRect(2, 0, TILE * 3 - 4, 2);
  ctx.fillStyle = '#3c2f5c';
  for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 15, 6, 6, 4);
  tex.refresh();

  // Phasing platform (blinks in/out)
  ({ tex, ctx } = canvasTex(scene, 'vanish', TILE, 16));
  ctx.fillStyle = 'rgba(120,90,220,0.55)';
  ctx.fillRect(0, 0, TILE, 16);
  ctx.fillStyle = '#e1d4ff';
  ctx.fillRect(0, 0, TILE, 2);
  ctx.strokeStyle = 'rgba(225,212,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 12);
  ctx.lineTo(16, 5);
  ctx.lineTo(24, 12);
  ctx.stroke();
  tex.refresh();

  // Crumbling floor block (full tile, tiles horizontally)
  ({ tex, ctx } = canvasTex(scene, 'crumble', TILE, TILE));
  ctx.fillStyle = '#3a2f2a';
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = '#4c3e36';
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#c9a77a';
  ctx.fillRect(0, 0, TILE, 2);
  ctx.strokeStyle = '#1c1512';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.lineTo(12, 13);
  ctx.lineTo(9, 22);
  ctx.lineTo(15, 30);
  ctx.moveTo(12, 13);
  ctx.lineTo(24, 16);
  ctx.lineTo(28, 26);
  ctx.moveTo(24, 16);
  ctx.lineTo(27, 4);
  ctx.stroke();
  tex.refresh();
}

function checkpoints(scene) {
  ['off', 'on'].forEach((state) => {
    const { tex, ctx } = canvasTex(scene, `cp_${state}`, 28, 56);
    ctx.fillStyle = '#3a3150';
    ctx.fillRect(12, 16, 4, 40);
    ctx.fillRect(6, 52, 16, 4);
    ctx.fillStyle = '#4b4068';
    ctx.fillRect(7, 6, 14, 14);
    ctx.save();
    if (state === 'on') {
      ctx.shadowColor = '#9ff0ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#c8f8ff';
    } else {
      ctx.fillStyle = '#2a2338';
    }
    ctx.beginPath();
    ctx.ellipse(14, 13, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4b4068';
    ctx.fillRect(9, 2, 10, 3);
    tex.refresh();
  });
}

function portal(scene) {
  const { tex, ctx } = canvasTex(scene, 'portal', 64, 96);
  const g = ctx.createRadialGradient(32, 48, 2, 32, 48, 46);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.35, 'rgba(255,230,160,0.9)');
  g.addColorStop(0.7, 'rgba(255,190,90,0.35)');
  g.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(32, 48, 30, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}

function particles(scene) {
  let { tex, ctx } = canvasTex(scene, 'dot', 12, 12);
  let g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 12, 12);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'spark', 4, 4));
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 4, 4);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'glow', 128, 128));
  g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'px', 2, 2));
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 2, 2);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'chunk', 8, 8));
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(1, 2);
  ctx.lineTo(7, 0);
  ctx.lineTo(8, 6);
  ctx.lineTo(2, 8);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}

function laserParts(scene) {
  let { tex, ctx } = canvasTex(scene, 'emitter', 20, 20);
  ctx.fillStyle = '#2a2433';
  ctx.beginPath();
  ctx.roundRect(1, 1, 18, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#6b6080';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  ctx.beginPath();
  ctx.arc(10, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'epost', 16, 16));
  ctx.fillStyle = '#26303a';
  ctx.beginPath();
  ctx.roundRect(1, 1, 14, 14, 3);
  ctx.fill();
  ctx.strokeStyle = '#7fd8ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#d8f6ff';
  ctx.fillRect(6, 6, 4, 4);
  tex.refresh();
}

function rock(scene) {
  const { tex, ctx } = canvasTex(scene, 'rock', 30, 30);
  ctx.fillStyle = '#4a4252';
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.lineTo(15, 1);
  ctx.lineTo(27, 5);
  ctx.lineTo(29, 17);
  ctx.lineTo(18, 29);
  ctx.lineTo(9, 27);
  ctx.lineTo(1, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#625872';
  ctx.beginPath();
  ctx.moveTo(6, 7);
  ctx.lineTo(15, 3);
  ctx.lineTo(24, 7);
  ctx.lineTo(15, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2430';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, 12);
  ctx.lineTo(13, 20);
  ctx.lineTo(18, 26);
  ctx.stroke();
  tex.refresh();
}

function shard(scene) {
  const { tex, ctx } = canvasTex(scene, 'shard', 24, 32);
  ctx.shadowColor = 'rgba(255,236,170,1)';
  ctx.shadowBlur = 6;
  const g = ctx.createLinearGradient(0, 4, 0, 28);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#ffd77a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.lineTo(20, 14);
  ctx.lineTo(12, 29);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.lineTo(16, 14);
  ctx.lineTo(12, 14);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}

function projectiles(scene) {
  let { tex, ctx } = canvasTex(scene, 'orb', 24, 24);
  const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 24, 24);
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'wave', 28, 34));
  const wg = ctx.createLinearGradient(0, 0, 0, 34);
  wg.addColorStop(0, 'rgba(255,255,255,0)');
  wg.addColorStop(1, 'rgba(255,255,255,0.95)');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.quadraticCurveTo(6, 2, 14, 0);
  ctx.quadraticCurveTo(22, 2, 28, 34);
  ctx.closePath();
  ctx.fill();
  tex.refresh();

  ({ tex, ctx } = canvasTex(scene, 'blob', 20, 20));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(10, 11, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(12, 13, 4, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}
