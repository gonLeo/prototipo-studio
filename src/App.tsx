import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SessaoProvider, useSessao } from './hooks/useSessao';
import { ToastProvider } from './hooks/useToast';
import { ConfirmProvider } from './hooks/useConfirm';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
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
import { JustificativasPage } from './pages/administracao/JustificativasPage';
import { SolicitacoesCancelamentoPage } from './pages/administracao/SolicitacoesCancelamentoPage';
import { PainelAlunaPage } from './pages/aluna/PainelAlunaPage';
import { GradeDaAlunaPage } from './pages/aluna/GradeDaAlunaPage';
import { MinhasAulasPage } from './pages/aluna/MinhasAulasPage';
import { MinhasAulasProfessoraPage } from './pages/professora/MinhasAulasProfessoraPage';
import { ChamadaPage } from './pages/professora/ChamadaPage';
import { MeusPagamentosPage } from './pages/professora/MeusPagamentosPage';
import { ComissoesPage } from './pages/administracao/ComissoesPage';
import { CobrancasPage } from './pages/administracao/CobrancasPage';
import { ConveniosPage } from './pages/administracao/ConveniosPage';
import { ExperimentaisPage } from './pages/administracao/ExperimentaisPage';
import { ExperimentalPage } from './pages/ExperimentalPage';
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
                <Route path="justificativas" element={<JustificativasPage />} />
                <Route path="solicitacoes" element={<SolicitacoesCancelamentoPage />} />
                <Route path="comissoes" element={<ComissoesPage />} />
                <Route path="cobrancas" element={<CobrancasPage />} />
                <Route path="experimentais" element={<ExperimentaisPage />} />
                <Route path="convenios" element={<ConveniosPage />} />
                {/* A administração ajusta chamada fora do prazo (RF-PRE-06). */}
                <Route path="chamada/:sessaoId/:data" element={<ChamadaPage />} />
              </Route>
              <Route
                path="/professora"
                element={
                  <RotaComPerfil perfilExigido="professora">
                    <Outlet />
                  </RotaComPerfil>
                }
              >
                <Route index element={<MinhasAulasProfessoraPage />} />
                <Route path="chamada/:sessaoId/:data" element={<ChamadaPage />} />
                <Route path="pagamentos" element={<MeusPagamentosPage />} />
              </Route>
              <Route
                path="/aluna"
                element={
                  <RotaComPerfil perfilExigido="aluna">
                    <Outlet />
                  </RotaComPerfil>
                }
              >
                <Route index element={<PainelAlunaPage />} />
                <Route path="grade" element={<GradeDaAlunaPage />} />
                <Route path="minhas-aulas" element={<MinhasAulasPage />} />
              </Route>
              {/* Link público de auto-matrícula (RF-ALU-04): fora da casca do sistema e sem sessão. */}
              <Route path="/matricula" element={<MatriculaPage />} />
              {/* Fluxo público da aula experimental (RF-EXP-01): grade primeiro, pagamento depois. */}
              <Route path="/experimental" element={<ExperimentalPage />} />
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
