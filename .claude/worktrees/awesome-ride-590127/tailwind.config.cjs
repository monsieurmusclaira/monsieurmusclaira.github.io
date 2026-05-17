/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				montserrat: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
			},
			colors: {
				cream: '#faf8f5',
				charcoal: '#1a1a1a',
				warmgray: '#6b6b6b',
				warmborder: '#e8e4df',
				slateblue: '#3a5a7c',
			},
		},
	},
	container: {
		center: true,
	},
	daisyui: {
		themes: [
		  {
			kate: {
				"primary": "#3a5a7c",
				"primary-content": "#ffffff",
				"secondary": "#6b6b6b",
				"accent": "#3a5a7c",
				"neutral": "#faf8f5",
				"neutral-content": "#1a1a1a",
				"base-100": "#faf8f5",
				"base-200": "#f0ece6",
				"base-300": "#e8e4df",
				"base-content": "#1a1a1a",
				"info": "#3a5a7c",
				"success": "#36D399",
				"warning": "#3a5a7c",
				"error": "#D64D42",
			},
		  },
		],
	},
	plugins: [require("@tailwindcss/typography"),require("daisyui")],
	darkMode: "class"
}
