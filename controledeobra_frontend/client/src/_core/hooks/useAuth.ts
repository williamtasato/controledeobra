import { getLoginUrl } from "@/const";
import { apiService } from "@/lib/api";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const queryClient = useQueryClient();
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const result = await apiService.auth.me();
        return result;
      } catch (error) {
        console.error("[Auth] Erro ao verificar sessão:", error);
        return null;
      }
    },
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const loginMutation = useMutation({
    mutationFn: apiService.auth.login,
    onSuccess: (user) => {
      // O token já é salvo no localStorage pelo apiService.auth.login
      queryClient.setQueryData(["auth", "me"], user);
      // Forçar um refetch para garantir que o estado esteja sincronizado
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error: any) => {
      console.error("[Auth] Erro ao fazer login:", error);
      // Limpar dados de autenticação em caso de erro
      queryClient.setQueryData(["auth", "me"], null);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiService.auth.logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      // Limpar token do localStorage
      localStorage.removeItem("app_token");
    },
    onError: (error: any) => {
      console.error("[Auth] Erro ao fazer logout:", error);
      // Mesmo com erro, limpar dados locais
      queryClient.setQueryData(["auth", "me"], null);
      localStorage.removeItem("app_token");
    },
  });

  const login = useCallback(async (data: any) => {
    return await loginMutation.mutateAsync(data);
  }, [loginMutation]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expirado, apenas limpar localmente
        return;
      }
      throw error;
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      localStorage.removeItem("app_token");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  }, [logoutMutation, queryClient]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || loginMutation.isPending || logoutMutation.isPending,
      error: meQuery.error ?? loginMutation.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    loginMutation.isPending,
    loginMutation.error,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || loginMutation.isPending || logoutMutation.isPending) return;
    
    // Se não houver usuário e não estivermos na página de login, redireciona
    const currentPath = window.location.pathname;
    if (!state.user && currentPath !== redirectPath) {
      // Usar timeout para evitar múltiplos redirecionamentos
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = redirectPath;
      }, 100);
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user?.openId,
    loginMutation.isPending,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    logout,
  };
}
