/**
 * Fullscreen toggle shared by the menu and in-game UI.
 * Phaser's startFullscreen() ignores the promise returned by requestFullscreen(), so a
 * denied request (permissions policy, unsupported browser, embedded frame) would surface
 * as an uncaught console error. The request method is wrapped once so rejections are
 * swallowed; Phaser still receives the 'fullscreenerror' event and keeps its state consistent.
 */
let patched = false;
let onReject = null;

function patchRequest(name) {
  if (patched || typeof Element === 'undefined') return;
  patched = true;
  const proto = Element.prototype;
  const original = proto[name];
  if (typeof original !== 'function') return;
  proto[name] = function (...args) {
    const p = original.apply(this, args);
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (onReject) onReject();
      });
    }
    return p;
  };
}

// After a denied request Phaser may leave the canvas inside its temporary wrapper div;
// a later startFullscreen() would then try to insert that wrapper into itself.
function unwrapCanvas(scale) {
  if (scale.isFullscreen) return;
  const target = scale.fullscreenTarget;
  if (target && scale.canvas && scale.canvas.parentNode === target) scale.removeFullscreenTarget();
}

export function toggleFullscreen(scale) {
  if (!scale.fullscreen.available) return;
  if (scale.isFullscreen) {
    scale.stopFullscreen();
    return;
  }
  patchRequest(scale.fullscreen.request);
  unwrapCanvas(scale);
  onReject = () => {
    unwrapCanvas(scale);
    scale.refresh();
  };
  scale.startFullscreen();
  try {
    const o = screen.orientation;
    if (o && o.lock) o.lock('landscape').catch(() => {});
  } catch (e) {
    /* orientation lock unsupported */
  }
}
