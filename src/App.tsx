import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessaoProvider, useSessao } from './hooks/useSessao';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { PainelPlaceholder } from './pages/PainelPlaceholder';
import { AdministracaoLayout } from './pages/administracao/AdministracaoLayout';
import { AdministracaoHome } from './pages/administracao/AdministracaoHome';
import { ModalidadesPage } from './pages/administracao/ModalidadesPage';
import { EspacosPage } from './pages/administracao/EspacosPage';
import { StudioPage } from './pages/administracao/StudioPage';
import { ParametrosPage } from './pages/administracao/ParametrosPage';
import { ProfessorasPage } from './pages/administracao/ProfessorasPage';
import { CategoriasProfessoraPage } from './pages/administracao/CategoriasProfessoraPage';
import { GradePage } from './pages/administracao/GradePage';
import { ExcecoesPage } from './pages/administracao/ExcecoesPage';
import { PacotesPage } from './pages/administracao/PacotesPage';
import { AlunasPage } from './pages/administracao/AlunasPage';
import { AlunaFichaPage } from './pages/administracao/AlunaFichaPage';
import { TermosPage } from './pages/administracao/TermosPage';
import { MatriculaPage } from './pages/MatriculaPage';
import { PainelAlunaPage } from './pages/aluna/PainelAlunaPage';
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
      <ToastProvider>
        <ConfirmProvider>
          <SessaoProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/administracao"
                element={
                  <RotaComPerfil perfilExigido="administracao">
                    <AdministracaoLayout />
                  </RotaComPerfil>
                }
              >
                <Route index element={<AdministracaoHome />} />
                <Route path="modalidades" element={<ModalidadesPage />} />
                <Route path="espacos" element={<EspacosPage />} />
                <Route path="studio" element={<StudioPage />} />
                <Route path="parametros" element={<ParametrosPage />} />
                <Route path="professoras" element={<ProfessorasPage />} />
                <Route path="categorias" element={<CategoriasProfessoraPage />} />
                <Route path="grade" element={<GradePage />} />
                <Route path="excecoes" element={<ExcecoesPage />} />
                <Route path="alunas" element={<AlunasPage />} />
                <Route path="alunas/:alunaId" element={<AlunaFichaPage />} />
                <Route path="pacotes" element={<PacotesPage />} />
                <Route path="termos" element={<TermosPage />} />
              </Route>
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
                    <PainelAlunaPage />
                  </RotaComPerfil>
                }
              />
              {/* Link público de auto-matrícula (RF-ALU-04): fora da casca do sistema e sem sessão. */}
              <Route path="/matricula" element={<MatriculaPage />} />
              <Route path="/" element={<RotaInicial />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SessaoProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
