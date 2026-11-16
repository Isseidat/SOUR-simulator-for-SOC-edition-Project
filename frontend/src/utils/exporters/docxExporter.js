import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  convertMillimetersToTwip,
} from "docx";
import {
  formatDateTime,
  formatAdminDateHeader,
  formatReportNumber,
  formatSeverityVN,
  formatStatusVN,
  formatScenarioVN,
  formatLogStatusVN,
  calculateMttr,
  getForensicDetails,
} from "../formatters";
import { EXPORT_FORMAT, SCOPE } from "../../constants";
import { recordReportExportAudit, buildRecommendationLines } from "./shared";

// Helpers tạo bảng & đoạn văn chuẩn Nghị định 30/2020/NĐ-CP cho DOCX
const BLACK_BORDER = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const ALL_BLACK_BORDERS = {
  top: BLACK_BORDER,
  bottom: BLACK_BORDER,
  left: BLACK_BORDER,
  right: BLACK_BORDER,
};
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const makeDocxText = (text, opts = {}) =>
  new TextRun({
    text: String(text ?? ""),
    font: opts.font || "Times New Roman",
    size: opts.size ?? 24,
    bold: Boolean(opts.bold),
    italics: Boolean(opts.italics),
    color: opts.color || "000000",
  });

const makeDocxCell = (text, opts = {}) =>
  new TableCell({
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: opts.colSpan,
    verticalAlign: opts.verticalAlign || VerticalAlign.CENTER,
    borders: opts.noBorder ? NO_BORDERS : ALL_BLACK_BORDERS,
    shading: opts.shaded
      ? { type: ShadingType.SOLID, color: "F3F4F6", fill: "F3F4F6" }
      : undefined,
    margins: {
      top: 90,
      bottom: 90,
      left: 120,
      right: 120,
    },
    children: Array.isArray(text)
      ? text
      : [
          new Paragraph({
            alignment: opts.align || AlignmentType.LEFT,
            spacing: { before: 20, after: 20 },
            children: [
              makeDocxText(text, {
                bold: opts.bold,
                italics: opts.italics,
                size: opts.size ?? 22,
                font: opts.font,
              }),
            ],
          }),
        ],
  });

/**
 * 2. XUẤT FILE MICROSOFT WORD (.DOCX) CHUẨN VĂN BẢN HÀNH CHÍNH (NGHỊ ĐỊNH 30/2020/NĐ-CP)
 */
