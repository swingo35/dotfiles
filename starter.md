Here’s a compact, enterprise-grade style guide for a **Panda CSS** strategy that’s flex/grid-first, tokens-first, and easy for AI to follow.

# Core principles

* **Tokens-first:** All spacing, color, radii, typography, shadows, z-index, motion come from tokens.
* **Semantic colors:** Components use roles (e.g., `bg.canvas`, `fg.muted`, `accent.solid`) not raw palette names.
* **Flex-first:** Use `Flex/Stack` + `gap` for 1-D layout. Use **Grid** only when 2-D placement/density is required.
* **Composition > cascade:** Prefer **recipes** (cva/sva) and primitives over deep selectors or overrides.
* **Accessibility-first:** Strong `:focus-visible` rings, WCAG contrast, reduced-motion support, clear states.
* **Deterministic output:** Generated classes only; no runtime style mutations beyond data/aria attributes.
* **Dark mode via attributes:** Theme switch with `data-theme="light|dark"` (and `color-scheme`).
* **Responsive via tokens:** Breakpoints + tokenized `space`, `sizes`, `fontSizes` control scale.

# Architecture

* **Config:** `panda.config.ts` defines tokens, breakpoints, semantic tokens, and enables recipes.
* **Theme mapping:** Semantic tokens point to palette tokens per theme (light/dark) with `[data-theme]`.
* **Global styles:** Minimal reset + base typography.
* **Primitives:** `Flex`, `Stack`, `Grid`, `Container` thin wrappers around `styled`.
* **Recipes:** Reusable contracts with variants + (when needed) **slots** via `sva`.
* **Utilities:** `css()` and `cx()` for rare one-offs aligned to tokens.
* **Directories:**

  * `src/theme/` tokens, global styles, theme script
  * `src/styles/recipes/` component recipes
  * `src/components/primitives/` layout primitives
  * `src/components/ui/` actual UI components

# Tokens (example)

Define a compact, scalable base; expand as needed.

```ts
// panda.config.ts (excerpt)
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  include: ["./src/**/*.{ts,tsx}"],
  outdir: "styled-system",
  theme: {
    breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    tokens: {
      colors: {
        gray: { 1:{value:"#0b0d0f"}, 2:{value:"#121417"}, 12:{value:"#eef1f4"} },
        brand: { 4:{value:"#6ea8ff"}, 6:{value:"#1e66ff"}, 7:{value:"#1346ad"} },
        red: { 6:{value:"#e5484d"} }, green: { 6:{value:"#46a758"} }, yellow:{6:{value:"#f5a524"} }
      },
      fontSizes: { xs:{value:"12px"}, sm:{value:"14px"}, md:{value:"16px"}, lg:{value:"18px"}, xl:{value:"20px"} },
      radii: { sm:{value:"6px"}, md:{value:"10px"}, xl:{value:"16px"}, pill:{value:"9999px"} },
      space: { 1:{value:"4px"}, 2:{value:"8px"}, 3:{value:"12px"}, 4:{value:"16px"}, 6:{value:"24px"}, 8:{value:"32px"} },
      sizes: { container:{value:"1200px"} },
      shadows: { sm:{value:"0 1px 2px rgba(0,0,0,.06)"}, md:{value:"0 4px 12px rgba(0,0,0,.08)"} },
      zIndex: { base:{value:"0"}, dropdown:{value:"1000"}, overlay:{value:"1300"}, modal:{value:"1500"}, toast:{value:"1600"} },
      durations: { fast:{value:"120ms"}, normal:{value:"200ms"}, slow:{value:"320ms"} },
      easings: { standard:{value:"cubic-bezier(.2,.0,.2,1)"} }
    },
    semanticTokens: {
      colors: {
        "bg.canvas": { value: { _light: "{colors.gray.1}", _dark: "{colors.gray.1}" } },
        "bg.surface": { value: { _light: "white", _dark: "{colors.gray.2}" } },
        "fg.default": { value: { _light: "{colors.gray.1}", _dark: "{colors.gray.12}" } },
        "fg.muted": { value: { _light: "rgba(10,12,14,.7)", _dark: "rgba(238,241,244,.7)" } },
        "border.default": { value: { _light: "rgba(0,0,0,.08)", _dark: "rgba(255,255,255,.12)" } },
        "accent.solid": { value: "{colors.brand.6}" },
        "accent.muted": { value: "{colors.brand.4}" },
        "danger.solid": { value: "{colors.red.6}" },
        "success.solid": { value: "{colors.green.6}" },
        "warn.solid": { value: "{colors.yellow.6}" }
      }
    }
  }
});
```

