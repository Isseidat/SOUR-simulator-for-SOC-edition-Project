import html2pdf from "html2pdf.js";
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
import {
  recordReportExportAudit,
  escapeHtml,
  buildRecommendationLines,
} from "./shared";

/**
 * Dựng HTML chuẩn Văn bản Hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)
 * Chỉ dùng màu Hex/RGB truyền thống để tương thích 100% với html2canvas (tránh lỗi oklch của Tailwind v4).
 */
export const buildAdministrativeReportHtml = (
  alert,
  logs = [],
  currentUser = null,
  options = {}
) => {
  if (!alert) return "";

  const { forPdf = false } = options;

  const { mttrText } = calculateMttr(alert, logs);
  const forensic = getForensicDetails(alert);
  const reportNo = formatReportNumber(alert);
  const adminDate = formatAdminDateHeader(new Date());
  const detectedAt = formatDateTime(alert.timestamp, "HH:mm:ss 'ngày' dd/MM/yyyy");
  const scenarioVN = formatScenarioVN(alert.type);
  const severityVN = formatSeverityVN(alert.severity);
  const statusVN = formatStatusVN(alert.status);
  const recommendations = buildRecommendationLines(alert, logs, mttrText);
  const analystName =
    currentUser?.name || currentUser?.username || currentUser?.email || "Chuyên viên Vận hành SOC";
  const approverTitle =
    currentUser?.role === "Admin" ? "Quản trị viên Hệ thống SOC" : "Trưởng phòng Điều hành SOC";

  const rawPayloadStr =
    typeof alert.payload === "string"
      ? alert.payload
      : JSON.stringify(alert.payload || {}, null, 2);

  const iocRowsHtml =
    forensic?.items?.length > 0
      ? forensic.items
          .map(
            (item, idx) => `
          <tr>
            <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; width: 42px;">${idx + 1}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; width: 34%;">${escapeHtml(item.label)}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; word-break: break-word;">${escapeHtml(item.value)}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="3" style="border: 1px solid #000000; padding: 8px; text-align: center; font-style: italic;">Không ghi nhận dấu vết kỹ thuật bổ sung trong bản ghi gốc.</td></tr>`;

  const timelineRowsHtml =
    logs.length > 0
      ? logs
          .map(
            (lg, idx) => `
          <tr>
            <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; width: 38px;">${idx + 1}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; width: 108px;">${escapeHtml(formatDateTime(lg.timestamp || lg.createdAt, "HH:mm:ss dd/MM/yyyy"))}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">${escapeHtml(lg.step_name || "Xử lý tự động")}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(lg.executed_by || "Hệ thống SOAR")}</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">
              <strong>[${escapeHtml(formatLogStatusVN(lg.status))}]</strong> ${escapeHtml(lg.message || lg.output || "Đã hoàn thành bước xử lý.")}
            </td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="border: 1px solid #000000; padding: 8px; text-align: center; font-style: italic;">Chưa ghi nhận bước thực thi tự động nào trong nhật ký hệ thống.</td></tr>`;

  const containerPadding = forPdf ? "0" : "20px 26px";

  return `
    <div style="font-family: 'Times New Roman', Times, serif; color: #000000; background-color: #ffffff; padding: ${containerPadding}; font-size: 13pt; line-height: 1.45; box-sizing: border-box;">
      <style data-pdf-safe="true">
        .admin-doc-root {
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 13pt !important;
          line-height: 1.45 !important;
          color: #000000 !important;
        }
        .admin-doc-root, .admin-doc-root * {
          box-sizing: border-box !important;
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
        }
        .admin-doc-root pre {
          font-family: 'Courier New', Courier, monospace !important;
          line-height: 1.4 !important;
        }
        .admin-doc-root table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-doc-root p {
          margin: 4px 0;
        }
        .admin-doc-root .pdf-avoid-break {
          display: block !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      </style>
      <div class="admin-doc-root">
        <!-- PHẦN MỞ ĐẦU: CƠ QUAN BAN HÀNH & QUỐC HIỆU TIÊU NGỮ -->
        <table style="width: 100%; border: none; margin-bottom: 14px;">
          <tr>
            <td style="width: 44%; vertical-align: top; text-align: center; border: none; padding: 0 8px 0 0;">
              <div style="font-size: 11pt; text-transform: uppercase;">TRUNG TÂM AN TOÀN THÔNG TIN</div>
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">PHÒNG ĐIỀU HÀNH AN NINH MẠNG (SOC)</div>
              <div style="width: 110px; border-bottom: 1px solid #000000; margin: 4px auto 6px auto;"></div>
              <div style="font-size: 11.5pt;">${escapeHtml(reportNo)}</div>
            </td>
            <td style="width: 56%; vertical-align: top; text-align: center; border: none; padding: 0 0 0 8px;">
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-size: 11.5pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
              <div style="width: 155px; border-bottom: 1px solid #000000; margin: 4px auto 6px auto;"></div>
              <div style="font-size: 11.5pt; font-style: italic;">${escapeHtml(adminDate)}</div>
            </td>
          </tr>
        </table>

        <!-- TÊN VĂN BẢN & TRÍCH YẾU NỘI DUNG -->
        <div style="text-align: center; margin: 14px 0 14px 0;">
          <div style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px;">BÁO CÁO</div>
          <div style="font-size: 13pt; font-weight: bold; margin-top: 3px;">Về việc xác minh, điều tra và xử lý sự cố an toàn thông tin mạng</div>
          <div style="font-size: 11.5pt; font-style: italic; margin-top: 4px;">(Mã hồ sơ theo dõi: ${escapeHtml(alert.alert_id || "N/A")})</div>
        </div>

        <!-- KÍNH GỬI -->
        <table style="width: 100%; border: none; margin-bottom: 10px; font-size: 12pt;">
          <tr>
            <td style="width: 100px; vertical-align: top; border: none; padding: 2px 0; font-weight: bold; text-align: right; padding-right: 10px;">Kính gửi:</td>
            <td style="vertical-align: top; border: none; padding: 2px 0;">
              <div>- Ban Giám đốc Trung tâm An toàn thông tin;</div>
              <div>- Trưởng phòng Điều hành An ninh mạng (SOC);</div>
              <div>- Bộ phận Quản trị Hệ thống và Hạ tầng mạng.</div>
            </td>
          </tr>
        </table>

        <!-- CĂN CỨ -->
        <p style="text-align: justify; text-indent: 24px; font-size: 12pt; font-style: italic; margin-bottom: 6px;">
          Căn cứ Quy chế đảm bảo an toàn thông tin mạng và Quy trình ứng cứu sự cố an toàn thông tin hiện hành;
        </p>
        <p style="text-align: justify; text-indent: 24px; font-size: 12pt; margin-bottom: 12px;">
          Căn cứ dữ liệu giám sát thu nhận từ Hệ thống Giám sát và Phản ứng Tự động (SOAR), Phòng Điều hành An ninh mạng (SOC) báo cáo kết quả xác minh, xử lý sự cố an toàn thông tin mạng với các nội dung cụ thể như sau:
        </p>

        <!-- MỤC I -->
        <div style="font-size: 12.5pt; font-weight: bold; margin: 12px 0 6px 0;">I. THÔNG TIN CHUNG VỀ SỰ CỐ</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5pt; margin-bottom: 12px;">
          <tr>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px; width: 23%;">Mã định danh sự cố</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; width: 27%; font-weight: bold;">${escapeHtml(alert.alert_id || "N/A")}</td>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px; width: 23%;">Thời điểm phát hiện</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; width: 27%;">${escapeHtml(detectedAt)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Loại hình sự cố</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(scenarioVN)}</td>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Mức độ nghiêm trọng</td>
            <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">${escapeHtml(severityVN)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Trạng thái hiện tại</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(statusVN)}</td>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Thời gian xử lý (MTTR)</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(mttrText)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Địa chỉ IP nguồn</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(alert.source_ip || "Chưa xác định")}</td>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Hệ thống đích</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(alert.destination_ip || "Chưa xác định")}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Tài khoản / Email liên quan</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">${escapeHtml(alert.victim_email || "Không xác định")}</td>
            <td style="border: 1px solid #000000; background-color: #f3f4f6; font-weight: bold; padding: 6px 8px;">Cơ chế ứng phó</td>
            <td style="border: 1px solid #000000; padding: 6px 8px;">Tự động hóa SOAR (n8n Playbook)</td>
          </tr>
        </table>

        <!-- MỤC II -->
        <div style="font-size: 12.5pt; font-weight: bold; margin: 12px 0 6px 0;">II. KẾT QUẢ XÁC MINH KỸ THUẬT VÀ DẤU VẾT GHI NHẬN</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 8px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: center; width: 42px;">TT</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left; width: 34%;">Chỉ tiêu / Thông số kỹ thuật</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left;">Giá trị ghi nhận</th>
            </tr>
          </thead>
          <tbody>
            ${iocRowsHtml}
          </tbody>
        </table>
        <div style="font-size: 11pt; font-weight: bold; margin: 6px 0 4px 0;">Trích xuất dữ liệu thô (Raw Payload):</div>
        <pre style="border: 1px solid #000000; background-color: #f9fafb; padding: 8px 10px; font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; white-space: pre-wrap; word-break: break-word; margin: 0 0 12px 0;">${escapeHtml(rawPayloadStr)}</pre>

        <!-- MỤC III -->
        <div style="font-size: 12.5pt; font-weight: bold; margin: 12px 0 6px 0;">III. QUÁ TRÌNH XỬ LÝ VÀ ỨNG CỨU SỰ CỐ</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 12px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: center; width: 38px;">TT</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left; width: 120px;">Thời điểm</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left; width: 22%;">Bước xử lý / Tác vụ</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left; width: 18%;">Đơn vị thực hiện</th>
              <th style="border: 1px solid #000000; background-color: #f3f4f6; padding: 6px 8px; text-align: left;">Kết quả & Nội dung xử lý</th>
            </tr>
          </thead>
          <tbody>
            ${timelineRowsHtml}
          </tbody>
        </table>

        <!-- MỤC IV -->
        <div style="font-size: 12.5pt; font-weight: bold; margin: 12px 0 6px 0;">IV. ĐÁNH GIÁ MỨC ĐỘ ẢNH HƯỞNG VÀ KIẾN NGHỊ KHẮC PHỤC</div>
        <div style="font-size: 11.5pt; text-align: justify;">
          ${recommendations
            .map((line) => `<p style="margin: 4px 0; text-indent: 18px;">- ${escapeHtml(line)}</p>`)
            .join("")}
          <p style="margin: 8px 0 4px 0; font-weight: bold;">Ý kiến bổ sung của cán bộ xử lý (nếu có):</p>
          <p style="margin: 6px 0; color: #000000; white-space: nowrap; overflow: hidden;">..................................................................................................................................................</p>
          <p style="margin: 6px 0; color: #000000; white-space: nowrap; overflow: hidden;">..................................................................................................................................................</p>
          <p style="margin: 6px 0; color: #000000; white-space: nowrap; overflow: hidden;">..................................................................................................................................................</p>
        </div>

        <!-- NƠI NHẬN & CHỮ KÝ (2 hàng riêng để 2 khối chữ ký luôn ngang hàng, bọc div tránh cắt ngang trang) -->
        <div class="pdf-avoid-break" style="display: block; break-inside: avoid; page-break-inside: avoid; padding-top: 18px; padding-bottom: 14px;">
          <table style="width: 100%; border: none; margin: 0;">
            <tr>
              <td style="width: 50%; vertical-align: top; border: none; padding: 0 12px 14px 0;">
                <div style="font-size: 11pt; font-weight: bold; font-style: italic;">Nơi nhận:</div>
                <div style="font-size: 10.5pt;">- Như trên;</div>
                <div style="font-size: 10.5pt;">- Lưu: VT, Phòng SOC.</div>
              </td>
              <td style="width: 50%; vertical-align: top; border: none; padding: 0 0 14px 12px;"></td>
            </tr>
            <tr>
              <td style="width: 50%; vertical-align: top; text-align: center; border: none; padding-right: 12px;">
                <div style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">TRƯỞNG ĐƠN VỊ PHÊ DUYỆT</div>
                <div style="font-size: 10.5pt; font-style: italic;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                <div style="height: 110px;"></div>
                <div style="font-size: 11.5pt; font-weight: bold;">${escapeHtml(approverTitle)}</div>
              </td>
              <td style="width: 50%; vertical-align: top; text-align: center; border: none; padding-left: 12px;">
                <div style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">CÁN BỘ LẬP BÁO CÁO</div>
                <div style="font-size: 10.5pt; font-style: italic;">(Ký, ghi rõ họ tên)</div>
                <div style="height: 110px;"></div>
                <div style="font-size: 11.5pt; font-weight: bold;">${escapeHtml(analystName)}</div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;
};

const openPrintFallback = (htmlContent, title = "Báo cáo sự cố an toàn thông tin") => {
  const printWin = window.open("", "_blank", "width=900,height=1000");
  if (!printWin) {
    alert("Trình duyệt đang chặn cửa sổ bật lên (Popup). Vui lòng cho phép mở Popup để xuất/in PDF.");
    return;
  }
  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { margin: 0; padding: 0; background: #ffffff; color: #000000; }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 300);
};

/**
 * 1. XUẤT FILE PDF CHUẨN VĂN BẢN HÀNH CHÍNH
 * Dùng HTML độc lập không chứa Tailwind oklch(), cô lập CSS trong onclone để html2canvas render chính xác 100%.
 */
export const exportToPdf = async (alertOrElementId, logs = [], currentUser = null) => {
  const isElementIdMode = typeof alertOrElementId === "string";
  let alertObj = isElementIdMode ? null : alertOrElementId;
  let safeLogs = Array.isArray(logs) ? logs : [];

  if (isElementIdMode && typeof logs === "object" && logs !== null && !Array.isArray(logs)) {
    alertObj = logs;
    safeLogs = [];
  }

  const alertId = alertObj?.alert_id || (isElementIdMode ? String(logs || "SOC_INCIDENT") : "SOC_INCIDENT");
  const htmlMarkup = alertObj
    ? buildAdministrativeReportHtml(alertObj, safeLogs, currentUser, { forPdf: true })
    : document.getElementById(alertOrElementId)?.outerHTML || "";

  if (!htmlMarkup) {
    console.error("[exportToPdf] Không có dữ liệu hoặc vùng DOM để xuất PDF.");
    return;
  }

  const fileName = `Bao_cao_su_co_${alertId}.pdf`;

  try {
    const opt = {
      // Lề chuẩn Nghị định 30/2020/NĐ-CP giống bản Word: [top, left, bottom, right] (mm)
      margin: [20, 30, 20, 15],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Loại bỏ toàn bộ stylesheet chứa oklch() của Tailwind v4 trong bản clone để html2canvas không bị crash ngầm
          clonedDoc
            .querySelectorAll('style:not([data-pdf-safe="true"]), link[rel="stylesheet"]')
            .forEach((el) => el.remove());
          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.cssText = "background:#ffffff;color:#000000;";
          }
          if (clonedDoc.body) {
            clonedDoc.body.style.cssText = "background:#ffffff;color:#000000;margin:0;padding:0;";
          }
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-avoid-break"] },
    };

    const exporter = html2pdf?.default || html2pdf;
    // Truyền trực tiếp chuỗi HTML để html2pdf tự gắn vào .html2pdf__container ở tọa độ (0, 0),
    // tránh bị lệch khung chụp (-12000px) gây ra trang PDF trắng.
    await exporter().set(opt).from(htmlMarkup).save();
  } catch (err) {
    console.error("[exportToPdf] Lỗi render html2pdf, chuyển sang hộp thoại in A4:", err);
    openPrintFallback(htmlMarkup, `Bao_cao_su_co_${alertId}`);
  }

  recordReportExportAudit({
    format: EXPORT_FORMAT.PDF,
    scope: SCOPE.SINGLE,
    alert_id: alertId,
    file_name: fileName,
  });
};
