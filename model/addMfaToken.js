// model/addMfaToken.js
const supabase = require("../dbConnection");

async function addMfaToken(userId, token) {
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  const payload = {
    user_id: Number(userId),   // ensure numeric for your int8 column
    token: String(token),
    expiry,
    is_used: false,
  };

  console.log("[MFA] addMfaToken inserting:", payload);

  const { data, error } = await supabase
    .from("mfatokens")
    .insert(payload)
    .select();

  if (error) {
    console.error("[MFA] addMfaToken insert ERROR:", error);
    throw error;
  }

  console.log("[MFA] addMfaToken insert OK:", data);
  return true;
}

async function verifyMfaToken(userId, tokenAttempt) {
  console.log("[MFA] verifyMfaToken check:", { userId, tokenAttempt });

  const { data, error } = await supabase
    .from("mfatokens")
    .select("*")
    .eq("user_id", Number(userId))
    .eq("is_used", false)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[MFA] verifyMfaToken select ERROR:", error);
    return false;
  }

  if (!data) {
    console.warn("❌ No token row for user:", userId);
    return false;
  }

  if (new Date(data.expiry).getTime() < Date.now()) {
    console.warn("❌ Token expired for user:", userId);
    return false;
  }

  if (String(data.token) !== String(tokenAttempt)) {
    console.warn("❌ Token mismatch for user:", userId, "expected:", data.token, "got:", tokenAttempt);
    return false;
  }

  const { error: updErr } = await supabase
    .from("mfatokens")
    .update({ is_used: true })
    .eq("id", data.id);

  if (updErr) console.error("[MFA] mark used ERROR:", updErr);
  else console.log("✅ Token verified & marked used for user:", userId);

  return true;
}

module.exports = { addMfaToken, verifyMfaToken };
