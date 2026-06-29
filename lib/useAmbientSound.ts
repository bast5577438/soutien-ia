import { useCallback, useRef, useState } from "react";

type AmbientHandle = { stop: () => void };

// D add9 voicing — root, third, fifth, seventh, ninth — gives the pad distinct
// pitches instead of fusing into a single drone tone.
const CHORD = [
  { freq: 146.83, pan: -0.5 }, // D3
  { freq: 185.0, pan: -0.2 }, // F#3
  { freq: 220.0, pan: 0.0 }, // A3
  { freq: 277.18, pan: 0.2 }, // C#4
  { freq: 329.63, pan: 0.5 }, // E4
];
// Short, mutually-prime swell periods (seconds) so movement is clearly audible
// within a few seconds, while the combined pattern still never repeats exactly.
const SWELL_PERIODS = [4, 5, 7, 9, 11];
const PAN_PERIODS = [13, 17, 19, 23, 29];

export function useAmbientSound() {
  const handleRef = useRef<AmbientHandle | null>(null);
  const [enabled, setEnabled] = useState(false);

  const start = useCallback(() => {
    const ctx = new AudioContext();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    filter.connect(master);

    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.value = 1 / 11;
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 280;
    filterLfo.connect(filterLfoGain).connect(filter.frequency);
    filterLfo.start();

    const transientNodes: OscillatorNode[] = [filterLfo];

    CHORD.forEach(({ freq, pan }, i) => {
      const detune = (Math.random() - 0.5) * 0.6;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq + detune;

      const gain = ctx.createGain();
      gain.gain.value = 0.22;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1 / SWELL_PERIODS[i % SWELL_PERIODS.length];
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.18;
      lfo.connect(lfoGain).connect(gain.gain);

      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;

      const panLfo = ctx.createOscillator();
      panLfo.frequency.value = 1 / PAN_PERIODS[i % PAN_PERIODS.length];
      const panLfoGain = ctx.createGain();
      panLfoGain.gain.value = 0.25;
      panLfo.connect(panLfoGain).connect(panner.pan);

      osc.connect(gain).connect(panner).connect(filter);
      osc.start();
      lfo.start();
      panLfo.start();

      transientNodes.push(osc, lfo, panLfo);
    });

    handleRef.current = {
      stop: () => {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        setTimeout(() => {
          transientNodes.forEach((node) => {
            try {
              node.stop();
            } catch {
              /* already stopped */
            }
          });
          ctx.close();
        }, 1300);
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
