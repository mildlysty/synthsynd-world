import { createPrivateKey, randomBytes, sign as signMessage } from "node:crypto";

/** Builds the short-lived request-bound JWT CDP requires for its REST API. */
export function createCdpJwt(apiKeyId: string, apiKeySecret: string, method: string, requestPath: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header: Record<string, string> = { typ: "JWT", kid: apiKeyId, nonce: randomBytes(16).toString("hex") };
  const claims = { sub: apiKeyId, iss: "cdp", uris: [`${method} api.cdp.coinbase.com${requestPath}`], iat: issuedAt, nbf: issuedAt, exp: issuedAt + 120, jti: randomBytes(16).toString("hex") };
  let key: ReturnType<typeof createPrivateKey>;
  let algorithm: "EdDSA" | "ES256";
  let signingAlgorithm: string | null;
  if (apiKeySecret.includes("BEGIN") && apiKeySecret.includes("PRIVATE KEY")) {
    key = createPrivateKey(apiKeySecret);
    if (key.asymmetricKeyType !== "ec" || !["prime256v1", "secp256r1"].includes(key.asymmetricKeyDetails?.namedCurve ?? "")) throw new Error("CDP API key must be an Ed25519 or P-256 EC private key.");
    algorithm = "ES256";
    signingAlgorithm = "sha256";
  } else {
    const decoded = Buffer.from(apiKeySecret, "base64");
    if (decoded.length !== 64) throw new Error("CDP Ed25519 API key secret must decode to 64 bytes.");
    const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex");
    key = createPrivateKey({ key: Buffer.concat([pkcs8Prefix, decoded.subarray(0, 32)]), format: "der", type: "pkcs8" });
    algorithm = "EdDSA";
    signingAlgorithm = null;
  }
  header.alg = algorithm;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode(header)}.${encode(claims)}`;
  const signature = algorithm === "ES256"
    ? signMessage(signingAlgorithm, Buffer.from(input), { key, dsaEncoding: "ieee-p1363" })
    : signMessage(signingAlgorithm, Buffer.from(input), key);
  return `${input}.${signature.toString("base64url")}`;
}
