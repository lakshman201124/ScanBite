export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ success: false, error: "Upload service not configured." }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ success: false, error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: "File exceeds the 8 MB limit." }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder    = `scanbite/${session.user.restaurantId}`;
  const sigStr    = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha256").update(sigStr).digest("hex");

  const upload = new FormData();
  upload.set("file",      file);
  upload.set("api_key",   apiKey);
  upload.set("timestamp", String(timestamp));
  upload.set("signature", signature);
  upload.set("folder",    folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: upload }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    console.error("[upload] Cloudinary error:", err?.error?.message);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }

  const data = await res.json() as { secure_url: string };
  return NextResponse.json({ url: data.secure_url });
}
