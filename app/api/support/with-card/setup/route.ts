import { NextResponse } from "next/server";

export async function GET() {
  try {
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
      return NextResponse.json(
        {
          error: "Auth Failed",
          debug_pesapal_response: authData,
        },
        { status: 401 },
      );
    }

    const token = authData.token;

    if (!token)
      return NextResponse.json({ error: "Auth Failed" }, { status: 401 });

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
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/support/with-card/ipn`,
          ipn_notification_type: "POST",
        }),
      },
    );

    const ipnData = await ipnRes.json();

    console.log(ipnData);

    if (!ipnData.ipn_id) {
      return NextResponse.json(
        {
          error: "IPN Registration Failed",
          debug_ipn_response: ipnData,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Copy the ipn_id to your .env as PESAPAL_IPN_ID",
      ipn_id: ipnData.ipn_id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
