import XLSX from "xlsx-js-style";
import {
  formatDateTime,
  formatAdminDateHeader,
  formatReportNumber,
  formatSeverityVN,
  formatStatusVN,
  formatScenarioVN,
  formatLogStatusVN,
  calculateMttr,
  getCleanAlertTags,
  getForensicDetails,
} from "../formatters";
import { EXPORT_FORMAT, SCOPE } from "../../constants";
import { recordReportExportAudit } from "./shared";

// Theme đồng bộ 1-1 với DOCX & PDF (Times New Roman, đen trắng #000000, nền tiêu đề #F3F4F6)
const DOC_FONT = "Times New Roman";
const BLACK_HEX = "000000";
const SHADED_BG = "F3F4F6";
const THIN_SIDE = { style: "thin", color: { rgb: BLACK_HEX } };
const ALL_BLACK_BORDERS = {
  top: THIN_SIDE,
  bottom: THIN_SIDE,
  left: THIN_SIDE,
  right: THIN_SIDE,
};

const makeStyle = ({
  sz = 11,
  bold = false,
  italic = false,
  align = "left",
  fill = null,
  bordered = false,
  wrapText = true,
} = {}) => ({
  font: { name: DOC_FONT, sz, bold, italic, color: { rgb: BLACK_HEX } },
  alignment: { horizontal: align, vertical: "center", wrapText },
  ...(fill ? { fill: { fgColor: { rgb: fill } } } : {}),
  ...(bordered ? { border: ALL_BLACK_BORDERS } : {}),
});

const STYLES = {
  orgLeft: makeStyle({ sz: 11, bold: true, wrapText: false }),
  orgRight: makeStyle({ sz: 11.5, italic: true, align: "right", wrapText: false }),
  title: makeStyle({ sz: 15, bold: true, align: "center" }),
  subtitle: makeStyle({ sz: 11.5, italic: true, align: "center" }),
  sectionTitle: makeStyle({ sz: 12.5, bold: true, wrapText: false }),
  tableHeader: makeStyle({ sz: 11, bold: true, align: "center", fill: SHADED_BG, bordered: true }),
  labelCell: makeStyle({ sz: 11, bold: true, fill: SHADED_BG, bordered: true }),
  dataLeft: makeStyle({ sz: 11, fill: "FFFFFF", bordered: true }),
  dataLeftBold: makeStyle({ sz: 11, bold: true, fill: "FFFFFF", bordered: true }),
  dataCenter: makeStyle({ sz: 11, align: "center", fill: "FFFFFF", bordered: true }),
  totalLeft: makeStyle({ sz: 11, bold: true, fill: SHADED_BG, bordered: true }),
  totalCenter: makeStyle({ sz: 11, bold: true, align: "center", fill: SHADED_BG, bordered: true }),
  sigTitle: makeStyle({ sz: 11.5, bold: true, align: "center", wrapText: false }),
  sigNote: makeStyle({ sz: 10.5, italic: true, align: "center", wrapText: false }),
};

const makeCell = (value, style) => ({
  t: typeof value === "number" ? "n" : "s",
  v: value ?? "",
  s: style,
});

const estimateRowHeight = (values, widths, minHpt = 22) => {
  const maxLines = values.reduce((best, val, idx) => {
    const colW = Math.max(8, (widths[idx] || 18) - 2);
    const lines = String(val ?? "")
      .split("\n")
      .reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / colW)), 0);
    return Math.max(best, lines);
  }, 1);
  return Math.max(minHpt, maxLines * 15 + 8);
};

