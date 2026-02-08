// ESC/POS commands for thermal printers (as bytes)
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Command arrays
const INIT = [ESC, 0x40]; // Initialize printer
const CENTER = [ESC, 0x61, 0x01];
const LEFT = [ESC, 0x61, 0x00];
const RIGHT = [ESC, 0x61, 0x02];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const DOUBLE_HEIGHT = [ESC, 0x21, 0x10];
const DOUBLE_WIDTH = [ESC, 0x21, 0x20];
const DOUBLE_SIZE = [ESC, 0x21, 0x30];
const NORMAL_SIZE = [ESC, 0x21, 0x00];
const CUT = [GS, 0x56, 0x00];
const FEED_3 = [ESC, 0x64, 0x03];
const UNDERLINE_ON = [ESC, 0x2D, 0x01];
const UNDERLINE_OFF = [ESC, 0x2D, 0x00];

// 80mm printer has 48 characters per line (vs 32 for 58mm)
const PRINT_WIDTH_80MM = 48;
const PRINT_WIDTH_58MM = 32;

export interface StoreInfo {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface PrintOrderData {
  orderNumber: number | string;
  orderType: 'delivery' | 'table' | 'quick_sale';
  tableName?: string;
  waiterName?: string;
  customerName?: string;
  customerPhone?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    observation?: string;
  }>;
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  serviceFee?: number;
  total: number;
  paymentMethod?: string;
  changeFor?: number;
  createdAt: Date;
  storeInfo?: StoreInfo;
  qrCodeData?: string; // Data for QR code (e.g., order tracking URL)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function padRight(str: string, length: number): string {
  return str.substring(0, length).padEnd(length, ' ');
}

function padLeft(str: string, length: number): string {
  return str.substring(0, length).padStart(length, ' ');
}

function formatLine(left: string, right: string, width: number = PRINT_WIDTH_80MM): string {
  const rightLen = right.length;
  const leftLen = width - rightLen - 1;
  return padRight(left, leftLen) + ' ' + right;
}

function dashedLine(width: number = PRINT_WIDTH_80MM): string {
  return '-'.repeat(width);
}

function doubleLine(width: number = PRINT_WIDTH_80MM): string {
  return '='.repeat(width);
}

function centerText(text: string, width: number = PRINT_WIDTH_80MM): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

// Convert string to bytes using CP437/CP850 compatible encoding
function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const code = text.charCodeAt(i);
    
    // Map common Portuguese characters to CP850/CP437 codes
    const charMap: Record<string, number> = {
      'á': 0xA0, 'à': 0x85, 'â': 0x83, 'ã': 0xC6,
      'é': 0x82, 'è': 0x8A, 'ê': 0x88,
      'í': 0xA1, 'ì': 0x8D, 'î': 0x8C,
      'ó': 0xA2, 'ò': 0x95, 'ô': 0x93, 'õ': 0xC7,
      'ú': 0xA3, 'ù': 0x97, 'û': 0x96,
      'ç': 0x87, 'Ç': 0x80,
      'Á': 0xB5, 'À': 0xB7, 'Â': 0xB6, 'Ã': 0xC7,
      'É': 0x90, 'È': 0xD4, 'Ê': 0xD2,
      'Í': 0xD6, 'Ì': 0xDE, 'Î': 0xD7,
      'Ó': 0xE0, 'Ò': 0xE3, 'Ô': 0xE2, 'Õ': 0xE4,
      'Ú': 0xE9, 'Ù': 0xEB, 'Û': 0xEA,
      'ñ': 0xA4, 'Ñ': 0xA5,
      '°': 0xF8,
      '²': 0xFD,
      '³': 0xFC,
    };
    
    if (charMap[char]) {
      bytes.push(charMap[char]);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      // Fallback for unknown characters
      bytes.push(0x3F); // '?'
    }
  }
  return bytes;
}

function addLine(bytes: number[], text: string): void {
  bytes.push(...textToBytes(text), LF);
}

// Generate QR Code ESC/POS commands
function generateQRCodeBytes(data: string): number[] {
  const bytes: number[] = [];
  const dataBytes = textToBytes(data);
  
  // QR Code model select
  bytes.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  
  // QR Code size (1-16, 3 is a good size for 80mm)
  bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06);
  
  // QR Code error correction level (48 = L, 49 = M, 50 = Q, 51 = H)
  bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
  
  // Store QR Code data
  const pL = (dataBytes.length + 3) % 256;
  const pH = Math.floor((dataBytes.length + 3) / 256);
  bytes.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...dataBytes);
  
  // Print QR Code
  bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  
  return bytes;
}

