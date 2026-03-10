import { NextResponse } from "next/server";

export async function GET() {
  console.log("--- PESAPAL SETUP START ---");

  try {
    const config = {
      url: process.env.PESAPAL_URL?.trim(),
      key: process.env.PESAPAL_CONSUMER_KEY?.trim(),
      secret: process.env.PESAPAL_CONSUMER_SECRET?.trim(),
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL?.trim(),
    };

    console.log("Environment Check:", {
      url: config.url,
      keyExists: !!config.key,
      keyLength: config.key?.length,
      baseUrl: config.baseUrl,
    });

    if (!config.url || !config.key || !config.secret) {
      console.error("Critical Error: Missing environment variables.");
      return NextResponse.json({ error: "Missing config" }, { status: 500 });
    }

    console.log("Attempting Auth with Pesapal...");
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

    console.log("Auth Status Code:", authRes.status);
    const authData = await authRes.json();
    console.log("Auth Data Received:", JSON.stringify(authData, null, 2));

    if (!authData.token) {
      console.error("Auth Failed. Stopping execution.");
      return NextResponse.json(
        { error: "Auth Failed", details: authData },
        { status: 401 },
      );
    }

    // 2. IPN Registration
    const ipnPath = `${config.baseUrl}/api/support/with-card/ipn`;
    console.log("Attempting IPN Registration for URL:", ipnPath);

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

    console.log("IPN Status Code:", ipnRes.status);
    const ipnData = await ipnRes.json();
    console.log("IPN Data Received:", JSON.stringify(ipnData, null, 2));

    if (!ipnData.ipn_id) {
      console.error("IPN Registration Failed.");
      return NextResponse.json(
        { error: "IPN Failed", details: ipnData },
        { status: 400 },
      );
    }

    console.log("--- SETUP SUCCESSFUL: IPN ID GENERATED ---");
    return NextResponse.json({
      message: "Success",
      PESAPAL_IPN_ID: ipnData.ipn_id,
      debug: ipnData,
    });
  } catch (error: any) {
    console.error("CRITICAL FUNCTION CRASH:", error.message);
    return NextResponse.json(
      { error: "Internal Crash", message: error.message },
      { status: 500 },
    );
  }
}
