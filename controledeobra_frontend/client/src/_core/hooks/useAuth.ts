import { getLoginUrl } from "@/const";
import { apiService } from "@/lib/api";
import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: apiService.auth.me,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: apiService.auth.login,
    onSuccess: (user) => {
      // O token já é salvo no localStorage pelo apiService.auth.login
      queryClient.setQueryData(["auth", "me"], user);
      // Forçar um refetch para garantir que o estado esteja sincronizado
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiService.auth.logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
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
        return;
      }
      throw error;
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
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
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    
    // Se não houver usuário e não estivermos na página de login, redireciona
    const currentPath = window.location.pathname;
    if (!state.user && currentPath !== redirectPath) {
      window.location.href = redirectPath;
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user?.openId, // Depender apenas do ID para evitar re-execuções desnecessárias
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    logout,
  };
}
