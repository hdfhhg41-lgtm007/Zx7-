---
name: "MISS ZS 3D Spatial Design System"
description: "A futuristic, ultra-dimensional black and purple Android design system with 3D glassmorphic elevation, isometric depth, and volumetric holographic lighting."
---

## Overview

MISS ZS is an advanced Android multi-AI personal assistant featuring 6 coordinated AI assistants, 18 core functional categories, a natural Pakistani female voice persona, multilingual understanding (Urdu, Punjabi, English), and smart mobile/battery controls.

This 3D evolution translates the interface into a tactile, volumetric spatial experience:
- **3D Glassmorphism & Caustics**: Beveled glass edges, specular highlights (`inset 0 1px 1px rgba(255,255,255,0.2)`), dynamic perspective transforms (`perspective(1000px) rotateX(...)`), and deep drop shadows.
- **Volumetric Holographic Orb**: Raytraced energy core with multi-stage concentric floating rings, particle fields, and breathing depth oscillation.
- **Dimensional Buttons & Tactile Cards**: Elevated extruded surfaces with tactile press physics (`active:translate-y-1 active:shadow-inner`), metallic violet rims, and floating action pods.

## Colors

```yaml
colors:
  primary: "#9333EA"
  on-primary: "#FFFFFF"
  primary-container: "#3B0764"
  on-primary-container: "#E9D5FF"
  accent: "#A855F7"
  secondary: "#8B5CF6"
  on-secondary: "#0F0F0F"
  tertiary: "#C084FC"
  on-tertiary: "#1E0B36"
  surface: "#0B0813"
  on-surface: "#F3E8FF"
  surface-variant: "#161129"
  on-surface-variant: "#D8B4FE"
  surface-container: "#1E1735"
  surface-container-high: "#281F45"
  outline: "#4C1D95"
  outline-variant: "#2E1065"
  success: "#10B981"
  on-success: "#393939"
  warning: "#F59E0B"
  on-warning: "#000000"
  error: "#EF4444"
  on-error: "#1C1C1C"
  battery-green: "#22C55E"
  battery-charging: "#38BDF8"
  urdu-badge: "#EC4899"
  light:
    primary: "#6B21A8"
    on-primary: "#FFFFFF"
    surface: "#FAF5FF"
    on-surface: "#1E1735"
  dark:
    primary: "#C084FC"
    on-primary: "#3B0764"
    surface: "#0B0813"
    on-surface: "#F3E8FF"
```

## Typography

Typography pairs **Archivo** for sharp display headlines with **Commissioner** for legible labels and **Source Code Pro** for telemetry.

```yaml
typography:
  display-lg:
    fontFamily: "Archivo"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 48px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Archivo"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 38px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Archivo"
    fontSize: 34px
    fontWeight: 700
    lineHeight: 42px
    letterSpacing: -0.25px
  headline-lg-mobile:
    fontFamily: "Archivo"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: 0px
  headline-md:
    fontFamily: "Archivo"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
  headline-sm:
    fontFamily: "Archivo"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  title-lg:
    fontFamily: "Commissioner"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
  title-md:
    fontFamily: "Commissioner"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
  body-lg:
    fontFamily: "Commissioner"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-md:
    fontFamily: "Commissioner"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: "Commissioner"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  label-lg:
    fontFamily: "Commissioner"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: "Commissioner"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.2px
  label-sm:
    fontFamily: "Commissioner"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.3px
  code-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
```

## Layout & Spacing

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 32px
  page-margin: 16px
```

## Elevation & Depth

Spatial depth uses multi-tier ambient occlusion and 3D beveling:
- **Floor**: Deep void `#0B0813` with perspective grid backdrop
- **Tier 1 (Surface Glass)**: `background: linear-gradient(135deg, rgba(30,23,53,0.85) 0%, rgba(22,17,41,0.95) 100%)`, `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`
- **Tier 2 (Floating Action Pods)**: `transform: translateZ(20px)`, `box-shadow: 0 16px 32px -8px rgba(147,51,234,0.35), inset 0 1px 1px rgba(255,255,255,0.3)`
- **Tier 3 (Orb Hologram)**: Dynamic volumetric raytraced 3D glow with rotating orbital gyro rings.

## Shapes

```yaml
rounded:
  sm: 6px
  DEFAULT: 12px
  md: 16px
  lg: 20px
  xl: 28px
  full: 9999px
```

## Motion & Micro-interaction

```yaml
motion:
  state-change:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.34, 1.56, 0.64, 1)
  surface-enter:
    duration: 250ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 180ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- Warm, culturally authentic female Pakistani voice companion.
- Empathetic emotional range without claiming biological consciousness.
- Transparent Android permissions and owner authorization.

## Components
- `button.html` — Actions and tactile 3D buttons
- `card.html` — 3D elevated spatial containers
- `chip.html` — Holographic mode capsules
- `badge.html` — 3D status spheres and telemetry pins
