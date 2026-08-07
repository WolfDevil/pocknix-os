import copy
import json
from pathlib import Path

from .system import atomically_write

# Stick RGB rings expose as multicolor LED-class devices. sysfs resets on reboot,
# so the chosen state is persisted and re-applied from Plugin._main on load.
# RP6: /sys/class/leds/rgb:l1..l4 and rgb:r1..l4 (4 ring segments per stick).
# Odin 2/Mini/Portal: /sys/class/leds/left-joystick and right-joystick (1 node per
# stick, pwm-leds-multicolor). Same multi_intensity/brightness ABI in both cases.
LED_CONFIG = Path("/etc/pocknix/led.json")
LED_GLOB = Path("/sys/class/leds")


def _segments(side):
    # RP6 groups each ring segment under rgb:<l|r><n>; Odin names the whole stick.
    segs = sorted(LED_GLOB.glob(f"rgb:{side[0]}[0-9]*"))
    if segs:
        return segs
    node = LED_GLOB / f"{side}-joystick"
    return [node] if node.is_dir() else []


LEFT_LEDS = _segments("left")
RIGHT_LEDS = _segments("right")
AVAILABLE = bool(LEFT_LEDS or RIGHT_LEDS)

DEFAULTS = {
    "enabled": False,
    "linked": True,
    "left": {"r": 0, "g": 200, "b": 255, "brightness": 180},
    "right": {"r": 0, "g": 200, "b": 255, "brightness": 180},
}


def _clamp_byte(value):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, min(255, n))


def _rgb(side):
    return (side["r"], side["g"], side["b"])


def _sanitize(data):
    clean = copy.deepcopy(DEFAULTS)
    if not isinstance(data, dict):
        return clean
    clean["enabled"] = bool(data.get("enabled", DEFAULTS["enabled"]))
    clean["linked"] = bool(data.get("linked", DEFAULTS["linked"]))
    for side in ("left", "right"):
        src = data.get(side)
        if isinstance(src, dict):
            clean[side] = {
                "r": _clamp_byte(src.get("r", DEFAULTS[side]["r"])),
                "g": _clamp_byte(src.get("g", DEFAULTS[side]["g"])),
                "b": _clamp_byte(src.get("b", DEFAULTS[side]["b"])),
                "brightness": _clamp_byte(src.get("brightness", DEFAULTS[side]["brightness"])),
            }
    return clean


def _load():
    try:
        return _sanitize(json.loads(LED_CONFIG.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return copy.deepcopy(DEFAULTS)


def _save(data):
    atomically_write(LED_CONFIG, json.dumps(data, indent=2, sort_keys=True) + "\n", 0o644)


def _write_segment(led, rgb, brightness):
    # multi_intensity is laid out in the channel order named by multi_index, which
    # isn't always R G B (the Retroid Pocket 6 is blue green red).
    try:
        names = (led / "multi_index").read_text(encoding="utf-8").split()
    except OSError:
        names = ["red", "green", "blue"]
    named = {"red": rgb[0], "green": rgb[1], "blue": rgb[2]}
    intensity = " ".join(str(named.get(name, 0)) for name in names)
    try:
        max_brightness = int((led / "max_brightness").read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        max_brightness = 255
    value = max(0, min(max_brightness, brightness))
    (led / "multi_intensity").write_text(intensity + "\n", encoding="utf-8")
    (led / "brightness").write_text(f"{value}\n", encoding="utf-8")


def _apply_side(segments, rgb, brightness):
    for led in segments:
        try:
            _write_segment(led, rgb, brightness)
        except OSError:
            pass


def _apply_config(data):
    if not data["enabled"]:
        for led in LEFT_LEDS + RIGHT_LEDS:
            try:
                (led / "brightness").write_text("0\n", encoding="utf-8")
            except OSError:
                pass
        return
    left = data["left"]
    right = data["right"] if not data["linked"] else left
    _apply_side(LEFT_LEDS, _rgb(left), left["brightness"])
    _apply_side(RIGHT_LEDS, _rgb(right), right["brightness"])


def led_config():
    data = _load()
    data["available"] = AVAILABLE
    return data


def set_led(side, r, g, b, brightness):
    data = _load()
    rgb = {"r": _clamp_byte(r), "g": _clamp_byte(g), "b": _clamp_byte(b), "brightness": _clamp_byte(brightness)}
    if side == "both":
        data["left"] = copy.deepcopy(rgb)
        data["right"] = copy.deepcopy(rgb)
    elif side in ("left", "right"):
        data[side] = rgb
    else:
        raise ValueError(f"unknown led side: {side!r}")
    _save(data)
    _apply_config(data)
    return led_config()


def set_led_linked(linked):
    data = _load()
    data["linked"] = bool(linked)
    if data["linked"]:
        data["right"] = copy.deepcopy(data["left"])
    _save(data)
    _apply_config(data)
    return led_config()


def set_led_enabled(enabled):
    data = _load()
    data["enabled"] = bool(enabled)
    _save(data)
    _apply_config(data)
    return led_config()


def restore_led():
    if AVAILABLE:
        _apply_config(_load())
