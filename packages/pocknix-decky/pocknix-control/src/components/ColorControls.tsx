import { gamepadSliderClasses, PanelSectionRow, SliderField } from "@decky/ui";
import { useEffect, useRef, useState } from "react";

// SliderField has only onChange (no onChangeEnd), so commits are debounced. The
// pending value lives in a ref so the unmount flush always sees the latest edit, not
// a value captured when the component first mounted.
const COMMIT_DELAY = 350;

interface ColorControlsProps {
  zone: string;
  hsv: [number, number, number];
  onCommit: (h: number, s: number, v: number) => void;
}

export function ColorControls({ zone, hsv, onCommit }: ColorControlsProps) {
  const [hue, saturation, value] = hsv;
  const [local, setLocal] = useState<[number, number, number]>(hsv);
  const pending = useRef<[number, number, number] | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    setLocal(hsv);
  }, [hue, saturation, value]);

  const schedule = (next: [number, number, number]) => {
    setLocal(next);
    pending.current = next;
  };

  useEffect(() => {
    if (pending.current === null) return;
    const snapshot = pending.current;
    const timer = window.setTimeout(() => {
      pending.current = null;
      onCommitRef.current(snapshot[0], snapshot[1], snapshot[2]);
    }, COMMIT_DELAY);
    return () => window.clearTimeout(timer);
  }, [local]);

  useEffect(
    () => () => {
      if (pending.current !== null) {
        const snapshot = pending.current;
        pending.current = null;
        onCommitRef.current(snapshot[0], snapshot[1], snapshot[2]);
      }
    },
    [],
  );

  const setHue = (h: number) => schedule([h, local[1], local[2]]);
  const setSaturation = (s: number) => schedule([local[0], s, local[2]]);
  const setValue = (v: number) => schedule([local[0], local[1], v]);

  const [h, s] = local;

  return (
    <>
      <PanelSectionRow>
        <SliderField
          label="Hue"
          value={h}
          min={0}
          max={359}
          step={1}
          showValue
          validValues="range"
          valueSuffix="°"
          bottomSeparator="thick"
          className={`pocknix-led-${zone}-h`}
          onChange={setHue}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label="Saturation"
          value={s}
          min={0}
          max={100}
          step={1}
          showValue
          validValues="range"
          valueSuffix="%"
          bottomSeparator="thick"
          className={`pocknix-led-${zone}-s`}
          onChange={setSaturation}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label="Brightness"
          value={local[2]}
          min={0}
          max={100}
          step={1}
          showValue
          validValues="range"
          valueSuffix="%"
          bottomSeparator="thick"
          className={`pocknix-led-${zone}-v`}
          onChange={setValue}
        />
      </PanelSectionRow>
      <style>{`
        .pocknix-led-${zone}-h .${gamepadSliderClasses.SliderTrack} {
          background: linear-gradient(to right,
            hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%),
            hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%)) !important;
          --left-track-color: #0000 !important;
          --colored-toggles-main-color: #0000 !important;
        }
        .pocknix-led-${zone}-s .${gamepadSliderClasses.SliderTrack} {
          background: linear-gradient(to right, hsl(0,0%,100%), hsl(${h},100%,50%)) !important;
          --left-track-color: #0000 !important;
          --colored-toggles-main-color: #0000 !important;
        }
        .pocknix-led-${zone}-v .${gamepadSliderClasses.SliderTrack} {
          background: linear-gradient(to right, hsl(0,0%,0%), hsl(${h},${s}%,50%)) !important;
          --left-track-color: #0000 !important;
          --colored-toggles-main-color: #0000 !important;
        }
      `}</style>
    </>
  );
}
