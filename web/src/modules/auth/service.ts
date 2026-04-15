import { supabase } from "../../lib/supabase";
import { resolveRoleFromClaims } from "./role";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function signUp(email: string, password: string, nome?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: nome ?? ""
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export { resolveRoleFromClaims };
