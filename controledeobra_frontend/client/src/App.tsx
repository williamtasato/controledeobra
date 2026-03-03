import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import ProjetosPage from "./pages/ProjetosPage";
import AtividadesPage from "./pages/Atividades";
import SubatividadesPage from "./pages/Subatividades";
import TarefasPage from "./pages/Tarefas";
import OrcamentoPage from "./pages/Orcamento";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/projetos"} component={ProjetosPage} />
      <Route path={"/projetos/:projetoId/atividades"} component={AtividadesPage} />
      <Route path={"/atividades/:atividadeId/subatividades"} component={SubatividadesPage} />
      <Route path={"/subatividades/:subatividadeId/tarefas"} component={TarefasPage} />
      <Route path={"/subatividades/:subatividadeId/orcamento"} component={OrcamentoPage} />
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

