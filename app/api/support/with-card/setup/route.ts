import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Starting Pesapal Setup...");

    // 1. Get Auth Token
    const authRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Auth/RequestToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
        }),
      },
    );

    const authData = await authRes.json();

    if (!authData.token) {
      console.error("Auth failed:", authData);
      return NextResponse.json(
        { error: "Auth Failed", details: authData },
        { status: 401 },
      );
    }

    const token = authData.token;
    console.log("Auth Successful. Token received.");

    const ipnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/support/with-card/ipn`;

    const ipnRes = await fetch(
      `${process.env.PESAPAL_URL}/api/URLSetup/RegisterIPN`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: ipnUrl,
          ipn_notification_type: "POST",
        }),
      },
    );

    const ipnData = await ipnRes.json();
    console.log("IPN Registration Response:", ipnData);

    if (!ipnData.ipn_id) {
      return NextResponse.json(
        {
          error: "IPN Registration Failed",
          details: ipnData,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "SUCCESS! Copy the ipn_id to your .env file",
      PESAPAL_IPN_ID: ipnData.ipn_id,
      registered_url: ipnUrl,
    });
  } catch (error: any) {
    console.error("Setup Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
