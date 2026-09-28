import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Cache mantido por 24h: se o usuario voltar a aba depois de muito tempo,
      // a tela reaparece com os dados que ja estavam la (e atualiza em segundo
      // plano) em vez de piscar em estado de carregamento.
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
});
