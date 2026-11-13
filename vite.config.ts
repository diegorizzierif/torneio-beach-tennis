import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Alvo mais antigo para funcionar também em iPhones com iOS desatualizado.
export default defineConfig({ plugins: [react()], build: { target: ['es2017', 'safari12', 'ios12'] } });
