import type { Env } from "./types";

const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? textEncoder.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function signHmac(rawKey: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return new Uint8Array(signature);
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  return signHmac(textEncoder.encode(secret), data);
}

/**
 * AWS Signature Version 4 core — generic over method/host/uri/headers so it
 * can be validated against AWS's documented test vectors. Pure Web Crypto.
 */
export async function signV4Core(params: {
  method: string;
  uri: string;
  canonicalQuery: string;
  headers: Record<string, string>;
  payloadHash: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  amzDate?: string;
}): Promise<{ authorization: string; amzDate: string }> {
  const {
    method,
    uri,
    canonicalQuery,
    headers,
    payloadHash,
    region,
    service,
    accessKeyId,
    secretAccessKey,
    amzDate: providedAmzDate,
  } = params;

  const amzDate = providedAmzDate ?? new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const headerNames = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();
  const canonicalHeaders =
    headerNames.map((name) => `${name}:${headers[name].trim()}`).join("\n") + "\n";
  const signedHeaders = headerNames.join(";");

  const canonicalRequest = [
    method,
    uri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await signHmac(kDate, region);
  const kService = await signHmac(kRegion, service);
  const kSigning = await signHmac(kService, "aws4_request");

  const signature = bytesToHex(await signHmac(kSigning, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, amzDate };
}

/**
 * AWS Signature Version 4 signing for the SES v2 outbound-emails endpoint.
 * Pure Web Crypto + fetch — no AWS SDK dependency.
 */
async function signV4(params: {
  payload: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<{ authorization: string; amzDate: string; payloadHash: string }> {
  const { payload, region, accessKeyId, secretAccessKey } = params;
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const uri = "/v2/email/outbound-emails";
  const payloadHash = await sha256Hex(payload);
  const amzDateNow = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");

  const { authorization, amzDate } = await signV4Core({
    method: "POST",
    uri,
    canonicalQuery: "",
    headers: {
      "content-type": "application/json",
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDateNow,
    },
    payloadHash,
    region,
    service,
    accessKeyId,
    secretAccessKey,
  });

  return { authorization, amzDate, payloadHash };
}

export interface SesEmailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Send one email via Amazon SES v2 (SendEmail). Returns the SES MessageId.
 */
export async function sendSesEmail(env: Env, input: SesEmailInput): Promise<string> {
  const region = env.AWS_REGION || "us-east-1";
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS SES credentials are not configured");
  }

  const { to, cc = [], bcc = [], subject, html, text } = input;

  const payload = JSON.stringify({
    FromEmailAddress: `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
    Destination: {
      ToAddresses: to,
      ...(cc.length > 0 ? { CcAddresses: cc } : {}),
      ...(bcc.length > 0 ? { BccAddresses: bcc } : {}),
    },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
    },
  });

  const { authorization, amzDate, payloadHash } = await signV4({
    payload,
    region,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  });

  const host = `email.${region}.amazonaws.com`;
  const res = await fetch(`https://${host}/v2/email/outbound-emails`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body: payload,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SES error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { MessageId: string };
  return data.MessageId;
}