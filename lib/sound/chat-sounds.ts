let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  ac: AudioContext,
  fromHz: number,
  toHz: number,
  startAt: number,
  duration: number,
  volume = 0.18
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(fromHz, startAt);
  osc.frequency.exponentialRampToValueAtTime(toHz, startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Short rising chirp for outgoing messages (iMessage-send feel). */
export function playSendSound() {
  const ac = context();
  if (!ac) return;
  try {
    blip(ac, 620, 1240, ac.currentTime, 0.09);
  } catch {
    // Audio is decorative — never break the chat.
  }
}

/** Soft two-tone chime for incoming replies (iMessage-receive feel). */
export function playReceiveSound() {
  const ac = context();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    blip(ac, 1174, 1174, t, 0.07);
    blip(ac, 880, 880, t + 0.08, 0.1);
  } catch {
    // Audio is decorative — never break the chat.
  }
}
