import { useCallback, useRef, useState } from "react";

type AmbientHandle = { stop: () => void };

// Open D-major pad spread across octaves — warm and unresolved, never dissonant.
const CHORD = [146.83, 220.0, 293.66, 369.99, 440.0];
// Prime-number swell periods (seconds) so the texture never lines up into an audible loop.
const SWELL_PERIODS = [17, 23, 29, 31, 41];

export function useAmbientSound() {
  const handleRef = useRef<AmbientHandle | null>(null);
  const [enabled, setEnabled] = useState(false);

  const start = useCallback(() => {
    const ctx = new AudioContext();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(master);

    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.value = 1 / 37;
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 220;
    filterLfo.connect(filterLfoGain).connect(filter.frequency);
    filterLfo.start();

    const transientNodes: OscillatorNode[] = [filterLfo];

    CHORD.forEach((freq, i) => {
      const detune = (Math.random() - 0.5) * 0.6;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq + detune;

      const gain = ctx.createGain();
      gain.gain.value = 0.25;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1 / SWELL_PERIODS[i % SWELL_PERIODS.length];
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(gain.gain);

      osc.connect(gain).connect(filter);
      osc.start();
      lfo.start();

      transientNodes.push(osc, lfo);
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
