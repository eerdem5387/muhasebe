import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/context";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  const file = await ctx.db.attachment.findFirst({ where: { id } });
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
    },
  });
}
