# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkler, eleganter Red-Carpet-Look mit tiefem Anthrazit, warmem Champagner-Gold, hochwertiger Serifen-Typografie und feinen Übergängen — glamourös, aber ruhig und klar bedienbar.

## Colors

- `--color-bg`: **#0F0C0E**
- `--color-fg`: **#F4EEE1**
- `--color-accent`: **#D4AF37**
- `--color-border`: **#2C262B**
- `--color-muted`: **#938A85**
- `--color-surface`: **#171316**
- `--color-surface_alt`: **#1D171B**
- `--color-danger`: **#E5484D**
- `--color-success`: **#46A758**

## Typography

- `font_family`: Georgia, 'Times New Roman', serif
- `heading_weight`: 700
- `body_weight`: 400

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Primary: padding 12px 24px, min-height 44px, radius 10px, bg #D4AF37, color #17120A, font-weight 600, letter-spacing 0.02em; hover bg #E2C65E; active bg #B8942F; disabled opacity 0.45 ohne Pointer. Secondary: bg transparent, 1px solid #D4AF37, color #D4AF37, hover bg rgba(212,175,55,0.10). Danger: bg transparent, 1px solid #E5484D, color #E5484D. Übergang 160ms ease.

### Card

bg #171316, border 1px solid #2C262B, radius 10px, padding 16px, Schatten 0 8px 24px rgba(0,0,0,0.25); hover border #D4AF37 bei 45% Deckkraft, transform translateY(-2px), Übergang 180ms ease. Bildbereich oben mit aspect-ratio 4/5, object-fit cover, Radius 6px.

### Input

bg #141014, border 1px solid #2C262B, radius 10px, padding 10px 12px, min-height 44px, color #F4EEE1, placeholder #938A85; focus border #D4AF37, box-shadow 0 0 0 3px rgba(212,175,55,0.18); error border #E5484D, box-shadow 0 0 0 3px rgba(229,72,77,0.18).

### CategoryBadge

bg rgba(212,175,55,0.12), color #D4AF37, radius 999px, padding 4px 12px, font-size 12px, text-transform uppercase, letter-spacing 0.08em, font-weight 600.

### NavHeader

sticky top, bg rgba(15,12,14,0.85), backdrop-filter blur(12px), border-bottom 1px solid #2C262B, min-height 64px; Logo in Serif 700, color #D4AF37, letter-spacing 0.04em; Links color #938A85, hover #F4EEE1, active #D4AF37; rechts Profil-/Logout-Aktion als Secondary Button.

### Modal

Overlay bg rgba(0,0,0,0.65) mit backdrop-filter blur(4px); Panel bg #171316, border 1px solid #2C262B, radius 16px, max-width 520px, padding 24px, Schatten 0 24px 64px rgba(0,0,0,0.5); Schließen-Icon mit 44px Tap-Ziel.

### EmptyState

zentriert, padding 48px 24px, Icon 48px in #938A85, Text color #938A85, max-width 360px; Call-to-Action als Primary Button.

### FormError

color #E5484D, font-size 14px, padding 4px 0, mit Warn-Icon links, klar lesbar und ohne Layout-Sprung.

### ImageUploadZone

gestrichelter Rahmen 1px solid #2C262B, radius 10px, padding 24px, bg #141014, hover border #D4AF37; Vorschau 96px Thumb mit Radius 6px; Hinweistext color #938A85; Fehlerzustand border #E5484D.

## Layout Principles

- Container max-width 1200px, zentriert, Seitenpadding 16px unter 640px und 32px ab 640px.
- Breakpoints: 640px (Tablet) und 1024px (Desktop).
- Garderoben- und Outfit-Raster: 2 Spalten mobil, 3 Spalten ab 640px, 4 Spalten ab 1024px; Abstand 16px.
- Outfit-Creator ab 1024px zweispaltig (Auswahl links 60%, Vorschau rechts 40%), mobil gestapelt.
- Vertikale Sektionsabstände 48px, Abstand innerhalb von Karten 16px.
- Übergänge 150–200ms ease; prefers-reduced-motion respektieren.
- Header sticky, Footer mit Impressum und Datenschutzerklärung auf jeder Seite erreichbar.
