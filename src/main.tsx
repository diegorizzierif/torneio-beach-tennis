import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { configurado } from './lib/supabase';
import Inicio from './pages/Inicio';
import Jogadores from './pages/Jogadores';
import Organizador from './pages/Organizador';
import Publico from './pages/Publico';
import './styles.css';

function SemConfig() {
  return (
    <main className="conteudo">
      <h1>Falta configurar o Supabase</h1>
      <p>
        Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja o README).
      </p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {configurado ? (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/jogadores" element={<Jogadores />} />
          <Route path="/organizar/:id" element={<Organizador />} />
          <Route path="/t/:codigo" element={<Publico />} />
          <Route path="*" element={<div className="vazio grande tela-cheia">Página não encontrada.</div>} />
        </Routes>
      </BrowserRouter>
    ) : (
      <SemConfig />
    )}
  </React.StrictMode>,
);
