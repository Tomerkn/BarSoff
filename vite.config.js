import { defineConfig } from 'vite' // מביאים את כלי ההגדרות של Vite
import react from '@vitejs/plugin-react' // מביאים את התוסף שמריץ את ריאקט
import tailwindcss from '@tailwindcss/vite' // מביאים את התוסף של טיילווינד לעיצוב

export default defineConfig({ // מגדירים איך האתר יפעל בזמן הפיתוח
  plugins: [ // רשימת התוספים שאנחנו מפעילים
    tailwindcss(), // מפעילים את העיצוב המהיר
    react() // מפעילים את ריאקט
  ],
  server: {
    host: true, // מאפשר גישה למחשבים אחרים ברשת
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