// Builder dựng Worksheet theo từng dòng, tự quản lý merges và chiều cao dòng (không gán index cứng)
const createSheetBuilder = (colWidths) => {
  const aoa = [];
  const merges = [];
  const rowsMeta = [];
  const totalCols = colWidths.length;

  const pushRow = (cells, hpt = 22) => {
    const r = aoa.length;
    const padded = Array.from({ length: totalCols }, (_, c) => cells[c] ?? makeCell("", undefined));
    aoa.push(padded);
    rowsMeta.push({ hpt });
    return r;
  };

  const addBlank = (hpt = 12) => pushRow([], hpt);

  const addFullMerged = (text, style, hpt = 26) => {
    const r = pushRow(
      Array.from({ length: totalCols }, (_, c) => makeCell(c === 0 ? text : "", style)),
      hpt
    );
    if (totalCols > 1) merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
    return r;
  };

  const addSplitHeader = (leftText, rightText, splitCol) => {
    const r = pushRow(
      Array.from({ length: totalCols }, (_, c) => {
        if (c === 0) return makeCell(leftText, STYLES.orgLeft);
        if (c === splitCol) return makeCell(rightText, STYLES.orgRight);
        return makeCell("", c < splitCol ? STYLES.orgLeft : STYLES.orgRight);
      }),
      22
    );
    if (splitCol > 1) merges.push({ s: { r, c: 0 }, e: { r, c: splitCol - 1 } });
    if (totalCols - 1 > splitCol) merges.push({ s: { r, c: splitCol }, e: { r, c: totalCols - 1 } });
    return r;
  };

  const addSignatures = (leftStart, leftEnd, rightStart, rightEnd) => {
    const pushSig = (leftText, rightText, style, hpt) => {
      const r = pushRow(
        Array.from({ length: totalCols }, (_, c) => {
          if (c === leftStart) return makeCell(leftText, style);
          if (c === rightStart) return makeCell(rightText, style);
          return makeCell("", style);
        }),
        hpt
      );
      merges.push(
        { s: { r, c: leftStart }, e: { r, c: leftEnd } },
        { s: { r, c: rightStart }, e: { r, c: rightEnd } }
      );
    };
    addBlank(14);
    pushSig("NGƯỜI LẬP BIỂU", "TRƯỞNG BỘ PHẬN XÁC NHẬN", STYLES.sigTitle, 20);
    pushSig("(Ký, ghi rõ họ tên)", "(Ký, ghi rõ họ tên và đóng dấu)", STYLES.sigNote, 18);
  };

  // Bảng dọc 3 cột logic (STT | Chỉ tiêu | Giá trị gộp từ cột 2..cuối) dùng cho xuất lẻ
  const addKeyValueTable = (sectionTitle, labelHeader, kvRows, { boldFirstValue = false } = {}) => {
    addFullMerged(sectionTitle, STYLES.sectionTitle, 24);
    const valWidth = colWidths.slice(2).reduce((a, b) => a + b, 0);

    const hdrRow = pushRow(
      Array.from({ length: totalCols }, (_, c) => {
        if (c === 0) return makeCell("STT", STYLES.tableHeader);
        if (c === 1) return makeCell(labelHeader, STYLES.tableHeader);
        return makeCell(c === 2 ? "Giá trị ghi nhận" : "", STYLES.tableHeader);
      }),
      24
    );
    if (totalCols > 3) merges.push({ s: { r: hdrRow, c: 2 }, e: { r: hdrRow, c: totalCols - 1 } });

    kvRows.forEach(([label, val], idx) => {
      const valStyle = idx === 0 && boldFirstValue ? STYLES.dataLeftBold : STYLES.dataLeft;
      const r = pushRow(
        Array.from({ length: totalCols }, (_, c) => {
          if (c === 0) return makeCell(idx + 1, STYLES.dataCenter);
          if (c === 1) return makeCell(label, STYLES.labelCell);
          return makeCell(c === 2 ? val : "", valStyle);
        }),
        estimateRowHeight([label, val], [colWidths[1], valWidth], 22)
      );
      if (totalCols > 3) merges.push({ s: { r, c: 2 }, e: { r, c: totalCols - 1 } });
    });
  };

  // Bảng dữ liệu chuẩn (trả về số thứ tự dòng header để gắn autoFilter nếu cần)
  const addDataTable = (headers, dataRows, centerCols = []) => {
    const headerIdx = pushRow(
      headers.map((h) => makeCell(h, STYLES.tableHeader)),
      28
    );
    dataRows.forEach((row) => {
      pushRow(
        row.map((val, c) => makeCell(val, centerCols.includes(c) ? STYLES.dataCenter : STYLES.dataLeft)),
        estimateRowHeight(row, colWidths, 22)
      );
    });
    return { headerIdx, lastRowIdx: aoa.length - 1 };
  };

  const toWorksheet = (autoFilterRange = null) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (merges.length > 0) ws["!merges"] = merges;
    ws["!cols"] = colWidths.map((wch) => ({ wch }));
    ws["!rows"] = rowsMeta;
    if (autoFilterRange) ws["!autofilter"] = { ref: autoFilterRange };
    return ws;
  };

  return {
    pushRow,
    addBlank,
    addFullMerged,
    addSplitHeader,
    addSignatures,
    addKeyValueTable,
    addDataTable,
    toWorksheet,
  };
};