// Get order type label in Portuguese
function getOrderTypeLabel(orderType: 'delivery' | 'table' | 'quick_sale'): string {
  switch (orderType) {
    case 'delivery': return 'DELIVERY';
    case 'table': return 'COMANDA';
    case 'quick_sale': return 'VENDA BALCÃO';
  }
}

// Get payment method label in Portuguese
function getPaymentLabel(method: string | undefined): string {
  if (!method) return '-';
  const labels: Record<string, string> = {
    money: 'Dinheiro',
    cash: 'Dinheiro',
    credit: 'Cartão Crédito',
    debit: 'Cartão Débito',
    pix: 'PIX',
    card: 'Cartão',
  };
  return labels[method.toLowerCase()] || method;
}

export function generateReceiptBytes(data: PrintOrderData, printerWidth: 48 | 32 = PRINT_WIDTH_80MM): Uint8Array {
  const width = printerWidth;
  const bytes: number[] = [];

  // Initialize printer
  bytes.push(...INIT);

  // Set code page to CP850 (Western European)
  bytes.push(ESC, 0x74, 0x02);

  // ===== HEADER WITH STORE INFO =====
  bytes.push(...CENTER);
  
  // Store name (large)
  if (data.storeInfo?.name) {
    bytes.push(...BOLD_ON);
    bytes.push(...DOUBLE_SIZE);
    addLine(bytes, data.storeInfo.name.toUpperCase());
    bytes.push(...NORMAL_SIZE);
    bytes.push(...BOLD_OFF);
  }

  // Store address and phone
  if (data.storeInfo?.address) {
    addLine(bytes, data.storeInfo.address);
  }
  if (data.storeInfo?.phone) {
    addLine(bytes, `Tel: ${data.storeInfo.phone}`);
  }

  bytes.push(LF);
  addLine(bytes, doubleLine(width));
  
  // Order type banner
  bytes.push(...BOLD_ON);
  bytes.push(...DOUBLE_SIZE);
  addLine(bytes, getOrderTypeLabel(data.orderType));
  bytes.push(...NORMAL_SIZE);
  addLine(bytes, `#${data.orderNumber}`);
  bytes.push(...BOLD_OFF);
  
  addLine(bytes, doubleLine(width));
  bytes.push(LF);

  // ===== ORDER INFO =====
  bytes.push(...LEFT);
  
  // Date/time
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  addLine(bytes, `Data: ${dateStr}  Hora: ${timeStr}`);
  
  bytes.push(LF);

  // Customer/Table info based on order type
  if (data.orderType === 'table' && data.tableName) {
    bytes.push(...BOLD_ON);
    bytes.push(...DOUBLE_HEIGHT);
    addLine(bytes, `MESA: ${data.tableName}`);
    bytes.push(...NORMAL_SIZE);
    bytes.push(...BOLD_OFF);
    if (data.waiterName) {
      addLine(bytes, `Garcom: ${data.waiterName}`);
    }
  } else if (data.orderType === 'quick_sale') {
    if (data.customerName && data.customerName !== 'Balcão') {
      bytes.push(...BOLD_ON);
      addLine(bytes, `Cliente: ${data.customerName}`);
      bytes.push(...BOLD_OFF);
    }
  } else if (data.orderType === 'delivery') {
    bytes.push(...BOLD_ON);
    addLine(bytes, `CLIENTE: ${data.customerName || 'Nao informado'}`);
    bytes.push(...BOLD_OFF);
    if (data.customerPhone) {
      addLine(bytes, `Telefone: ${data.customerPhone}`);
    }
    if (data.address) {
      bytes.push(LF);
      bytes.push(...UNDERLINE_ON);
      addLine(bytes, 'ENDERECO DE ENTREGA:');
      bytes.push(...UNDERLINE_OFF);
      addLine(bytes, `${data.address.street}, ${data.address.number}`);
      addLine(bytes, data.address.neighborhood);
      if (data.address.complement) {
        addLine(bytes, `Complemento: ${data.address.complement}`);
      }
      if (data.address.reference) {
        addLine(bytes, `Referencia: ${data.address.reference}`);
      }
    }
  }

  bytes.push(LF);
  addLine(bytes, dashedLine(width));

  // ===== ITEMS =====
  bytes.push(...BOLD_ON);
  addLine(bytes, formatLine('QTD  ITEM', 'VALOR', width));
  bytes.push(...BOLD_OFF);
  addLine(bytes, dashedLine(width));

  // Items with better formatting for 80mm
  data.items.forEach(item => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    const qtyStr = String(item.quantity).padStart(2, ' ') + 'x ';
    
    // For 80mm we can fit more on one line
    if (width >= 48) {
      const maxItemNameLen = width - itemTotal.length - 5;
      const itemName = item.name.length > maxItemNameLen 
        ? item.name.substring(0, maxItemNameLen - 2) + '..'
        : item.name;
      addLine(bytes, formatLine(qtyStr + itemName, itemTotal, width));
    } else {
      // For 58mm, item name on one line, total on next
      addLine(bytes, qtyStr + item.name);
      bytes.push(...RIGHT);
      addLine(bytes, itemTotal);
      bytes.push(...LEFT);
    }
    
    if (item.observation) {
      addLine(bytes, `    > ${item.observation}`);
    }
  });

  addLine(bytes, dashedLine(width));

  // ===== TOTALS =====
  addLine(bytes, formatLine('Subtotal:', formatCurrency(data.subtotal), width));
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    addLine(bytes, formatLine('Taxa de Entrega:', formatCurrency(data.deliveryFee), width));
  }
  
  if (data.serviceFee && data.serviceFee > 0) {
    addLine(bytes, formatLine('Taxa de Servico (10%):', formatCurrency(data.serviceFee), width));
  }
  
  if (data.discount && data.discount > 0) {
    addLine(bytes, formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width));
  }

  addLine(bytes, doubleLine(width));
  
  // Grand total (large)
  bytes.push(...CENTER);
  bytes.push(...BOLD_ON);
  bytes.push(...DOUBLE_SIZE);
  addLine(bytes, `TOTAL: ${formatCurrency(data.total)}`);
  bytes.push(...NORMAL_SIZE);
  bytes.push(...BOLD_OFF);
  bytes.push(...LEFT);
  
  addLine(bytes, doubleLine(width));

  // ===== PAYMENT INFO =====
  if (data.paymentMethod) {
    bytes.push(LF);
    bytes.push(...BOLD_ON);
    addLine(bytes, `Forma de Pagamento: ${getPaymentLabel(data.paymentMethod)}`);
    bytes.push(...BOLD_OFF);
    
    // Change calculation for cash
    if ((data.paymentMethod === 'money' || data.paymentMethod === 'cash') && data.changeFor && data.changeFor > data.total) {
      addLine(bytes, formatLine('Valor recebido:', formatCurrency(data.changeFor), width));
      addLine(bytes, formatLine('Troco:', formatCurrency(data.changeFor - data.total), width));
    }
  }

  // ===== QR CODE =====
  if (data.qrCodeData) {
    bytes.push(LF);
    bytes.push(...CENTER);
    addLine(bytes, 'Acompanhe seu pedido:');
    bytes.push(...generateQRCodeBytes(data.qrCodeData));
    bytes.push(LF);
  }

  // ===== FOOTER =====
  bytes.push(LF);
  bytes.push(...CENTER);
  addLine(bytes, dashedLine(width));
  bytes.push(...BOLD_ON);
  addLine(bytes, 'Obrigado pela preferencia!');
  bytes.push(...BOLD_OFF);
  addLine(bytes, 'Volte sempre!');
  bytes.push(LF);
  
  // Timestamp
  addLine(bytes, `Impresso em: ${new Date().toLocaleString('pt-BR')}`);
  
  bytes.push(...FEED_3);

  // Cut paper
  bytes.push(...CUT);

  return new Uint8Array(bytes);
}

