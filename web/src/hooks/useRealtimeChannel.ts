import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useRealtimeChannel(queryKey: readonly unknown[], table: string) {
  const queryClient = useQueryClient();
  const queryKeyHash = JSON.stringify(queryKey);

  useEffect(() => {
    // Unique topic avoids reusing an already subscribed channel in React StrictMode.
    const topic = `realtime:${table}:${queryKeyHash}:${Date.now()}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKeyHash, table]);
}
