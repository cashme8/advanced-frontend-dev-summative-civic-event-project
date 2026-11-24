/* Tailwind CDN theme: neutral charcoal (civic) + green accent (leaf). Loaded right after the Tailwind CDN script. */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                civic: { // neutral charcoal scale (was blue — toned down for a calmer UI)
                    50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa',
                    500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#0c0c0e',
                },
                leaf: {
                    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
                    500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
                },
            },
            fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
            boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)' },
        },
    },
};