// ==========================================
// 1. XUẤT LẺ 1 SỰ CỐ (ĐỔ DỌC TRÊN 1 SHEET)
// ==========================================
const buildSingleIncidentSheet = (alertItem, alertLogs, reportNumber, dateHeader) => {
  const { mttrText } = calculateMttr(alertItem, alertLogs);
  const tags = getCleanAlertTags(alertItem);
  const forensic = getForensicDetails(alertItem);

  const sheet = createSheetBuilder([6, 30, 26, 22, 16, 48]);
  sheet.addSplitHeader("TRUNG TÂM AN TOÀN THÔNG TIN - PHÒNG SOC", `${reportNumber}  |  ${dateHeader}`, 3);
  sheet.addFullMerged("HỒ SƠ CHI TIẾT SỰ CỐ AN TOÀN THÔNG TIN", STYLES.title, 28);
  sheet.addBlank(10);

  sheet.addKeyValueTable(
    "I. THÔNG TIN CHUNG VỀ SỰ CỐ",
    "Thông số / Chỉ tiêu",
    [
      ["Mã hồ sơ sự cố", alertItem.alert_id || alertItem._id || "N/A"],
      ["Thời điểm phát hiện", formatDateTime(alertItem.timestamp, "dd/MM/yyyy HH:mm:ss")],
      ["Cập nhật lần cuối", formatDateTime(alertItem.updatedAt || alertItem.timestamp, "dd/MM/yyyy HH:mm:ss")],
      ["Loại hình sự cố", formatScenarioVN(alertItem.type)],
      ["Mức độ nghiêm trọng", formatSeverityVN(alertItem.severity)],
      ["Trạng thái xử lý", formatStatusVN(alertItem.status)],
      ["Thời gian xử lý (MTTR)", mttrText],
      ["Địa chỉ IP nguồn", alertItem.source_ip || "Chưa xác định"],
      ["Hệ thống đích", alertItem.destination_ip || "Chưa xác định"],
      ["Tài khoản / Email liên quan", alertItem.victim_email || "Không xác định"],
      ["Thẻ SOAR (Tags)", tags.length > 0 ? tags.join(", ") : "Không có"],
    ],
    { boldFirstValue: true }
  );

  sheet.addBlank(12);
  sheet.addKeyValueTable(
    "II. DẤU VẾT KỸ THUẬT & IOC GHI NHẬN",
    "Chỉ tiêu kỹ thuật",
    forensic?.items?.length > 0
      ? forensic.items.map((it) => [it.label, it.value])
      : [["Ghi chú kỹ thuật", "Không ghi nhận dấu vết bổ sung trong bản ghi gốc."]]
  );

  sheet.addBlank(12);
  sheet.addFullMerged("III. NHẬT KÝ QUÁ TRÌNH ỨNG CỨU SỰ CỐ (SOAR)", STYLES.sectionTitle, 24);
  sheet.addDataTable(
    ["STT", "Thời điểm ghi nhận", "Bước xử lý / Tác vụ", "Đơn vị thực hiện", "Trạng thái", "Nội dung chi tiết"],
    alertLogs.length > 0
      ? alertLogs.map((l, idx) => [
          idx + 1,
          formatDateTime(l.timestamp || l.createdAt, "dd/MM/yyyy HH:mm:ss"),
          l.step_name || "Xử lý tự động",
          l.executed_by || "Hệ thống SOAR",
          formatLogStatusVN(l.status),
          l.message || l.output || "Đã hoàn thành",
        ])
      : [["—", "—", "Chưa có nhật ký", "—", "—", "Chưa ghi nhận bước thực thi tự động nào."]],
    [0, 1, 4]
  );

  sheet.addSignatures(0, 2, 3, 5);
  return sheet.toWorksheet();
};

