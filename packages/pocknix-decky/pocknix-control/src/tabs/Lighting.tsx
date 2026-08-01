import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import type { Dispatch, SetStateAction } from "react";
import { setLed, setLedEnabled, setLedLinked } from "../backend";
import { ColorControls } from "../components/ColorControls";
import { hsvToRgb, rgbToHsv } from "../lib/rgb";
import type { Config, LedSideKey } from "../types";

// V doubles as brightness: hsvToRgb bakes it into the color channels, and it's also
// mirrored onto the hardware brightness (0-255) so dimming scales the whole ring.
function commit(side: LedSideKey, h: number, s: number, v: number, setConfig: Dispatch<SetStateAction<Config | null>>, reload: () => void) {
  const [r, g, b] = hsvToRgb(h, s, v);
  const brightness = Math.round((v / 100) * 255);
  setLed(side, r, g, b, brightness)
    .then((next) => setConfig((cur) => (cur ? { ...cur, led: next.led } : cur)))
    .catch(() => reload());
}

export function Lighting({ config, setConfig, reload }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  reload: () => void;
}) {
  const led = config.led;
  const leftHsv: [number, number, number] = rgbToHsv(led.left.r, led.left.g, led.left.b);
  const rightHsv: [number, number, number] = rgbToHsv(led.right.r, led.right.g, led.right.b);

  const commitLeft = (h: number, s: number, v: number) => commit("left", h, s, v, setConfig, reload);
  const commitRight = (h: number, s: number, v: number) => commit("right", h, s, v, setConfig, reload);
  const commitBoth = (h: number, s: number, v: number) => commit("both", h, s, v, setConfig, reload);

  return (
    <>
      <PanelSection title="STICK LIGHTS">
        <PanelSectionRow>
          <ToggleField
            label="Enable"
            checked={led.enabled}
            onChange={(value) =>
              setLedEnabled(value)
                .then((next) => setConfig((cur) => (cur ? { ...cur, led: next.led } : cur)))
                .catch(() => reload())
            }
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Link Left & Right"
            description="Match both sticks to the same color."
            checked={led.linked}
            disabled={!led.enabled}
            onChange={(value) =>
              setLedLinked(value)
                .then((next) => setConfig((cur) => (cur ? { ...cur, led: next.led } : cur)))
                .catch(() => reload())
            }
          />
        </PanelSectionRow>
      </PanelSection>

      {led.enabled && (
        led.linked ? (
          <PanelSection title="BOTH STICKS">
            <ColorControls zone="both" hsv={leftHsv} onCommit={commitBoth} />
          </PanelSection>
        ) : (
          <>
            <PanelSection title="LEFT STICK">
              <ColorControls zone="left" hsv={leftHsv} onCommit={commitLeft} />
            </PanelSection>
            <PanelSection title="RIGHT STICK">
              <ColorControls zone="right" hsv={rightHsv} onCommit={commitRight} />
            </PanelSection>
          </>
        )
      )}
    </>
  );
}
