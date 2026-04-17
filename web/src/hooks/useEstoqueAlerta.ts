import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export type AlertaEstoque = {
  key: number;
  id: string;
  nome: string;
  estoque_atual: number;
};

const LIMITE = 10;

export function useEstoqueAlerta(onAlerta: (alerta: Omit<AlertaEstoque, "key">) => void) {
  const onAlertaRef = useRef(onAlerta);
  onAlertaRef.current = onAlerta;

  // Tracks products already alerted this session to avoid spam
  const alertadosRef = useRef(new Set<string>());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel(`estoque-alerta:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "produtos" },
        (payload) => {
          const novo = payload.new as { id: string; nome: string; estoque_atual: number };

          if (novo.estoque_atual < LIMITE) {
            if (!alertadosRef.current.has(novo.id)) {
              alertadosRef.current.add(novo.id);
              onAlertaRef.current({ id: novo.id, nome: novo.nome, estoque_atual: novo.estoque_atual });

              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Estoque baixo!", {
                  body: `${novo.nome} tem apenas ${novo.estoque_atual} unidade(s) restante(s).`,
                  icon: "/favicon.svg"
                });
              }
            }
          } else {
            // Estoque voltou ao normal — permite alertar novamente se cair
            alertadosRef.current.delete(novo.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
