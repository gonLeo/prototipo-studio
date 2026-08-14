import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessaoProvider, useSessao } from './hooks/useSessao';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { PainelPlaceholder } from './pages/PainelPlaceholder';
import type { PerfilAcesso } from './types/domain';

const ROTA_PERFIL: Record<PerfilAcesso, string> = {
  administracao: '/administracao',
  professora: '/professora',
  aluna: '/aluna',
};

function RotaComPerfil({ perfilExigido, children }: { perfilExigido: PerfilAcesso; children: ReactNode }) {
  const { perfilAtivo, carregando } = useSessao();

  if (carregando) return null;
  if (!perfilAtivo) return <Navigate to="/login" replace />;
  if (perfilAtivo !== perfilExigido) return <Navigate to={ROTA_PERFIL[perfilAtivo]} replace />;

  return <AppShell>{children}</AppShell>;
}

function RotaInicial() {
  const { perfilAtivo, carregando } = useSessao();
  if (carregando) return null;
  return <Navigate to={perfilAtivo ? ROTA_PERFIL[perfilAtivo] : '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <SessaoProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/administracao"
            element={
              <RotaComPerfil perfilExigido="administracao">
                <PainelPlaceholder
                  titulo="Painel da Administração"
                  proximasFases={[
                    'Fase 1 — modalidades, espaços, horário de funcionamento, parâmetros e professoras/categorias',
                    'Fase 2 — grade de horários e calendário de exceções',
                    'Fase 3 — cadastro de alunas, pacotes, contratos, bolsa, trancamento e suspensão',
                    'Fases seguintes — agendamento, presença, comissão, financeiro, experimental, convênios e painéis',
                  ]}
                />
              </RotaComPerfil>
            }
          />
          <Route
            path="/professora"
            element={
              <RotaComPerfil perfilExigido="professora">
                <PainelPlaceholder
                  titulo="Painel da Professora"
                  proximasFases={[
                    'Fase 2 — grade de horários com as próprias sessões',
                    'Fase 5 — chamada, presença e acompanhamento de comissão',
                  ]}
                />
              </RotaComPerfil>
            }
          />
          <Route
            path="/aluna"
            element={
              <RotaComPerfil perfilExigido="aluna">
                <PainelPlaceholder
                  titulo="Painel da Aluna"
                  proximasFases={[
                    'Fase 3 — ficha da aluna, pacote e situação financeira',
                    'Fase 4 — agendamento, cancelamento e justificativa de falta',
                  ]}
                />
              </RotaComPerfil>
            }
          />
          <Route path="/" element={<RotaInicial />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessaoProvider>
    </BrowserRouter>
  );
}

export default App;