// ==========================================
// 2. XUẤT DANH SÁCH NHIỀU SỰ CỐ (BẢNG NGANG + TỔNG HỢP + NHẬT KÝ)
// ==========================================
const buildBatchSheets = (wb, alertsList, logsList, logsByAlertId, reportNumber, dateHeader) => {
  const totalCount = alertsList.length;
  const countByStatus = (st) => alertsList.filter((a) => a.status === st).length;
  const resolvedCount = countByStatus("Resolved") + countByStatus("Closed - False Positive");
  const inProgressCount = countByStatus("In Progress");
  const newCount = countByStatus("New");
  const errorCount = countByStatus("Closed - Error");
  const highCritCount = alertsList.filter((a) => a.severity === "Critical" || a.severity === "High").length;

  // Sheet 1: Danh sách sự cố
  const ws1 = createSheetBuilder([6, 38, 21, 21, 34, 22, 24, 18, 18, 18, 28, 22, 48]);
  ws1.addSplitHeader("TRUNG TÂM AN TOÀN THÔNG TIN - PHÒNG SOC", `${reportNumber}  |  ${dateHeader}`, 7);
  ws1.addFullMerged("BÁO CÁO THỐNG KÊ CHI TIẾT SỰ CỐ AN TOÀN THÔNG TIN MẠNG", STYLES.title, 28);
  ws1.addFullMerged(
    `Tổng hợp: ${totalCount} sự cố | Đã xử lý: ${resolvedCount} | Đang xử lý: ${inProgressCount} | Mới (New): ${newCount} | Lỗi: ${errorCount} | Nghiêm trọng/Cao: ${highCritCount}`,
    STYLES.subtitle,
    20
  );
  ws1.addBlank(10);

  const alertRows = alertsList.map((a, idx) => {
    const { mttrText } = calculateMttr(a, logsByAlertId.get(a.alert_id) || []);
    const tags = getCleanAlertTags(a);
    const forensic = getForensicDetails(a);
    const iocSummary =
      forensic?.items?.length > 0
        ? forensic.items
            .slice(0, 4)
            .map((it) => `${it.label}: ${it.value}`)
            .join(" | ")
        : "Không ghi nhận bổ sung";

    return [
      idx + 1,
      a.alert_id || a._id || "N/A",
      formatDateTime(a.timestamp, "dd/MM/yyyy HH:mm:ss"),
      formatDateTime(a.updatedAt || a.timestamp, "dd/MM/yyyy HH:mm:ss"),
      formatScenarioVN(a.type),
      formatSeverityVN(a.severity),
      formatStatusVN(a.status),
      mttrText,
      a.source_ip || "Chưa xác định",
      a.destination_ip || "Chưa xác định",
      a.victim_email || "Không xác định",
      tags.length > 0 ? tags.join(", ") : "—",
      iocSummary,
    ];
  });

  const { headerIdx, lastRowIdx } = ws1.addDataTable(
    [
      "STT",
      "Mã hồ sơ sự cố",
      "Thời điểm phát hiện",
      "Cập nhật cuối",
      "Loại hình sự cố",
      "Mức độ nghiêm trọng",
      "Trạng thái xử lý",
      "Thời gian xử lý (MTTR)",
      "Địa chỉ IP nguồn",
      "Hệ thống đích",
      "Tài khoản / Email liên quan",
      "Thẻ SOAR (Tags)",
      "Dấu vết / IOC ghi nhận",
    ],
    alertRows,
    [0, 2, 3, 7, 8, 9]
  );

  const totalCells = Array.from({ length: 13 }, () => makeCell("", STYLES.totalLeft));
  totalCells[0] = makeCell("TỔNG", STYLES.totalCenter);
  totalCells[1] = makeCell(`${totalCount} hồ sơ sự cố`, STYLES.totalLeft);
  totalCells[5] = makeCell(`Nghiêm trọng/Cao: ${highCritCount}`, STYLES.totalLeft);
  totalCells[6] = makeCell(`Đã xử lý: ${resolvedCount} | Đang chạy: ${inProgressCount}`, STYLES.totalLeft);
  ws1.pushRow(totalCells, 24);
  ws1.addSignatures(0, 4, 8, 12);

  XLSX.utils.book_append_sheet(wb, ws1.toWorksheet(`A${headerIdx + 1}:M${lastRowIdx + 1}`), "BC_Thong_Ke_Su_Co");

  // Sheet 2: Tổng hợp phân bố theo Mức độ & Trạng thái
  const ws2 = createSheetBuilder([40, 16, 16]);
  ws2.addFullMerged("BÁO CÁO TỔNG HỢP PHÂN BỐ SỰ CỐ AN TOÀN THÔNG TIN", STYLES.title, 28);
  ws2.addFullMerged(`Ngày xuất: ${dateHeader}`, STYLES.subtitle, 20);

  const buildBuckets = (items, getter, formatter) =>
    items.map((key) => {
      const count = alertsList.filter((a) => getter(a) === key).length;
      const pct = totalCount > 0 ? `${((count / totalCount) * 100).toFixed(1)}%` : "0%";
      return [formatter(key), count, pct];
    });

  const addSummaryGroup = (label, rows) => {
    ws2.addBlank(12);
    ws2.addDataTable([label, "Số lượng", "Tỷ lệ"], rows, [1, 2]);
    ws2.pushRow(
      [
        makeCell("Tổng cộng", STYLES.totalLeft),
        makeCell(totalCount, STYLES.totalCenter),
        makeCell("100.0%", STYLES.totalCenter),
      ],
      22
    );
  };

  addSummaryGroup(
    "1. PHÂN BỐ THEO MỨC ĐỘ NGHIÊM TRỌNG",
    buildBuckets(["Critical", "High", "Medium", "Low"], (a) => a.severity, formatSeverityVN)
  );
  addSummaryGroup(
    "2. PHÂN BỐ THEO TRẠNG THÁI XỬ LÝ",
    buildBuckets(
      ["New", "In Progress", "Resolved", "Closed - False Positive", "Closed - Error"],
      (a) => a.status,
      formatStatusVN
    )
  );

  XLSX.utils.book_append_sheet(wb, ws2.toWorksheet(), "Tong_Hop_Thong_Ke");

  // Sheet 3: Nhật ký ứng cứu chi tiết (nếu có)
  if (logsList && logsList.length > 0) {
    const ws3 = createSheetBuilder([6, 38, 22, 28, 22, 16, 56]);
    ws3.addSplitHeader("TRUNG TÂM AN TOÀN THÔNG TIN - PHÒNG SOC", `Ngày xuất: ${dateHeader}`, 4);
    ws3.addFullMerged("NHẬT KÝ CHI TIẾT QUÁ TRÌNH ỨNG CỨU SỰ CỐ (SOAR AUDIT LOG)", STYLES.title, 28);
    ws3.addBlank(10);

    const logTable = ws3.addDataTable(
      ["STT", "Mã sự cố", "Thời điểm ghi nhận", "Bước xử lý / Tác vụ", "Đơn vị thực hiện", "Trạng thái", "Nội dung chi tiết"],
      logsList.map((l, idx) => [
        idx + 1,
        l.alert_id || "N/A",
        formatDateTime(l.timestamp || l.createdAt, "dd/MM/yyyy HH:mm:ss"),
        l.step_name || "Xử lý tự động",
        l.executed_by || "Hệ thống SOAR",
        formatLogStatusVN(l.status),
        l.message || l.output || "Đã hoàn thành",
      ]),
      [0, 2, 5]
    );

    XLSX.utils.book_append_sheet(
      wb,
      ws3.toWorksheet(`A${logTable.headerIdx + 1}:G${logTable.lastRowIdx + 1}`),
      "Nhat_Ky_Ung_Cuu"
    );
  }
};

