import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export default function PrivateRoute({ component: Component, ...rest }: PrivateRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Evita múltiplos redirecionamentos
    if (hasRedirected) return;
    
    // Se ainda está carregando, não faz nada
    if (loading) return;
    
    // Se não está autenticado, redireciona
    if (!isAuthenticated) {
      setHasRedirected(true);
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation, hasRedirected]);

  // Enquanto está carregando, mostra tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderiza nada (o redirecionamento já foi feito)
  if (!isAuthenticated) {
    return null;
  }

  // Se está autenticado, renderiza o componente
  return <Component {...rest} />;
}