# Color modes

* Root element sets `data-theme="light|dark"` and `<meta name="color-scheme" content="light dark">`.
* On first paint, choose theme from `localStorage` or `prefers-color-scheme`.
* No class toggles inside components; **only** read tokens tied to `[data-theme]`.

```ts
// src/theme/color-mode.ts
export function initColorMode() {
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.setAttribute("data-theme", (stored || system) as "light" | "dark");
}
export function setColorMode(mode: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("theme", mode);
}
```

# Layout primitives (flex/grid-first)

Use thin wrappers so AI can auto-complete props confidently.

```ts
// src/components/primitives/Flex.tsx
import { styled } from "styled-system/jsx";
export const Flex = styled("div", {
  base: { display: "flex" }
});

// src/components/primitives/Stack.tsx (vertical)
export const Stack = styled("div", {
  base: { display: "flex", flexDirection: "column", gap: "3" } // gap uses tokens
});

// src/components/primitives/HStack.tsx (horizontal)
export const HStack = styled("div", {
  base: { display: "flex", alignItems: "center", gap: "3" }
});

// src/components/primitives/Grid.tsx
export const Grid = styled("div", {
  base: { display: "grid", gap: "4" }
});

// src/components/primitives/Container.tsx
export const Container = styled("div", {
  base: {
    width: "100%",
    maxW: "sizes.container",
    mx: "auto",
    px: { base: "4", md: "6" }
  }
});
```

**Guidelines**

* Default layout = `Stack/HStack` with `gap`.
* Use **Grid** when you need both rows and columns, alignment areas, or `auto-fit/minmax`.
* Never hardcode spacing; always use `space` tokens.
* Responsiveness via objects: `gap: { base: "3", md: "4" }`, `gridTemplateColumns: { md: "repeat(12, 1fr)" }`.

# Grid patterns

* **Auto-fit cards:** `gridTemplateColumns: { sm: "repeat(auto-fit, minmax(16rem, 1fr))" }`
* **12-col at md+:** define columns at `md`, then place with `gridColumn` and `gridRow`.
* **Alignment:** prefer `place-items` and `place-content` before per-cell tweaks.

```ts
// Example cards grid
<Grid
  gridTemplateColumns={{ base: "1fr", sm: "repeat(auto-fit, minmax(16rem, 1fr))" }}
  gap={{ base: "3", md: "4" }}
/>
```

# Component recipes

Prefer **sva (slot variants)** for components with icons/spinners; **cva** for simple single-slot.

```ts
// src/styles/recipes/button.ts
import { sva } from "styled-system/css";

export const buttonRecipe = sva({
  slots: ["root", "iconLeft", "iconRight", "spinner"],
  base: {
    root: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "2",
      px: "4",
      py: "2",
      borderRadius: "md",
      borderWidth: "1px",
      transition: "background {durations.normal} {easings.standard}, transform {durations.fast} {easings.standard}",
      _focusVisible: { outline: "2px solid", outlineColor: "accent.muted" },
      _disabled: { opacity: 0.5, pointerEvents: "none" }
    },
    iconLeft: { display: "inline-flex" },
    iconRight: { display: "inline-flex" },
    spinner: { display: "inline-flex" }
  },
  variants: {
    intent: {
      primary: {
        root: { bg: "accent.solid", color: "white", borderColor: "transparent", _hover: { bg: "brand.7" } }
      },
      secondary: {
        root: { bg: "bg.surface", color: "fg.default", borderColor: "border.default", _hover: { bg: "accent.muted" } }
      },
      ghost: { root: { bg: "transparent", color: "fg.default", _hover: { bg: "accent.muted" } } },
      danger: { root: { bg: "danger.solid", color: "white" } }
    },
    size: {
      sm: { root: { h: "32px", fontSize: "sm" } },
      md: { root: { h: "40px", fontSize: "md" } },
      lg: { root: { h: "48px", fontSize: "lg" } }
    },
    shape: {
      rounded: { root: { borderRadius: "md" } },
      pill: { root: { borderRadius: "pill" } }
    },
    density: {
      compact: { root: { px: "3", py: "1.5" } },
      comfy: { root: { px: "4", py: "2" } }
    }
  },
  defaultVariants: { intent: "primary", size: "md", shape: "rounded", density: "comfy" },
  compoundVariants: [
    { intent: "ghost", density: "compact", css: { root: { px: "2.5" } } }
  ]
});
```

