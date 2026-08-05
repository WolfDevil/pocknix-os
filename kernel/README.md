# kernel/ — per-SoC kernel inputs (pinned ROCKNIX nightly snapshots)

Each `kernel/<soc>/` directory holds one SoC's **complete kernel input set, committed
in-repo** so pocknix-os is self-contained *and* reproducible: a clone builds the exact
same kernel with no ROCKNIX checkout needed. Only **stock Linux source** and **stock
firmware** are fetched at build (both version+sha pinned, per-SoC in
`kernel/<soc>/kernel.conf`). The device profile (`devices/<name>/profile.conf`) selects
the SoC; devices on the same SoC (RP6 + AYN Odin 2, both `sm8550/`) share the tree —
every board's dtb ships and the bootloader picks it (qcom-abl: by board id from the
boot image's appended dtbs; arm-efi: by the grub.cfg menuentry's `devicetree` line).

Currently: `sm8550/` (synced for the Retroid Pocket 6; the notes below describe it)
and `sm8250/` (synced for the Retroid Pocket 5 — same recipe, 28 SoC patches from
ROCKNIX `devices/SM8250/patches/linux`, arm-efi boot so its `bootloader/` holds
ROCKNIX's update.sh reference rather than qcom-abl packaging).

## Provenance — what's whose

The RP6 is **officially supported by ROCKNIX**, so the bulk of these patches are **public
ROCKNIX work**, not ours:

- **Public ROCKNIX RP6/SM8550 support** — the RP6 panel (`0104`), touchscreen, backlight,
  audio, thermal, etc. From ROCKNIX's **`next` (nightly)** branch.
- **jaewun's suspend/resume set** — `0201`, `0204`–`0207`, `1004`, `1006`–`1009`. From
  `jaewun/ROCKNIX` `thor-suspend-fixes`; we merge/maintain it.
- **Our delta** (small) — TSENS uplow-wake broadening (`0203`), `CONFIG_PM_SLEEP_DEBUG`, and
  the SDAM breadcrumb debug hooks.

What's committed here is a **pinned snapshot of ROCKNIX `next` (nightly)** + jaewun's branch +
our delta — taken from the maintainer's `distribution/` fork (branch `thor-suspend-merge`).
We track **nightly (`next`), not a stable release**. `make sync` advances the pin when we
choose, which keeps builds reproducible (the kernel doesn't move under us between syncs).

Thorch, by contrast, auto-fetches public ROCKNIX nightly at build time (gitignored). We pin +
commit instead — same build, but reproducible and clone-standalone.

## The full kernel = stock source + this patch stack + this config

The kernel is **not** "stock Linux + a few device patches." It reproduces ROCKNIX's recipe:
stock kernel.org source (pinned per SoC in `kernel/<soc>/kernel.conf` — sm8550 **`7.1.5`**,
sm8250 **`7.1.2`**) with the full ROCKNIX patch stack applied **in order**, then the SoC
config, then qcom-abl packaging. The pin can lead ROCKNIX (still 7.1.2 for both SoCs);
`make sync` moves the patch stack, never the pin.

## Contents

| Path | What | Apply order |
|---|---|---|
| `patches/10-mainline/` | ROCKNIX generic backports (joypad gpiolib, input-polldev, pwm, adc-keys, BT RTL8733BU) — 5 | 1st (before device) |
| `patches/20-sm8550/` | SM8550 / RP6 device patches — 60: suspend/resume set, RP6 panel, RSInput gamepad, TSENS uplow-wake fix, audio, thermal, etc. | 2nd |
| `patches/30-version/` | Generic version-specific patches (msm resource cleanup, rust build fix) — 2 | 3rd (after device) |
| `dts/qcom/` | RP6 device tree (`qcs8550-retroidpocket-rp6.dts` + shared `.dtsi`s) | — |
| `config/linux.aarch64.conf` | Kernel config | — |
| `config/kernel-firmware.dat` | List of firmware files to pull from `linux-firmware` (blobs NOT vendored) | — |
| `bootloader/` | qcom-abl boot-image packaging reference | — |

The numeric subdir prefixes encode ROCKNIX's `PKG_PATCH_DIRS="... mainline ${DEVICE} ... 7.0"`
order; the Phase 1 build script applies them in sorted order.

## What is NOT here (fetched at build, Phase 1)

- **Stock Linux source** — kernel.org `linux-<ver>.tar.xz`, version+sha-pinned per SoC in
  `kernel/<soc>/kernel.conf` (`KERNEL_VERSION` / `KERNEL_SOURCE_URL` / `KERNEL_SOURCE_SHA256`).
  Not committed (stock, huge).
- **Firmware blobs** — sourced from the `linux-firmware` package per `kernel-firmware.dat`.

## Provenance / refreshing

These files are mirrored from the maintainer's ROCKNIX `distribution/` checkout
(`projects/ROCKNIX/devices/SM8550/`). To pull the latest:

```bash
export DISTRIBUTION_DIR=$HOME/Documents/Coding/distribution
make sync     # refreshes kernel/ — review `git diff`, then commit
```

`make sync` overwrites this directory from your distribution checkout, so treat changes here
as "synced snapshots": refresh via sync, review the diff, commit. (See `scripts/sync.sh`.)
