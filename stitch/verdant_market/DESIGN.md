# Design System Document

## 1. Overview & Creative North Star: "The Organic Curator"

This design system is built upon the concept of **"The Organic Curator."** It rejects the cold, sterile nature of standard e-commerce grids in favor of a tactile, editorial experience that feels both premium and approachable. By combining a "Soft Modernist" aesthetic with playful, illustrated flourishes, the system creates a digital space that feels curated rather than automated.

The creative direction breaks the "template" look through:
*   **Intentional Asymmetry:** Utilizing varying card heights and breathing room to guide the eye naturally.
*   **Tactile Softness:** Leveraging a "Large Radius" philosophy where every corner (up to `3rem`) invites interaction.
*   **Tonal Depth:** Moving away from flat whites to a rich, warm background (`#fafaf1`) that feels like premium vellum.

---

## 2. Colors

The palette is anchored in a sophisticated "Earthy Verdant" scheme, accented by soft pastels to inject playfulness without sacrificing elegance.

### The "No-Line" Rule
To maintain a high-end editorial feel, **1px solid borders are strictly prohibited** for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. Use `surface-container-low` for secondary sections sitting on a `surface` background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Nesting should follow the Material tiering:
*   **Base Layer:** `surface` (#fafaf1)
*   **Main Content Cards:** `surface-container-lowest` (#ffffff) for maximum "pop."
*   **Section Backgrounds:** `surface-container` (#edefe2) to group related items.

### The "Glass & Gradient" Rule
For floating elements or hero CTAs, use **Glassmorphism**. Apply a backdrop-blur (12px–20px) to semi-transparent surface tokens.
*   **Signature Textures:** For primary buttons and high-impact headers, use a subtle linear gradient from `primary` (#3a6b00) to `primary_container` (#a1fa49) at a 135° angle.

---

## 3. Typography: Plus Jakarta Sans

We utilize **Plus Jakarta Sans** for its geometric clarity and modern "ink-trap" aesthetic, which adds a custom-tailored feel to product titles.

*   **Display (lg/md):** Reserved for hero marketing banners. High-impact, tight letter spacing (-0.02em).
*   **Headline (sm/md):** Used for category titles. This conveys authority and organizes the "Curator" layout.
*   **Title (md/sm):** Dedicated to product names. Use `title-md` for main product feeds to ensure hierarchy over pricing.
*   **Body (md/sm):** Used for descriptions. The slight warmth of the `on_surface_variant` color ensures readability without the harshness of pure black.
*   **Labels:** For technical data (stock, weight, price suffixes), use `label-md` in all-caps with +0.05em tracking for a premium, tagged look.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Place a `surface-container-lowest` card atop a `surface-container-low` background to create a soft, natural lift.

### Ambient Shadows
When a physical "float" is required (e.g., the Bottom Tab Bar), use a custom shadow:
*   **Token:** `0px 12px 32px rgba(47, 52, 41, 0.06)`
*   This uses a tinted version of `on_surface` to mimic natural light rather than an artificial grey drop shadow.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast modes), use a **Ghost Border**: `outline-variant` at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Search Bar
*   **Style:** `xl` (3rem) corner radius.
*   **Fill:** `surface-container-lowest` with a subtle `outline-variant` Ghost Border.
*   **Interaction:** On focus, the border transitions to `primary` at 40% opacity.

### Product & Service Cards
*   **Constraint:** No divider lines. Separate items using `md` (1.5rem) vertical spacing.
*   **Style:** Use the `surface-container-lowest` fill. For service items, use a horizontal layout with illustrated icons as the "leading" element.
*   **Corner Radius:** `lg` (2rem) for product images; `DEFAULT` (1rem) for inner nested elements.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_dim`), `full` (pill) radius, `on_primary` text.
*   **Secondary:** `primary_container` fill with `on_primary_container` text. No border.
*   **Ghost:** Transparent fill, `primary` text, used for low-priority actions like "View More."

### Illustrated Category Icons
*   **Frame:** Use a "Squircle" or `lg` rounded container.
*   **Backgrounds:** Use a 10% opacity version of the icon's primary hue (Light Pink, Orange, Yellow) to create a soft "halo" effect.

### Custom Bottom Tab Bar
*   **Visuals:** Floating `surface-container-lowest` with a 24px backdrop blur. 
*   **Icons:** Thick-stroke (2pt) custom illustrated icons. The active state uses the `primary` green with a soft `surface-variant` glow.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical spacing in list views to create an "Editorial" flow.
*   **Do** use the full spectrum of `surface-container` tokens to define hierarchy.
*   **Do** ensure all illustrated icons follow a consistent stroke weight and "Playful-Modern" aesthetic.
*   **Do** leverage `title-lg` for pricing to make it the clear secondary focal point after the product name.

### Don't
*   **Don't** use 1px solid black or grey lines to separate content; use whitespace or background shifts.
*   **Don't** use standard Material shadows (they are too "heavy" for this system); stick to Ambient Shadows.
*   **Don't** use sharp corners. The minimum radius for any container is `sm` (0.5rem), but the standard is `DEFAULT` (1rem).
*   **Don't** use high-contrast backgrounds for text; keep the tone "soft" by using `on_surface_variant` for secondary info.