// Legacy text version for compatibility
export function generateReceiptText(data: PrintOrderData): string {
  const width = 32;
  let receipt = '';

  // ESC/POS as text (legacy)
  const ESC_T = '\x1B';
  const GS_T = '\x1D';
  
  receipt += ESC_T + '@'; // Init
  receipt += ESC_T + 'a\x01'; // Center
  receipt += ESC_T + '!\x30'; // Double size
  receipt += (data.orderType === 'delivery' ? 'DELIVERY' : 'COMANDA') + '\n';
  receipt += ESC_T + '!\x00'; // Normal
  receipt += `#${data.orderNumber}\n\n`;

  receipt += ESC_T + 'a\x00'; // Left
  if (data.orderType === 'table' && data.tableName) {
    receipt += ESC_T + 'E\x01'; // Bold
    receipt += `Mesa: ${data.tableName}\n`;
    receipt += ESC_T + 'E\x00';
    if (data.waiterName) {
      receipt += `Garcom: ${data.waiterName}\n`;
    }
  } else if (data.orderType === 'delivery') {
    receipt += ESC_T + 'E\x01';
    receipt += `Cliente: ${data.customerName}\n`;
    receipt += ESC_T + 'E\x00';
    if (data.customerPhone) {
      receipt += `Tel: ${data.customerPhone}\n`;
    }
    if (data.address) {
      receipt += `${data.address.street}, ${data.address.number}\n`;
      receipt += `${data.address.neighborhood}\n`;
      if (data.address.complement) {
        receipt += `${data.address.complement}\n`;
      }
    }
  }

  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  receipt += `Data: ${dateStr} ${timeStr}\n`;
  receipt += dashedLine(width) + '\n';

  receipt += ESC_T + 'E\x01';
  receipt += formatLine('ITEM', 'TOTAL', width) + '\n';
  receipt += ESC_T + 'E\x00';
  receipt += dashedLine(width) + '\n';

  data.items.forEach(item => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    receipt += `${item.quantity}x ${item.name}\n`;
    receipt += ESC_T + 'a\x02';
    receipt += `${itemTotal}\n`;
    receipt += ESC_T + 'a\x00';
    if (item.observation) {
      receipt += `  Obs: ${item.observation}\n`;
    }
  });

  receipt += dashedLine(width) + '\n';
  receipt += formatLine('Subtotal:', formatCurrency(data.subtotal), width) + '\n';
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    receipt += formatLine('Taxa de entrega:', formatCurrency(data.deliveryFee), width) + '\n';
  }
  if (data.serviceFee && data.serviceFee > 0) {
    receipt += formatLine('Taxa de servico:', formatCurrency(data.serviceFee), width) + '\n';
  }
  if (data.discount && data.discount > 0) {
    receipt += formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width) + '\n';
  }

  receipt += dashedLine(width) + '\n';
  receipt += ESC_T + 'E\x01' + ESC_T + '!\x10';
  receipt += formatLine('TOTAL:', formatCurrency(data.total), width) + '\n';
  receipt += ESC_T + '!\x00' + ESC_T + 'E\x00';

  if (data.paymentMethod) {
    receipt += `\nPagamento: ${data.paymentMethod}\n`;
  }

  receipt += '\n' + ESC_T + 'a\x01';
  receipt += 'Obrigado pela preferencia!\n\n\n';
  receipt += GS_T + 'V\x00';

  return receipt;
}

