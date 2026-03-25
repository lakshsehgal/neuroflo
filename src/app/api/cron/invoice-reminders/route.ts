import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInvoiceReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron using the secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find invoices that are PENDING or SENT, not yet reminder-sent,
    // and whose due date is within the client's reminderDaysBefore window
    const invoices = await db.invoice.findMany({
      where: {
        status: { in: ["PENDING", "SENT"] },
        reminderSent: false,
        client: { status: "ACTIVE" },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            reminderDaysBefore: true,
          },
        },
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      const reminderDays = invoice.client.reminderDaysBefore ?? 3;
      const dueDate = new Date(invoice.dueDate);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Send reminder if due date is within the reminder window (and not past due)
      if (diffDays >= 0 && diffDays <= reminderDays) {
        try {
          await sendInvoiceReminderEmail({
            clientName: invoice.client.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            gstRate: invoice.gstRate,
            dueDate: invoice.dueDate,
            clientId: invoice.clientId,
          });

          await db.invoice.update({
            where: { id: invoice.id },
            data: { reminderSent: true },
          });

          sent++;
        } catch (err) {
          const msg = `Failed for invoice ${invoice.id} (${invoice.client.name}): ${err instanceof Error ? err.message : String(err)}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: invoices.length,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Invoice reminder cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
