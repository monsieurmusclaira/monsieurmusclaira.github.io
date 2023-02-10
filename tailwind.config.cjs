/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	daisyui: {
		themes: [
		  {
			mytheme: {   
				"primary": "#fbbf24",   
				"secondary": "#0369a1",   
				"accent": "#fbbf24",
				"neutral": "#e5e7eb",
				"base-100": "#2A303C",
				"info": "#3ABFF8",
				"success": "#36D399",
				"warning": "#FBBD23",
				"error": "#F87272",
			},
		  },
		],
	  },
	  corePlugins: {
		aspectRatio: false,
	  },
	plugins: [require("@tailwindcss/typography"),require("daisyui"),require('@tailwindcss/aspect-ratio')]
}
