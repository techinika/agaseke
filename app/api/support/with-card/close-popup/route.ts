import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(
    `<html>
      <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
        <div style="text-align:center;">
          <h2>Payment Processing...</h2>
          <p>This window will close automatically.</p>
        </div>
        <script>
          // Close this tab and let the main tab handle the success state
          window.close();
        </script>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
