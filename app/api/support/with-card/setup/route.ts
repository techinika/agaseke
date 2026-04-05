import { NextResponse } from "next/server";

export async function GET() {
  try {
    const config = {
      url: process.env.PESAPAL_URL?.trim(),
      key: process.env.PESAPAL_CONSUMER_KEY?.trim(),
      secret: process.env.PESAPAL_CONSUMER_SECRET?.trim(),
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL?.trim(),
    };

    if (!config.url || !config.key || !config.secret) {
      console.error("Missing PesaPal environment variables");
      return NextResponse.json({ error: "Missing config" }, { status: 500 });
    }

    const authRes = await fetch(`${config.url}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        consumer_key: config.key,
        consumer_secret: config.secret,
      }),
    });

    if (!authRes.ok) {
      console.error("PesaPal auth failed with status:", authRes.status);
      return NextResponse.json(
        { error: "Auth Failed" },
        { status: 401 },
      );
    }

    const authData = await authRes.json();

    if (!authData.token) {
      console.error("PesaPal auth failed: no token received");
      return NextResponse.json(
        { error: "Auth Failed" },
        { status: 401 },
      );
    }

    const ipnPath = `${config.baseUrl}/api/support/with-card/ipn`;

    const ipnRes = await fetch(`${config.url}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authData.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: ipnPath,
        ipn_notification_type: "POST",
      }),
    });

    if (!ipnRes.ok) {
      console.error("IPN registration failed with status:", ipnRes.status);
      return NextResponse.json(
        { error: "IPN Registration Failed" },
        { status: 400 },
      );
    }

    const ipnData = await ipnRes.json();

    if (!ipnData.ipn_id) {
      console.error("IPN registration failed: no ipn_id received");
      return NextResponse.json(
        { error: "IPN Registration Failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Success",
      PESAPAL_IPN_ID: ipnData.ipn_id,
    });
  } catch (error) {
    console.error("PesaPal setup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