export const exportToDocx = async (alert, logs = [], currentUser = null) => {
  if (!alert) return;

  const { mttrText } = calculateMttr(alert, logs);
  const forensic = getForensicDetails(alert);
  const reportNo = formatReportNumber(alert);
  const adminDate = formatAdminDateHeader(new Date());
  const detectedAt = formatDateTime(alert.timestamp, "HH:mm:ss 'ngày' dd/MM/yyyy");
  const recommendations = buildRecommendationLines(alert, logs, mttrText);
  const analystName =
    currentUser?.name || currentUser?.username || currentUser?.email || "Chuyên viên Vận hành SOC";
  const approverTitle =
    currentUser?.role === "Admin" ? "Quản trị viên Hệ thống SOC" : "Trưởng phòng Điều hành SOC";

  const rawPayloadStr =
    typeof alert.payload === "string"
      ? alert.payload
      : JSON.stringify(alert.payload || {}, null, 2);

  // Header 2 cột không viền
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          makeDocxCell(
            [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText("TRUNG TÂM AN TOÀN THÔNG TIN", { size: 22 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  makeDocxText("PHÒNG ĐIỀU HÀNH AN NINH MẠNG (SOC)", {
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText("──────────", { size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [makeDocxText(reportNo, { size: 24 })],
              }),
            ],
            { widthPct: 44, noBorder: true }
          ),
          makeDocxCell(
            [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  makeDocxText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", {
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  makeDocxText("Độc lập - Tự do - Hạnh phúc", {
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText("───────────────", { size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [makeDocxText(adminDate, { size: 24, italics: true })],
              }),
            ],
            { widthPct: 56, noBorder: true }
          ),
        ],
      }),
    ],
  });

  // Bảng Mục I: Thông tin chung
  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeDocxCell("Mã định danh sự cố", { widthPct: 23, shaded: true, bold: true }),
          makeDocxCell(alert.alert_id || "N/A", { widthPct: 27, bold: true }),
          makeDocxCell("Thời điểm phát hiện", { widthPct: 23, shaded: true, bold: true }),
          makeDocxCell(detectedAt, { widthPct: 27 }),
        ],
      }),
      new TableRow({
        children: [
          makeDocxCell("Loại hình sự cố", { shaded: true, bold: true }),
          makeDocxCell(formatScenarioVN(alert.type)),
          makeDocxCell("Mức độ nghiêm trọng", { shaded: true, bold: true }),
          makeDocxCell(formatSeverityVN(alert.severity), { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          makeDocxCell("Trạng thái hiện tại", { shaded: true, bold: true }),
          makeDocxCell(formatStatusVN(alert.status)),
          makeDocxCell("Thời gian xử lý (MTTR)", { shaded: true, bold: true }),
          makeDocxCell(mttrText),
        ],
      }),
      new TableRow({
        children: [
          makeDocxCell("Địa chỉ IP nguồn", { shaded: true, bold: true }),
          makeDocxCell(alert.source_ip || "Chưa xác định"),
          makeDocxCell("Hệ thống đích", { shaded: true, bold: true }),
          makeDocxCell(alert.destination_ip || "Chưa xác định"),
        ],
      }),
      new TableRow({
        children: [
          makeDocxCell("Tài khoản / Email liên quan", { shaded: true, bold: true }),
          makeDocxCell(alert.victim_email || "Không xác định"),
          makeDocxCell("Cơ chế ứng phó", { shaded: true, bold: true }),
          makeDocxCell("Tự động hóa SOAR (n8n Playbook)"),
        ],
      }),
    ],
  });

  // Bảng Mục II: Dấu vết kỹ thuật (IOCs)
  const iocRows = [
    new TableRow({
      tableHeader: true,
      children: [
        makeDocxCell("TT", { widthPct: 8, shaded: true, bold: true, align: AlignmentType.CENTER }),
        makeDocxCell("Chỉ tiêu / Thông số kỹ thuật", { widthPct: 36, shaded: true, bold: true }),
        makeDocxCell("Giá trị ghi nhận", { widthPct: 56, shaded: true, bold: true }),
      ],
    }),
    ...(forensic?.items?.length > 0
      ? forensic.items.map(
          (item, idx) =>
            new TableRow({
              children: [
                makeDocxCell(String(idx + 1), { align: AlignmentType.CENTER }),
                makeDocxCell(item.label, { bold: true }),
                makeDocxCell(item.value),
              ],
            })
        )
      : [
          new TableRow({
            children: [
              makeDocxCell("Không ghi nhận dấu vết kỹ thuật bổ sung trong bản ghi gốc.", {
                colSpan: 3,
                italics: true,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
        ]),
  ];

  const iocTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: iocRows,
  });

  // Hộp Raw Payload
  const rawPayloadBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: ALL_BLACK_BORDERS,
            shading: { type: ShadingType.SOLID, color: "F9FAFB", fill: "F9FAFB" },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: rawPayloadStr.split("\n").map(
              (line) =>
                new Paragraph({
                  spacing: { before: 10, after: 10 },
                  children: [makeDocxText(line || " ", { font: "Courier New", size: 19 })],
                })
            ),
          }),
        ],
      }),
    ],
  });

  // Bảng Mục III: Quá trình xử lý 5 cột
  const timelineRows = [
    new TableRow({
      tableHeader: true,
      children: [
        makeDocxCell("TT", { widthPct: 7, shaded: true, bold: true, align: AlignmentType.CENTER }),
        makeDocxCell("Thời điểm", { widthPct: 18, shaded: true, bold: true }),
        makeDocxCell("Bước xử lý / Tác vụ", { widthPct: 23, shaded: true, bold: true }),
        makeDocxCell("Đơn vị thực hiện", { widthPct: 17, shaded: true, bold: true }),
        makeDocxCell("Kết quả & Nội dung xử lý", { widthPct: 35, shaded: true, bold: true }),
      ],
    }),
    ...(logs.length > 0
      ? logs.map(
          (lg, idx) =>
            new TableRow({
              children: [
                makeDocxCell(String(idx + 1), { align: AlignmentType.CENTER }),
                makeDocxCell(formatDateTime(lg.timestamp || lg.createdAt, "HH:mm:ss dd/MM/yyyy")),
                makeDocxCell(lg.step_name || "Xử lý tự động", { bold: true }),
                makeDocxCell(lg.executed_by || "Hệ thống SOAR"),
                makeDocxCell(
                  `[${formatLogStatusVN(lg.status)}] ${lg.message || lg.output || "Đã hoàn thành bước xử lý."}`
                ),
              ],
            })
        )
      : [
          new TableRow({
            children: [
              makeDocxCell("Chưa ghi nhận bước thực thi tự động nào trong nhật ký hệ thống.", {
                colSpan: 5,
                italics: true,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
        ]),
  ];

  const timelineTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: timelineRows,
  });

  // Bảng Nơi nhận & Chữ ký 
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          makeDocxCell(
            [
              new Paragraph({
                children: [makeDocxText("Nơi nhận:", { size: 22, bold: true, italics: true })],
              }),
              new Paragraph({
                children: [makeDocxText("- Như trên;", { size: 21 })],
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [makeDocxText("- Lưu: VT, Phòng SOC.", { size: 21 })],
              }),
            ],
            { widthPct: 50, noBorder: true, verticalAlign: VerticalAlign.TOP }
          ),
          makeDocxCell([new Paragraph({ children: [] })], {
            widthPct: 50,
            noBorder: true,
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
      new TableRow({
        children: [
          makeDocxCell(
            [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText("TRƯỞNG ĐƠN VỊ PHÊ DUYỆT", { size: 23, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1680 },
                children: [makeDocxText("(Ký, ghi rõ họ tên và đóng dấu)", { size: 21, italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText(approverTitle, { size: 23, bold: true })],
              }),
            ],
            { widthPct: 50, noBorder: true, verticalAlign: VerticalAlign.TOP }
          ),
          makeDocxCell(
            [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText("CÁN BỘ LẬP BÁO CÁO", { size: 23, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1680 },
                children: [makeDocxText("(Ký, ghi rõ họ tên)", { size: 21, italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [makeDocxText(analystName, { size: 23, bold: true })],
              }),
            ],
            { widthPct: 50, noBorder: true, verticalAlign: VerticalAlign.TOP }
          ),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 26, color: "000000" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 40 },
            children: [makeDocxText("BÁO CÁO", { size: 30, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              makeDocxText("Về việc xác minh, điều tra và xử lý sự cố an toàn thông tin mạng", {
                size: 26,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              makeDocxText(`(Mã hồ sơ theo dõi: ${alert.alert_id || "N/A"})`, {
                size: 23,
                italics: true,
              }),
            ],
          }),

          // Kính gửi
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              makeDocxText("Kính gửi: ", { size: 24, bold: true }),
              makeDocxText("- Ban Giám đốc Trung tâm An toàn thông tin;", { size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { left: convertMillimetersToTwip(22) },
            spacing: { after: 40 },
            children: [makeDocxText("- Trưởng phòng Điều hành An ninh mạng (SOC);", { size: 24 })],
          }),
          new Paragraph({
            indent: { left: convertMillimetersToTwip(22) },
            spacing: { after: 140 },
            children: [makeDocxText("- Bộ phận Quản trị Hệ thống và Hạ tầng mạng.", { size: 24 })],
          }),

          // Căn cứ
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: convertMillimetersToTwip(10) },
            spacing: { after: 80 },
            children: [
              makeDocxText(
                "Căn cứ Quy chế đảm bảo an toàn thông tin mạng và Quy trình ứng cứu sự cố an toàn thông tin hiện hành;",
                { size: 24, italics: true }
              ),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: convertMillimetersToTwip(10) },
            spacing: { after: 180 },
            children: [
              makeDocxText(
                "Căn cứ dữ liệu giám sát thu nhận từ Hệ thống Giám sát và Phản ứng Tự động (SOAR), Phòng Điều hành An ninh mạng (SOC) báo cáo kết quả xác minh, xử lý sự cố an toàn thông tin mạng với các nội dung cụ thể như sau:",
                { size: 24 }
              ),
            ],
          }),

          // Mục I
          new Paragraph({
            spacing: { before: 140, after: 100 },
            children: [makeDocxText("I. THÔNG TIN CHUNG VỀ SỰ CỐ", { size: 26, bold: true })],
          }),
          summaryTable,

          // Mục II
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              makeDocxText("II. KẾT QUẢ XÁC MINH KỸ THUẬT VÀ DẤU VẾT GHI NHẬN", {
                size: 26,
                bold: true,
              }),
            ],
          }),
          iocTable,
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              makeDocxText("Trích xuất dữ liệu thô (Raw Payload):", { size: 23, bold: true }),
            ],
          }),
          rawPayloadBox,

          // Mục III
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              makeDocxText("III. QUÁ TRÌNH XỬ LÝ VÀ ỨNG CỨU SỰ CỐ", {
                size: 26,
                bold: true,
              }),
            ],
          }),
          timelineTable,

          // Mục IV
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              makeDocxText("IV. ĐÁNH GIÁ MỨC ĐỘ ẢNH HƯỞNG VÀ KIẾN NGHỊ KHẮC PHỤC", {
                size: 26,
                bold: true,
              }),
            ],
          }),
          ...recommendations.map(
            (line) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: convertMillimetersToTwip(7) },
                spacing: { before: 40, after: 40 },
                children: [makeDocxText(`- ${line}`, { size: 24 })],
              })
          ),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              makeDocxText("Ý kiến bổ sung của cán bộ xử lý (nếu có):", {
                size: 24,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 100 },
            children: [
              makeDocxText(
                "..................................................................................................................................................",
                { size: 24 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 100 },
            children: [
              makeDocxText(
                "..................................................................................................................................................",
                { size: 24 }
              ),
            ],
          }),

          new Paragraph({
            spacing: { before: 60, after: 220 },
            children: [
              makeDocxText(
                "..................................................................................................................................................",
                { size: 24 }
              ),
            ],
          }),

          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileName = `Bao_cao_su_co_${alert.alert_id || "SOC"}.docx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  recordReportExportAudit({
    format: EXPORT_FORMAT.DOCX,
    scope: SCOPE.SINGLE,
    alert_id: alert.alert_id || null,
    file_name: fileName,
  });
};
