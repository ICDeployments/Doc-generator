import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,       // force Vite to run on 5174
    strictPort: true, // don't fall back to another port
  },
})