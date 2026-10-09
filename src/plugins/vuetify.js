import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Theme mirrors src/assets/tokens.css and DESIGN.md (plum floor, one magenta light).
export default createVuetify({
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: {
    defaultTheme: 'gym',
    themes: {
      gym: {
        dark: true,
        colors: {
          background: '#08060A',
          surface: '#1B1720',
          'surface-bright': '#2A2531',
          'surface-light': '#241F2A',
          'surface-variant': '#C9C3CF',
          primary: '#E8158A',
          secondary: '#9A93A0',
          error: '#FF6B6B',
          // Button fills: dark enough for the light label to reach 4.5:1 (see DESIGN.md)
          'accent-deep': '#CE117B',
          'on-accent-deep': '#F5F0F4',
          danger: '#C92F2F',
          'on-danger': '#F5F0F4',
          'on-background': '#F5F0F4',
          'on-surface': '#F5F0F4',
          'on-primary': '#F5F0F4',
        },
        variables: {
          'border-color': '#423B49',
          'border-opacity': 1,
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'sm', elevation: 0, class: 'text-none font-weight-semibold' },
    VCard: { rounded: 'lg', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto' },
  },
})