/**
 * 3. XUẤT FILE EXCEL (.XLSX)
 * - Xuất lẻ 1 sự cố: đổ dọc trên 1 sheet (Thông tin chung + IOC + Nhật ký ứng cứu).
 * - Xuất nhiều sự cố: bảng ngang 13 cột kèm AutoFilter + Sheet tổng hợp + Sheet nhật ký.
 */
export const exportToExcel = (
  alertsList = [],
  logsList = [],
  filename = "Bao_cao_thong_ke_su_co_ATTT",
  isBatch = false
) => {
  if (!alertsList || alertsList.length === 0) {
    alert("Không có dữ liệu sự cố để xuất file Excel!");
    return;
  }

  const dateHeader = formatAdminDateHeader(new Date());
  const nowStamp = formatDateTime(new Date(), "ddMMyyyy");
  const reportNumber =
    alertsList.length === 1 ? formatReportNumber(alertsList[0]) : `Số: TH-${nowStamp}/BC-SOC`;

  const logsByAlertId = new Map();
  (Array.isArray(logsList) ? logsList : []).forEach((lg) => {
    const key = lg?.alert_id;
    if (!key) return;
    if (!logsByAlertId.has(key)) logsByAlertId.set(key, []);
    logsByAlertId.get(key).push(lg);
  });

  const isSingle = alertsList.length === 1 && !isBatch;
  const wb = XLSX.utils.book_new();

  if (isSingle) {
    const alertItem = alertsList[0];
    const alertLogs = logsByAlertId.get(alertItem.alert_id) || logsList || [];
    XLSX.utils.book_append_sheet(
      wb,
      buildSingleIncidentSheet(alertItem, alertLogs, reportNumber, dateHeader),
      "Ho_So_Su_Co"
    );
  } else {
    buildBatchSheets(wb, alertsList, logsList, logsByAlertId, reportNumber, dateHeader);
  }

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);

  recordReportExportAudit({
    format: EXPORT_FORMAT.EXCEL,
    scope: isSingle ? SCOPE.SINGLE : SCOPE.BATCH,
    alert_id: isSingle ? alertsList[0]?.alert_id || null : null,
    file_name: cleanFilename,
  });
};
