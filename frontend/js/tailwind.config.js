/* Tailwind CDN theme: civic blue + light green. Loaded right after the Tailwind CDN script. */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                civic: {
                    50: '#eef5ff', 100: '#d9e8ff', 200: '#bcd6ff', 300: '#8ebcff', 400: '#5996ff',
                    500: '#3370f5', 600: '#1f55e0', 700: '#1a44b8', 800: '#1b3b91', 900: '#1c3573', 950: '#14214a',
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
