// model/addMfaToken.js
const supabase = require("../dbConnection");

// Insert a new MFA token row for a user
async function addMfaToken(userId, token) {
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes TTL

  const { error } = await supabase.from("mfatokens").insert({
    user_id: userId,
    token: String(token),
    expiry,
    is_used: false,
  });

  if (error) {
    console.error("[MFA] addMfaToken error:", error);
    throw error;
  }
  return true;
}

// Verify a token for a user
async function verifyMfaToken(userId, tokenAttempt) {
  const { data, error } = await supabase
    .from("mfatokens")
    .select("*")
    .eq("user_id", userId)
    .eq("is_used", false)
    .order("id", { ascending: false }) // newest first
    .limit(1)
    .single();

  if (error || !data) {
    console.warn("❌ No valid token found for user:", userId, "token:", tokenAttempt);
    return false;
  }

  if (new Date(data.expiry).getTime() < Date.now()) {
    console.warn("❌ MFA token expired for user:", userId);
    return false;
  }

  if (String(data.token) !== String(tokenAttempt)) {
    console.warn("❌ MFA token mismatch for user:", userId);
    return false;
  }

  // ✅ Mark token as used (one-time use)
  await supabase.from("mfatokens").update({ is_used: true }).eq("id", data.id);

  console.log("✅ MFA token verified for user:", userId);
  return true;
}

module.exports = { addMfaToken, verifyMfaToken };
