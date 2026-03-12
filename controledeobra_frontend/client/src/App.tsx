import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import ProjetosPage from "./pages/ProjetosPage";
import AtividadesPage from "./pages/Atividades";
import SubatividadesPage from "./pages/Subatividades";
import TarefasPage from "./pages/Tarefas";
import OrcamentoPage from "./pages/Orcamento";
import UsuariosPage from "./pages/Usuarios";

function Router() {
  return (
    <Switch>
      {/* ===== ROTAS PÚBLICAS ===== */}
      <Route path={"/login"} component={LoginPage} />
      
      {/* ===== ROTAS PRIVADAS (PROTEGIDAS) ===== */}
      <Route path={"/"} component={(props) => <PrivateRoute component={Home} {...props} />} />
      <Route path={"/projetos"} component={(props) => <PrivateRoute component={ProjetosPage} {...props} />} />
      <Route path={"/projetos/:projetoId/atividades"} component={(props) => <PrivateRoute component={AtividadesPage} {...props} />} />
      <Route path={"/atividades/:atividadeId/subatividades"} component={(props) => <PrivateRoute component={SubatividadesPage} {...props} />} />
      <Route path={"/subatividades/:subatividadeId/tarefas"} component={(props) => <PrivateRoute component={TarefasPage} {...props} />} />
      <Route path={"/subatividades/:subatividadeId/orcamento"} component={(props) => <PrivateRoute component={OrcamentoPage} {...props} />} />
      <Route path={"/usuarios"} component={(props) => <PrivateRoute component={UsuariosPage} {...props} />} />
      
      {/* ===== ROTA 404 ===== */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
