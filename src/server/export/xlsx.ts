import ExcelJS from "exceljs";

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
  money?: boolean;
}

export async function buildXlsx(
  sheetName: string,
  columns: XlsxColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Muhasebe SaaS";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));

  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1D4ED8" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const row of rows) {
    ws.addRow(row);
  }

  columns.forEach((c, i) => {
    if (c.money) {
      ws.getColumn(i + 1).numFmt = "#,##0.00";
      ws.getColumn(i + 1).alignment = { horizontal: "right" };
    }
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
