import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error("Missing Supabase server environment variables");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecret,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);