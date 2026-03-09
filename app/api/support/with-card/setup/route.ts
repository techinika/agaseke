import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Check for missing environment variables first
    const config = {
      url: process.env.PESAPAL_URL,
      key: process.env.PESAPAL_CONSUMER_KEY,
      secret: process.env.PESAPAL_CONSUMER_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    };

    if (!config.url || !config.key || !config.secret || !config.baseUrl) {
      return NextResponse.json(
        {
          error: "Missing Env Variables",
          check: {
            url: !!config.url,
            key: !!config.key,
            secret: !!config.secret,
            baseUrl: !!config.baseUrl,
          },
        },
        { status: 500 },
      );
    }

    // 2. Request Auth Token
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

    // Safely parse JSON once
    const authData = await authRes.json();

    console.log("AUTH Data", authData)

    if (!authData.token) {
      return NextResponse.json(
        {
          error: "Pesapal Auth Failed",
          status: authRes.status,
          details: authData,
        },
        { status: 401 },
      );
    }

    // 3. Register IPN
    const ipnRes = await fetch(`${config.url}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authData.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: `${config.baseUrl}/api/support/with-card/ipn`,
        ipn_notification_type: "POST",
      }),
    });

    const ipnData = await ipnRes.json();

    console.log("IPN Data", ipnData, "IPN ID", ipnData?.ipn_id);

    if (!ipnData.ipn_id) {
      return NextResponse.json(
        {
          error: "IPN Registration Failed",
          status: ipnRes.status,
          details: ipnData,
          attempted_url: `${config.baseUrl}/api/support/with-card/ipn`,
        },
        { status: 400 },
      );
    }

    // 4. Success
    return NextResponse.json({
      message: "Success! Copy the ID below to your .env file",
      PESAPAL_IPN_ID: ipnData.ipn_id,
    });
  } catch (error: any) {
    // Catch-all for network issues or code crashes
    console.log(error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
