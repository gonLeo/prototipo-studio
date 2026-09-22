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
import { CategoriasAulaPage } from './pages/administracao/CategoriasAulaPage';
import { GradePage } from './pages/administracao/GradePage';
import { AulasCanceladasPage } from './pages/administracao/AulasCanceladasPage';
import { IndicadoresDeProfessorasPage } from './pages/administracao/IndicadoresDeProfessorasPage';
import { ExcecoesPage } from './pages/administracao/ExcecoesPage';
import { PacotesPage } from './pages/administracao/PacotesPage';
import { AlunasPage } from './pages/administracao/AlunasPage';
import { AlunaFichaPage } from './pages/administracao/AlunaFichaPage';
import { TermosPage } from './pages/administracao/TermosPage';
import { MatriculaPage } from './pages/MatriculaPage';
import { JustificativasPage } from './pages/administracao/JustificativasPage';
import { SolicitacoesCancelamentoPage } from './pages/administracao/SolicitacoesCancelamentoPage';
import { PainelAlunaPage } from './pages/aluna/PainelAlunaPage';
import { MeuPacotePage } from './pages/aluna/MeuPacotePage';
import { GradeDaAlunaPage } from './pages/aluna/GradeDaAlunaPage';
import { MinhasAulasPage } from './pages/aluna/MinhasAulasPage';
import { MinhasAulasProfessoraPage } from './pages/professora/MinhasAulasProfessoraPage';
import { PainelProfessoraPage } from './pages/professora/PainelProfessoraPage';
import { AceiteDaProfessoraPage } from './pages/professora/AceiteDaProfessoraPage';
import { ChamadaPage } from './pages/professora/ChamadaPage';
import { AlunasDaProfessoraPage } from './pages/professora/AlunasDaProfessoraPage';
import { FichaDaAlunaProfessoraPage } from './pages/professora/FichaDaAlunaProfessoraPage';
import { ChamadaExcepcionalPage } from './pages/professora/ChamadaExcepcionalPage';
import { MeusPagamentosPage } from './pages/professora/MeusPagamentosPage';
import { ComissoesPage } from './pages/administracao/ComissoesPage';
import { VendasPage } from './pages/administracao/VendasPage';
import { AulasExcepcionaisPage } from './pages/administracao/AulasExcepcionaisPage';
import { ConveniosPage } from './pages/administracao/ConveniosPage';
import { ExperimentaisPage } from './pages/administracao/ExperimentaisPage';
import { ExperimentalPage } from './pages/ExperimentalPage';
import { GuiaDoPrototipoPage } from './pages/GuiaDoPrototipoPage';
import { NotificacoesPage } from './pages/administracao/NotificacoesPage';
import { AuditoriaPage } from './pages/administracao/AuditoriaPage';
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

/** RF-PRO-04: o acesso da professora só abre depois do aceite do termo. */
function EntradaDaProfessora() {
  const { usuario } = useSessao();
  return usuario?.situacao === 'aguardando_aceite' ? <AceiteDaProfessoraPage /> : <PainelProfessoraPage />;
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
                <Route path="categorias-aula" element={<CategoriasAulaPage />} />
                <Route path="grade" element={<GradePage />} />
                <Route path="excecoes" element={<ExcecoesPage />} />
                <Route path="aulas-canceladas" element={<AulasCanceladasPage />} />
                <Route path="indicadores-professoras" element={<IndicadoresDeProfessorasPage />} />
                <Route path="alunas" element={<AlunasPage />} />
                <Route path="alunas/:alunaId" element={<AlunaFichaPage />} />
                <Route path="pacotes" element={<PacotesPage />} />
                <Route path="termos" element={<TermosPage />} />
                <Route path="justificativas" element={<JustificativasPage />} />
                <Route path="solicitacoes" element={<SolicitacoesCancelamentoPage />} />
                <Route path="comissoes" element={<ComissoesPage />} />
                <Route path="vendas" element={<VendasPage />} />
                <Route path="aulas-excepcionais" element={<AulasExcepcionaisPage />} />
                <Route path="experimentais" element={<ExperimentaisPage />} />
                <Route path="convenios" element={<ConveniosPage />} />
                <Route path="notificacoes" element={<NotificacoesPage />} />
                <Route path="auditoria" element={<AuditoriaPage />} />
                {/* A administração ajusta chamada fora do prazo (RF-PRE-06). */}
                <Route path="chamada/:sessaoId/:data" element={<ChamadaPage />} />
                {/* Sem professora vinculada, a chamada da aula excepcional é da administração (RF-AEX-10). */}
                <Route path="chamada-excepcional/:aulaId" element={<ChamadaExcepcionalPage />} />
              </Route>
              <Route
                path="/professora"
                element={
                  <RotaComPerfil perfilExigido="professora">
                    <Outlet />
                  </RotaComPerfil>
                }
              >
                {/* RF-PRO-04: enquanto o termo não é aceito, o painel dá
                    lugar ao aceite — mesmo desenho do primeiro acesso da
                    aluna, que também acontece dentro do painel dela. */}
                <Route index element={<EntradaDaProfessora />} />
                <Route path="aulas" element={<MinhasAulasProfessoraPage />} />
                {/* RF-PRE-09: a professora consulta a ficha de qualquer aluna. */}
                <Route path="alunas" element={<AlunasDaProfessoraPage />} />
                <Route path="alunas/:alunaId" element={<FichaDaAlunaProfessoraPage />} />
                <Route path="chamada/:sessaoId/:data" element={<ChamadaPage />} />
                <Route path="chamada-excepcional/:aulaId" element={<ChamadaExcepcionalPage />} />
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
                <Route path="meu-pacote" element={<MeuPacotePage />} />
                <Route path="grade" element={<GradeDaAlunaPage />} />
                <Route path="minhas-aulas" element={<MinhasAulasPage />} />
              </Route>
              {/* Link público de auto-matrícula (RF-ALU-04): fora da casca do sistema e sem sessão. */}
              <Route path="/matricula" element={<MatriculaPage />} />
              {/* Fluxo público da aula experimental (RF-EXP-01): grade primeiro, pagamento depois. */}
              <Route path="/experimental" element={<ExperimentalPage />} />
              {/* Guia de uso do protótipo: fora da casca, abre em outra aba ao lado do que se está testando. */}
              <Route path="/guia" element={<GuiaDoPrototipoPage />} />
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
