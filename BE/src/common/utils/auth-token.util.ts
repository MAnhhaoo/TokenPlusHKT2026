import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export interface SignedTokenPayload {
  sub: string;
  role: "citizen" | "operator" | "coordinator";
  iat: number;
  exp: number;
}

const DEFAULT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lấy khóa bí mật dùng để ký và xác thực token phiên đăng nhập.
 */
function getTokenSecret(): string {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    "saigondrain-ai-hmac-secret-2026"
  );
}

/**
 * Băm mật khẩu có muối (salt) bằng thuật toán scrypt chống dò tìm bảng băm.
 */
export function hashPassword(raw: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(raw, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/**
 * Kiểm tra mật khẩu đầu vào với chuỗi băm đã lưu theo thời gian hằng số (constant-time).
 */
export function verifyPassword(raw: string, stored?: string | null): boolean {
  if (!stored) {
    return false;
  }

  if (stored.includes(":")) {
    const [saltHex, keyHex] = stored.split(":");
    if (!saltHex || !keyHex) {
      return false;
    }
    const expected = Buffer.from(keyHex, "hex");
    const actual = scryptSync(
      raw,
      Buffer.from(saltHex, "hex"),
      expected.length,
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  const legacyDigest = createHash("sha256").update(raw).digest("hex");
  const actualBuf = Buffer.from(legacyDigest, "utf8");
  const expectedBuf = Buffer.from(stored, "utf8");
  return (
    actualBuf.length === expectedBuf.length &&
    timingSafeEqual(actualBuf, expectedBuf)
  );
}

/**
 * Phát hành token có chữ ký HMAC-SHA256 kèm thời hạn sử dụng, không chứa email nhạy cảm.
 */
export function issueSignedToken(
  userId: string,
  role: SignedTokenPayload["role"] = "citizen",
  ttlMs = DEFAULT_TOKEN_TTL_MS,
): string {
  const now = Date.now();
  const payload: SignedTokenPayload = {
    sub: userId,
    role,
    iat: now,
    exp: now + ttlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Xác thực chữ ký và thời hạn của token phiên đăng nhập.
 */
export function verifySignedToken(token: string): SignedTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSig = createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SignedTokenPayload;
    if (
      !parsed ||
      typeof parsed.sub !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
