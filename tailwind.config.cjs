/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	container: {
		center: true,
	  },
	daisyui: {
		themes: [
		  {
			mytheme: {   
				"primary": "#70AA74",   
				"secondary": "#F1D74E",   
				"accent": "#E08E35",
				"neutral": "#11131d",
				"base-100": "#eff0f6",
				"info": "#3ABFF8",
				"success": "#36D399",
				"warning": "#F1D74E",
				"error": "#D64D42",
			},
		  },
		],
	  },
	  corePlugins: {
		aspectRatio: false,
	  },
	plugins: [require("@tailwindcss/typography"),require("daisyui"),require('@tailwindcss/aspect-ratio')]
}