export async function printReceipt(data: PrintOrderData): Promise<boolean> {
  try {
    // Check if Web Serial API is supported
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API não suportada neste navegador. Use Chrome ou Edge.');
    }

    // Request port access
    const port = await (navigator as any).serial.requestPort();
    
    // Open the port with common thermal printer settings
    await port.open({ 
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });

    const writer = port.writable.getWriter();
    
    // Generate receipt as raw bytes
    const receiptBytes = generateReceiptBytes(data);
    
    // Send bytes directly (not encoded text)
    await writer.write(receiptBytes);
    
    writer.releaseLock();
    await port.close();

    return true;
  } catch (error) {
    console.error('Erro ao imprimir:', error);
    throw error;
  }
}

// Browser print fallback using window.print() - Professional 80mm format
export function printReceiptBrowser(data: PrintOrderData): void {
  const printWindow = window.open('', '_blank', 'width=320,height=800');
  if (!printWindow) {
    throw new Error('Não foi possível abrir janela de impressão');
  }

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return 'DELIVERY';
      case 'table': return 'COMANDA';
      case 'quick_sale': return 'VENDA BALCÃO';
      default: return type.toUpperCase();
    }
  };

  const getPaymentLabel = (method: string | undefined) => {
    if (!method) return '-';
    const labels: Record<string, string> = {
      money: 'Dinheiro', cash: 'Dinheiro',
      credit: 'Cartão Crédito', debit: 'Cartão Débito',
      pix: 'PIX', card: 'Cartão',
    };
    return labels[method.toLowerCase()] || method;
  };

  // Generate QR Code URL using a free QR code service
  const qrCodeUrl = data.qrCodeData 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.qrCodeData)}`
    : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido #${data.orderNumber}</title>
      <style>
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Courier New', 'Lucida Console', monospace; 
          font-size: 11px; 
          width: 80mm; 
          max-width: 80mm;
          margin: 0 auto; 
          padding: 8px;
          background: white;
          color: black;
          line-height: 1.3;
        }
        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 2px solid black;
          margin-bottom: 8px;
        }
        .logo {
          max-width: 60mm;
          max-height: 25mm;
          margin-bottom: 5px;
        }
        .store-name {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .store-info {
          font-size: 10px;
          color: #333;
        }
        .order-type-banner {
          background: black;
          color: white;
          text-align: center;
          padding: 8px;
          margin: 8px 0;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .order-number {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .section {
          margin: 8px 0;
          padding: 8px 0;
          border-bottom: 1px dashed #333;
        }
        .section-title {
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .info-label {
          font-weight: bold;
        }
        .customer-name {
          font-size: 14px;
          font-weight: bold;
        }
        .address-block {
          background: #f5f5f5;
          padding: 8px;
          margin: 5px 0;
          border-left: 3px solid black;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          border-bottom: 1px solid black;
          padding-bottom: 3px;
          margin-bottom: 5px;
        }
        .item {
          margin: 5px 0;
          padding-bottom: 5px;
          border-bottom: 1px dotted #ccc;
        }
        .item-main {
          display: flex;
          justify-content: space-between;
        }
        .item-name {
          flex: 1;
        }
        .item-qty {
          font-weight: bold;
          margin-right: 5px;
        }
        .item-price {
          font-weight: bold;
          text-align: right;
          min-width: 70px;
        }
        .item-obs {
          font-size: 10px;
          color: #666;
          margin-left: 20px;
          font-style: italic;
        }
        .totals {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid black;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          background: black;
          color: white;
          padding: 10px;
          margin: 10px 0;
          text-align: center;
        }
        .payment-info {
          background: #f0f0f0;
          padding: 8px;
          margin: 8px 0;
        }
        .change-info {
          background: #fff3cd;
          padding: 8px;
          border: 1px solid #ffc107;
          margin-top: 5px;
        }
        .qr-section {
          text-align: center;
          padding: 10px 0;
          border-top: 1px dashed #333;
          border-bottom: 1px dashed #333;
          margin: 10px 0;
        }
        .qr-label {
          font-size: 10px;
          margin-bottom: 5px;
        }
        .qr-code {
          width: 100px;
          height: 100px;
        }
        .footer {
          text-align: center;
          padding-top: 10px;
          border-top: 2px solid black;
          margin-top: 10px;
        }
        .footer-thanks {
          font-size: 14px;
          font-weight: bold;
        }
        .footer-timestamp {
          font-size: 9px;
          color: #666;
          margin-top: 10px;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 5px;
          }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <!-- Header with Logo -->
      <div class="header">
        ${data.storeInfo?.logoUrl ? `<img src="${data.storeInfo.logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'">` : ''}
        ${data.storeInfo?.name ? `<div class="store-name">${data.storeInfo.name}</div>` : ''}
        ${data.storeInfo?.address ? `<div class="store-info">${data.storeInfo.address}</div>` : ''}
        ${data.storeInfo?.phone ? `<div class="store-info">Tel: ${data.storeInfo.phone}</div>` : ''}
      </div>

      <!-- Order Type Banner -->
      <div class="order-type-banner">${getOrderTypeLabel(data.orderType)}</div>
      <div class="order-number">#${data.orderNumber}</div>

      <!-- Date/Time -->
      <div class="section">
        <div class="info-row">
          <span>Data:</span>
          <span>${data.createdAt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="info-row">
          <span>Hora:</span>
          <span>${data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <!-- Customer/Table Info -->
      ${data.orderType === 'table' && data.tableName ? `
        <div class="section">
          <div class="customer-name">MESA: ${data.tableName}</div>
          ${data.waiterName ? `<div class="info-row"><span>Garçom:</span><span>${data.waiterName}</span></div>` : ''}
        </div>
      ` : ''}
      
      ${data.orderType === 'quick_sale' && data.customerName && data.customerName !== 'Balcão' ? `
        <div class="section">
          <div class="customer-name">Cliente: ${data.customerName}</div>
        </div>
      ` : ''}
      
      ${data.orderType === 'delivery' ? `
        <div class="section">
          <div class="customer-name">${data.customerName || 'Cliente'}</div>
          ${data.customerPhone ? `<div>Tel: ${data.customerPhone}</div>` : ''}
          ${data.address ? `
            <div class="address-block">
              <div class="section-title">Endereço de Entrega:</div>
              <div>${data.address.street}, ${data.address.number}</div>
              <div>${data.address.neighborhood}</div>
              ${data.address.complement ? `<div>Comp: ${data.address.complement}</div>` : ''}
              ${data.address.reference ? `<div>Ref: ${data.address.reference}</div>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Items -->
      <div class="section">
        <div class="items-header">
          <span>QTD  ITEM</span>
          <span>VALOR</span>
        </div>
        ${data.items.map(item => `
          <div class="item">
            <div class="item-main">
              <span><span class="item-qty">${item.quantity}x</span>${item.name}</span>
              <span class="item-price">${formatCurrency(item.quantity * item.unitPrice)}</span>
            </div>
            ${item.observation ? `<div class="item-obs">▸ ${item.observation}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <!-- Totals -->
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.deliveryFee && data.deliveryFee > 0 ? `
          <div class="total-row">
            <span>Taxa de Entrega:</span>
            <span>${formatCurrency(data.deliveryFee)}</span>
          </div>
        ` : ''}
        ${data.serviceFee && data.serviceFee > 0 ? `
          <div class="total-row">
            <span>Taxa de Serviço (10%):</span>
            <span>${formatCurrency(data.serviceFee)}</span>
          </div>
        ` : ''}
        ${data.discount && data.discount > 0 ? `
          <div class="total-row" style="color: green;">
            <span>Desconto:</span>
            <span>-${formatCurrency(data.discount)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Grand Total -->
      <div class="grand-total">
        TOTAL: ${formatCurrency(data.total)}
      </div>

      <!-- Payment Info -->
      ${data.paymentMethod ? `
        <div class="payment-info">
          <div class="info-row">
            <span class="info-label">Pagamento:</span>
            <span>${getPaymentLabel(data.paymentMethod)}</span>
          </div>
          ${(data.paymentMethod === 'money' || data.paymentMethod === 'cash') && data.changeFor && data.changeFor > data.total ? `
            <div class="change-info">
              <div class="info-row">
                <span>Valor Recebido:</span>
                <span>${formatCurrency(data.changeFor)}</span>
              </div>
              <div class="info-row" style="font-weight: bold; font-size: 14px;">
                <span>TROCO:</span>
                <span>${formatCurrency(data.changeFor - data.total)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- QR Code -->
      ${qrCodeUrl ? `
        <div class="qr-section">
          <div class="qr-label">Acompanhe seu pedido:</div>
          <img src="${qrCodeUrl}" class="qr-code" alt="QR Code">
        </div>
      ` : ''}

      <!-- Footer -->
      <div class="footer">
        <div class="footer-thanks">Obrigado pela preferência!</div>
        <div>Volte sempre!</div>
        <div class="footer-timestamp">
          Impresso em: ${new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// Fallback: Generate text for copying or viewing
export function generatePrintableText(data: PrintOrderData): string {
  const width = 48; // 80mm width
  let text = '';

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return 'DELIVERY';
      case 'table': return 'COMANDA';
      case 'quick_sale': return 'VENDA BALCÃO';
      default: return type.toUpperCase();
    }
  };

  const getPaymentLabel = (method: string | undefined) => {
    if (!method) return '-';
    const labels: Record<string, string> = {
      money: 'Dinheiro', cash: 'Dinheiro',
      credit: 'Cartão Crédito', debit: 'Cartão Débito',
      pix: 'PIX', card: 'Cartão',
    };
    return labels[method.toLowerCase()] || method;
  };

  // Header
  if (data.storeInfo?.name) {
    text += '='.repeat(width) + '\n';
    text += centerText(data.storeInfo.name.toUpperCase(), width) + '\n';
    if (data.storeInfo.address) {
      text += centerText(data.storeInfo.address, width) + '\n';
    }
    if (data.storeInfo.phone) {
      text += centerText(`Tel: ${data.storeInfo.phone}`, width) + '\n';
    }
  }

  text += '='.repeat(width) + '\n';
  text += centerText(getOrderTypeLabel(data.orderType), width) + '\n';
  text += centerText(`#${data.orderNumber}`, width) + '\n';
  text += '='.repeat(width) + '\n\n';

  // Date/Time
  const dateStr = data.createdAt.toLocaleDateString('pt-BR');
  const timeStr = data.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  text += `Data: ${dateStr}    Hora: ${timeStr}\n\n`;

  // Customer/Table info
  if (data.orderType === 'table' && data.tableName) {
    text += `MESA: ${data.tableName}\n`;
    if (data.waiterName) {
      text += `Garçom: ${data.waiterName}\n`;
    }
  } else if (data.orderType === 'quick_sale' && data.customerName && data.customerName !== 'Balcão') {
    text += `Cliente: ${data.customerName}\n`;
  } else if (data.orderType === 'delivery') {
    text += `CLIENTE: ${data.customerName || 'Não informado'}\n`;
    if (data.customerPhone) {
      text += `Telefone: ${data.customerPhone}\n`;
    }
    if (data.address) {
      text += '\nENDEREÇO DE ENTREGA:\n';
      text += `${data.address.street}, ${data.address.number}\n`;
      text += `${data.address.neighborhood}\n`;
      if (data.address.complement) {
        text += `Complemento: ${data.address.complement}\n`;
      }
      if (data.address.reference) {
        text += `Referência: ${data.address.reference}\n`;
      }
    }
  }

  text += '\n' + '-'.repeat(width) + '\n';
  text += 'QTD  ITEM' + ' '.repeat(width - 20) + 'VALOR\n';
  text += '-'.repeat(width) + '\n';

  // Items
  data.items.forEach(item => {
    const itemTotal = formatCurrency(item.quantity * item.unitPrice);
    const qtyStr = String(item.quantity).padStart(2, ' ') + 'x ';
    text += formatLine(qtyStr + item.name, itemTotal, width) + '\n';
    if (item.observation) {
      text += `     > ${item.observation}\n`;
    }
  });

  text += '-'.repeat(width) + '\n';

  // Totals
  text += formatLine('Subtotal:', formatCurrency(data.subtotal), width) + '\n';
  
  if (data.deliveryFee && data.deliveryFee > 0) {
    text += formatLine('Taxa de Entrega:', formatCurrency(data.deliveryFee), width) + '\n';
  }
  
  if (data.serviceFee && data.serviceFee > 0) {
    text += formatLine('Taxa de Serviço (10%):', formatCurrency(data.serviceFee), width) + '\n';
  }
  
  if (data.discount && data.discount > 0) {
    text += formatLine('Desconto:', `-${formatCurrency(data.discount)}`, width) + '\n';
  }

  text += '='.repeat(width) + '\n';
  text += centerText(`TOTAL: ${formatCurrency(data.total)}`, width) + '\n';
  text += '='.repeat(width) + '\n';

  // Payment
  if (data.paymentMethod) {
    text += `\nForma de Pagamento: ${getPaymentLabel(data.paymentMethod)}\n`;
    if ((data.paymentMethod === 'money' || data.paymentMethod === 'cash') && data.changeFor && data.changeFor > data.total) {
      text += formatLine('Valor Recebido:', formatCurrency(data.changeFor), width) + '\n';
      text += formatLine('TROCO:', formatCurrency(data.changeFor - data.total), width) + '\n';
    }
  }

  // Footer
  text += '\n' + '-'.repeat(width) + '\n';
  text += centerText('Obrigado pela preferência!', width) + '\n';
  text += centerText('Volte sempre!', width) + '\n';
  text += '\n' + centerText(`Impresso em: ${new Date().toLocaleString('pt-BR')}`, width) + '\n';

  return text;
}
