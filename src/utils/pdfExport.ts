import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DeliveryRequest, Warehouse, AdvancedDistributionPlan } from '../types';
import { productCatalog } from '../data/mockData';

const HEADER_FILL: [number, number, number] = [41, 128, 185];
const ALT_ROW_FILL: [number, number, number] = [240, 248, 255];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nowStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function getProductName(productNumber: string): string {
  return productCatalog[productNumber] ?? productNumber;
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    normal: 'Normal',
    elevated: 'Elevated',
    critical: 'Critical',
    urgent: 'Urgent',
  };
  return map[p] ?? p;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    rejected: 'Rejected',
  };
  return map[s] ?? s;
}

function zoneLabel(z: string): string {
  const map: Record<string, string> = {
    green: 'Green',
    yellow: 'Yellow',
    red: 'Red',
  };
  return map[z] ?? z;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Warehouse Logistics System | Generated: ${formatDateTime(new Date().toISOString())}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    );
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: 'right',
    });
  }
}

// ---------------------------------------------------------------------------
// 1. Single delivery manifest
// ---------------------------------------------------------------------------
export function exportDeliveryManifest(
  request: DeliveryRequest,
  warehouse: Warehouse | undefined,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DELIVERY MANIFEST', doc.internal.pageSize.getWidth() / 2, 20, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Document #: ${request.id}`, 14, 32);
  doc.text(`Date: ${formatDate(request.createdAt)}`, 14, 38);

  // Main table
  autoTable(doc, {
    startY: 46,
    head: [['Product', 'Qty', 'Delivery Address', 'Priority', 'Comment']],
    body: [
      [
        getProductName(request.productNumber),
        String(request.quantity),
        request.address,
        priorityLabel(request.priority),
        request.comment ?? '-',
      ],
    ],
    headStyles: { fillColor: HEADER_FILL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW_FILL },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 80 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
  });

  // Warehouse info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? 80;
  const warehouseY = finalY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Warehouse Information', 14, warehouseY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (warehouse) {
    doc.text(`Name: ${warehouse.name}`, 14, warehouseY + 8);
    doc.text(`Address: ${warehouse.address}`, 14, warehouseY + 14);
  } else {
    doc.text('Warehouse: not assigned', 14, warehouseY + 8);
  }

  addFooter(doc);
  doc.save(`nakladna-${request.id}.pdf`);
}

// ---------------------------------------------------------------------------
// 2. Distribution plan report
// ---------------------------------------------------------------------------
export function exportDistributionReport(
  plans: AdvancedDistributionPlan[],
  warehouses: Warehouse[],
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DISTRIBUTION REPORT', doc.internal.pageSize.getWidth() / 2, 20, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Date: ${nowStamp()}`, 14, 30);

  // Summary stats
  const totalRequests = plans.length;
  const splitCount = plans.filter((p) => p.isSplit).length;
  const totalSavings = plans.reduce((sum, p) => sum + p.savings, 0);

  doc.setFontSize(10);
  doc.text(`Total requests: ${totalRequests}`, 14, 38);
  doc.text(`Split deliveries: ${splitCount}`, 80, 38);
  doc.text(`Total savings: ${totalSavings.toFixed(1)}`, 160, 38);

  // Build table rows — for split deliveries, expand each source into its own row
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));
  const body: (string | number)[][] = [];

  for (const plan of plans) {
    const productName = getProductName(plan.productNumber);
    if (plan.sources.length <= 1) {
      const src = plan.sources[0];
      body.push([
        plan.requestId,
        productName,
        plan.totalQuantity,
        src ? (warehouseMap.get(src.warehouseId) ?? src.warehouseName) : '-',
        src ? zoneLabel(src.zone) : '-',
        src ? src.distance.toFixed(1) : '-',
        plan.totalScore.toFixed(2),
      ]);
    } else {
      // First row with request-level info
      const firstSrc = plan.sources[0];
      body.push([
        plan.requestId,
        productName,
        firstSrc.quantity,
        warehouseMap.get(firstSrc.warehouseId) ?? firstSrc.warehouseName,
        zoneLabel(firstSrc.zone),
        firstSrc.distance.toFixed(1),
        plan.totalScore.toFixed(2),
      ]);
      // Additional source rows
      for (let i = 1; i < plan.sources.length; i++) {
        const src = plan.sources[i];
        body.push([
          '',
          '(split)',
          src.quantity,
          warehouseMap.get(src.warehouseId) ?? src.warehouseName,
          zoneLabel(src.zone),
          src.distance.toFixed(1),
          '',
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: 44,
    head: [['Request ID', 'Product', 'Qty', 'Warehouse(s)', 'Zone', 'Distance (km)', 'Score']],
    body,
    headStyles: { fillColor: HEADER_FILL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW_FILL },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 60 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
  });

  addFooter(doc);
  doc.save(`rozpodil-${nowStamp()}.pdf`);
}

// ---------------------------------------------------------------------------
// 3. Full requests list report
// ---------------------------------------------------------------------------
export function exportRequestsReport(
  requests: DeliveryRequest[],
  warehouses: Warehouse[],
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DELIVERY REQUESTS REGISTER', doc.internal.pageSize.getWidth() / 2, 20, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  // Date range
  const dates = requests.map((r) => new Date(r.createdAt).getTime());
  const minDate = dates.length ? formatDate(new Date(Math.min(...dates)).toISOString()) : '-';
  const maxDate = dates.length ? formatDate(new Date(Math.max(...dates)).toISOString()) : '-';
  doc.text(`Period: ${minDate} - ${maxDate}`, 14, 30);

  // Summary by status
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const r of requests) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
  }

  doc.setFontSize(10);
  let summaryX = 14;
  doc.text(`Total: ${requests.length}`, summaryX, 38);
  summaryX += 35;
  for (const [status, count] of Object.entries(byStatus)) {
    doc.text(`${statusLabel(status)}: ${count}`, summaryX, 38);
    summaryX += 35;
  }

  let priorityX = 14;
  for (const [priority, count] of Object.entries(byPriority)) {
    doc.text(`${priorityLabel(priority)}: ${count}`, priorityX, 44);
    priorityX += 35;
  }

  // Warehouse map
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const body = requests.map((r) => [
    r.id,
    getProductName(r.productNumber),
    String(r.quantity),
    r.address,
    priorityLabel(r.priority),
    statusLabel(r.status),
    r.assignedWarehouseId ? (warehouseMap.get(r.assignedWarehouseId) ?? r.assignedWarehouseId) : '-',
    formatDate(r.createdAt),
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['ID', 'Product', 'Qty', 'Address', 'Priority', 'Status', 'Warehouse', 'Date']],
    body,
    headStyles: { fillColor: HEADER_FILL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW_FILL },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 45 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 55 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 45 },
      7: { cellWidth: 25, halign: 'center' },
    },
  });

  addFooter(doc);
  doc.save(`zajavky-${nowStamp()}.pdf`);
}
