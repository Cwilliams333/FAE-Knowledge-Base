>     --color-syntax-string: 150 60% 36%;

>     --color-syntax-number: 25 85% 50%;

>     --color-syntax-function: 210 80% 50%;

>     --color-syntax-comment: 215 15% 55%;

>     --color-syntax-variable: 0 75% 50%;

>     --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

>     --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

>     --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

>     --radius: 0.5rem;

>     --radius-sm: 0.25rem;

>     --radius-md: 0.5rem;

>     --radius-lg: 0.75rem;

>   }

  }

  

    at /app/node_modules/tailwindcss/dist/lib.js:33:10

    at z (/app/node_modules/tailwindcss/dist/lib.js:3:1656)

    at /app/node_modules/tailwindcss/dist/lib.js:31:6188

    at z (/app/node_modules/tailwindcss/dist/lib.js:3:1656)

    at z (/app/node_modules/tailwindcss/dist/lib.js:3:1574)

    at ki (/app/node_modules/tailwindcss/dist/lib.js:31:2414)

    at async bi (/app/node_modules/tailwindcss/dist/lib.js:35:1123)

    at async _r (/app/node_modules/@tailwindcss/node/dist/index.js:10:3384)

    at async p (/app/node_modules/@tailwindcss/postcss/dist/index.js:10:4019)

    at async Object.Once (/app/node_modules/@tailwindcss/postcss/dist/index.js:10:4290)

    at async LazyResult.runAsync (/app/node_modules/postcss/lib/lazy-result.js:293:11)

    at async runPostCSS (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:43824:21)

    at async compilePostCSS (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:43794:18)

    at async compileCSS (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:43649:27)

    at async TransformPluginContext.handler (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:42965:11)

    at async EnvironmentPluginContainer.transform (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:42294:18)

    at async loadAndTransform (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:35735:27)


The "Cannot apply unknown utility class: bg-border" error occurs when you're trying to use a Tailwind CSS utility class that doesn't exist or isn't properly defined in your configuration. This is a common issue that has several potential causes and solutions.

## **Primary Causes**

**Tailwind v4 Configuration Issues**
The most common cause is related to Tailwind CSS v4's new configuration system. In Tailwind v4, the configuration approach has changed significantly from previous versions[2]. The framework no longer automatically detects JavaScript config files and requires explicit configuration directives in your CSS file[2].

**Missing Custom Color Definitions**
The `bg-border` class suggests you're trying to use a custom color called "border" that hasn't been properly defined in your theme configuration[2][6]. This often happens when using component libraries like shadcn/ui that expect certain custom colors to be available.

**Incorrect CSS Import Structure**
If you're using Tailwind v4, you might be using the old import syntax instead of the new CSS-first configuration approach[2].

## **Solutions**

**For Tailwind v4 Projects**
Replace your old CSS imports with the new v4 syntax. Instead of:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Use:
```css
@import "tailwindcss";
@config "../../tailwind.config.js";
```

This tells Tailwind v4 to explicitly load your JavaScript configuration file[2].

**Define Custom Colors in CSS**
If you're using Tailwind v4, define your custom colors directly in your CSS using the `@theme` directive:
```css
@import "tailwindcss";

@theme {
  --color-border: #e5e7eb;
  --color-background: #ffffff;
  --color-foreground: #000000;
}
```

**For Component Library Integration**
When using libraries like shadcn/ui, ensure you have all required custom colors defined. You can add them to your `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
}
```

**Using @layer for Custom Classes**
If you need to define the class manually, use the `@layer` directive:
```css
@layer base {
  .bg-border {
    background-color: theme('colors.gray.200');
  }
}
```

## **Version-Specific Considerations**

**Tailwind v3 vs v4**
Many of these errors occur during upgrades from Tailwind v3 to v4[1][3]. If you recently upgraded, ensure you're following the v4 migration guide completely, as the configuration system has fundamentally changed.

**Framework Integration**
The error is particularly common in Next.js projects using the Pages Router with Tailwind v4[3][4]. Make sure your PostCSS configuration is compatible with your framework version.

**Build Environment Issues**
Some users report build failures on specific platforms (like Linux ARM on Vercel) when using Tailwind v4[8]. You may need to add optional dependencies to your `package.json` for cross-platform compatibility.

The key is identifying whether you're using a custom color that needs definition or if there's a configuration mismatch between your Tailwind version and setup approach.

[1] https://github.com/tailwindlabs/tailwindcss/issues/15778
[2] https://stackoverflow.com/questions/77443221/the-border-border-class-does-not-exist-if-border-border-is-a-custom-class
[3] https://stackoverflow.com/questions/79577507/tailwind-4-utilities-failing-cannot-apply-unknown-utility-class-in-next-js-1
[4] https://www.reddit.com/r/tailwindcss/comments/1k0n709/need_help_tailwind_4_utilities_failing_cannot/
[5] https://elixirforum.com/t/error-cannot-apply-unknown-utility-class/70549
[6] https://stackoverflow.com/questions/79427624/cannot-apply-unknown-utility-class-rounded-r-lg-but-its-a-valid-tailwindcss-cl
[7] https://www.answeroverflow.com/m/1331882505434828821
[8] https://www.rexwang.cc/articles/2025-issues-with-tailwind-v4
[9] https://www.reddit.com/r/tailwindcss/comments/1j73vu5/apply_doesnt_work_with_layer_base_and_layer/
[10] https://tailwindcss.com/docs/detecting-classes-in-source-files