```tsx
// src/components/ui/Button.tsx
import { styled } from "styled-system/jsx";
import { buttonRecipe } from "@/styles/recipes/button";
import { createElement } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  shape?: "rounded" | "pill";
  density?: "compact" | "comfy";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  as?: any; // optional polymorphic
  "aria-label"?: string; // required for iconOnly
};

export function Button({
  intent, size, shape, density,
  leftIcon, rightIcon, loading,
  children, as = "button", ...props
}: ButtonProps) {
  const styles = buttonRecipe({ intent, size, shape, density });
  const Root = styled(as, { base: styles.root });
  const IconLeft = styled("span", { base: styles.iconLeft });
  const IconRight = styled("span", { base: styles.iconRight });
  const Spinner = styled("span", { base: styles.spinner });

  return (
    <Root {...props}>
      {loading && <Spinner aria-hidden />}
      {leftIcon && <IconLeft aria-hidden>{leftIcon}</IconLeft>}
      <span>{children}</span>
      {rightIcon && <IconRight aria-hidden>{rightIcon}</IconRight>}
    </Root>
  );
}
```

# State & attribute conventions

Use attributes to avoid ad-hoc classes:

* `data-state="open|closed|checked|on|off"`, `data-disabled`, `data-invalid`
* `aria-*` as truth: `aria-selected="true"`, `aria-current="page"`, `aria-busy="true"`
* Apply selectors in recipes: `&[data-state=open] { ... }`, `&_focusVisible { ... }`, `&_reducedMotion { ... }`

# Spacing & rhythm

* All gaps/margins use `space` tokens. Never hardcode pixel values.
* Page rhythm set via primitives (`Stack`, `Container`) with tokenized `gap` and `px`.
* Density controlled by a **variant** (e.g., `compact|comfy`) for entire sections.

# Responsiveness

* Prefer **content reflow** over hiding. Use responsive objects:
  `px={{ base: "4", md: "6" }}`, `display={{ base:"none", md:"flex" }}`
* Grid switches: 1-col → auto-fit cards → 12-col templates at `md+`.
* Typography scales modestly: `fontSize={{ base:"sm", md:"md", lg:"lg" }}`.

# Accessibility

* `:focus-visible` outline tokenized (e.g., `outlineColor: "accent.muted"`).
* Ensure text/background token pairs meet AA at target sizes.
* Honor reduced motion: wrap transitions in a `_reducedMotion` condition.
* Icon-only buttons require `aria-label`.

# Utilities vs recipes (rules of thumb)

* **Recipe** when: repeated component, multiple variants, multiple states, or slots.
* **Utility (`css()`)** when: ≤3 props for a local layout tweak.
* Avoid stacking many ad-hoc utilities; promote to a recipe when growth is obvious.

# Performance

* Keep variant matrices small; use **compoundVariants** sparingly.
* Prefer token changes over per-component overrides.
* Avoid unnecessary nested grids; flex children inside grid cells for micro-layout.

# Testing & quality

* **Types:** Recipe variants export types; props are compile-time validated.
* **Unit tests:** Assert recipe class composition per variant/state.
* **Visual regression:** Playwright snapshots of key flows (navbar, forms, cards).
* **Lint/format:** Biome; ignore `styled-system/`.

# Do / Don’t

**Do**

* Map Figma variables → token JSON → Panda tokens.
* Use `Stack/HStack` + `gap` as default layout.
* Use semantic color roles (`fg.default`, `bg.surface`, `accent.solid`).
* Express states with data/aria attributes.

**Don’t**

* Hardcode colors/sizes/spacing.
* Depend on deep descendant selectors or `!important`.
* Hide content for responsiveness when reflow works.
* Inline long style objects in component bodies (extract to recipes).

---

If you want, I can drop these snippets into your repo with a ready-to-use `theme/` folder (tokens, color-mode script, primitives, button recipe) and a couple of layout examples (cards grid, form, navbar) so you can run it immediately.

