import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'bind-keyboard',
      fileName: 'bind-keyboard',
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
      treeshake: true // TODO
    }
  }
})
