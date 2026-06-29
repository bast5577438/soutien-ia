import { useCallback, useRef, useState } from "react";

type AmbientHandle = { stop: () => void };

const BPM = 74;
const BEAT_SECONDS = 60 / BPM;
const STEP_SECONDS = BEAT_SECONDS / 4; // 16th-note grid
const SCHEDULE_AHEAD = 0.12;
const TICK_MS = 25;

// Jazzy lofi progression (Dm9 / Gm7 / Cmaj7 / Fmaj7), one chord held for 4 bars.
const PROGRESSION: number[][] = [
  [146.83, 174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66, 349.23],
  [130.81, 164.81, 196.0, 246.94],
  [174.61, 220.0, 261.63, 329.63],
];

const HAT_STEPS = new Set([0, 2, 4, 6, 7, 8, 10, 12, 14, 15]);
const KICK_STEPS = new Set([0, 10]);
const RIM_STEPS = new Set([4, 12]);

function createNoiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function useAmbientSound() {
  const handleRef = useRef<AmbientHandle | null>(null);
  const [enabled, setEnabled] = useState(false);

  const start = useCallback(() => {
    const ctx = new AudioContext();
    const noiseBuffer = createNoiseBuffer(ctx, 2);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 2);

    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 6000;
    warmth.Q.value = 0.7;

    const saturate = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * 2 - 1;
      curve[i] = Math.tanh(x * 1.4);
    }
    saturate.curve = curve;

    master.connect(warmth).connect(saturate).connect(ctx.destination);

    // Tape wobble: one slow shared pitch LFO feeds every melodic voice's detune.
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.15;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 6;
    wobble.connect(wobbleGain);
    wobble.start();

    // Vinyl hiss bed.
    const hiss = ctx.createBufferSource();
    hiss.buffer = noiseBuffer;
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 3000;
    hissFilter.Q.value = 0.6;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.025;
    hiss.connect(hissFilter).connect(hissGain).connect(master);
    hiss.start();

    let stopped = false;

    function scheduleCrackle() {
      if (stopped) return;
      const pop = ctx.createBufferSource();
      pop.buffer = noiseBuffer;
      const popFilter = ctx.createBiquadFilter();
      popFilter.type = "bandpass";
      popFilter.frequency.value = 1500 + Math.random() * 3000;
      popFilter.Q.value = 4;
      const popGain = ctx.createGain();
      const now = ctx.currentTime;
      const peak = 0.04 + Math.random() * 0.05;
      popGain.gain.setValueAtTime(0, now);
      popGain.gain.linearRampToValueAtTime(peak, now + 0.003);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      pop.connect(popFilter).connect(popGain).connect(master);
      pop.start();
      pop.stop(now + 0.08);

      crackleTimeout = setTimeout(scheduleCrackle, 150 + Math.random() * 700);
    }
    let crackleTimeout = setTimeout(scheduleCrackle, 400);

    function playChordStab(time: number, freqs: number[], velocity: number) {
      freqs.forEach((freq) => {
        [-3, 3].forEach((centsOffset) => {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = freq;
          osc.detune.value = centsOffset;
          wobbleGain.connect(osc.detune);

          const tremolo = ctx.createOscillator();
          tremolo.frequency.value = 4.5 + Math.random();
          const tremoloGain = ctx.createGain();
          tremoloGain.gain.value = 0.06;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(velocity * 0.18, time + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0008, time + 2.6);

          tremolo.connect(tremoloGain).connect(gain.gain);
          tremolo.start(time);
          tremolo.stop(time + 2.7);

          osc.connect(gain).connect(master);
          osc.start(time);
          osc.stop(time + 2.8);
        });
      });
    }

    function playKick(time: number) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + 0.25);
    }

    function playHat(time: number, velocity: number) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.05);
      noise.connect(filter).connect(gain).connect(master);
      noise.start(time);
      noise.stop(time + 0.06);
    }

    function playRim(time: number) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      noise.connect(filter).connect(gain).connect(master);
      noise.start(time);
      noise.stop(time + 0.1);
    }

    let step = 0;
    let chordIndex = 0;
    let barCount = 0;
    let nextNoteTime = ctx.currentTime + 0.1;

    function advanceNote() {
      const swing = step % 2 === 1 ? STEP_SECONDS * 0.12 : 0;
      nextNoteTime += STEP_SECONDS + swing;
      step = (step + 1) % 16;
      if (step === 0) {
        barCount += 1;
        if (barCount % 4 === 0) {
          chordIndex = (chordIndex + 1) % PROGRESSION.length;
        }
      }
    }

    function scheduler() {
      while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
        const time = nextNoteTime + (Math.random() - 0.5) * 0.012;

        if (KICK_STEPS.has(step)) playKick(time);
        if (HAT_STEPS.has(step)) playHat(time, step % 4 === 0 ? 1 : 0.6);
        if (RIM_STEPS.has(step)) playRim(time);
        if (step === 0 && barCount % 2 === 0) {
          playChordStab(time, PROGRESSION[chordIndex], 0.8 + Math.random() * 0.2);
        }

        advanceNote();
      }
    }

    const schedulerInterval = setInterval(scheduler, TICK_MS);

    handleRef.current = {
      stop: () => {
        stopped = true;
        clearInterval(schedulerInterval);
        clearTimeout(crackleTimeout);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => {
          try {
            hiss.stop();
          } catch {
            /* already stopped */
          }
          try {
            wobble.stop();
          } catch {
            /* already stopped */
          }
          ctx.close();
        }, 1100);
      },
    };
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      handleRef.current?.stop();
      handleRef.current = null;
      setEnabled(false);
    } else {
      start();
      setEnabled(true);
    }
  }, [enabled, start]);

  return { enabled, toggle };
}
