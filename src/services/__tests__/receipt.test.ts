import { buildReceipt, buildReceiptHtml, buildReceiptText } from '../receiptService';
import { amountInWords } from '../../utils/format';
import type { FunctionEvent, MoiEntry, Person } from '../../domain/models';

const entry: MoiEntry = {
  id: 'm2',
  functionId: 'fn1',
  personId: 'p1',
  kind: 'cash',
  amount: 1001,
  paymentType: 'cash',
  recordedAt: '2026-05-13T05:00:00.000Z',
  notes: 'Happy wishes',
};

const all: MoiEntry[] = [
  { ...entry, id: 'm1', recordedAt: '2026-05-13T04:00:00.000Z' },
  entry,
];

const person: Person = {
  id: 'p1', name: 'B. Murugan', phone: '9876543210', village: 'Tenkasi',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const fn: FunctionEvent = {
  id: 'fn1', title: 'Karthick Wedding', type: 'wedding', date: '2026-05-13',
  venue: 'Meenakshi Mahal', createdAt: '2026-01-01T00:00:00.000Z',
};

describe('amount in words (Indian numbering)', () => {
  it('spells amounts the way a cheque reads', () => {
    expect(amountInWords(1001)).toBe('One Thousand and One Rupees Only');
    expect(amountInWords(501)).toBe('Five Hundred and One Rupees Only');
    expect(amountInWords(215500)).toBe('Two Lakh Fifteen Thousand Five Hundred Rupees Only');
    expect(amountInWords(0)).toBe('Zero Rupees Only');
  });

  it('uses crore and lakh, not millions', () => {
    expect(amountInWords(12345678)).toContain('One Crore');
    expect(amountInWords(12345678)).toContain('Lakh');
  });
});

describe('receipt', () => {
  it('numbers by the entry’s place in that function’s book', () => {
    const receipt = buildReceipt({
      entry, functionEntries: all, person, fn, hostName: 'Karthick',
    });
    expect(receipt.receiptNo).toBe('MOI-260513-002');
    expect(receipt.amount).toBe(1001);
    expect(receipt.amountWords).toBe('One Thousand and One Rupees Only');
    expect(receipt.personName).toBe('B. Murugan');
    expect(receipt.hostName).toBe('Karthick');
  });

  it('falls back when the person or function is missing', () => {
    const receipt = buildReceipt({
      entry, functionEntries: all, person: undefined, fn: undefined, hostName: '',
    });
    expect(receipt.personName).toBe('Guest');
    expect(receipt.functionTitle).toBe('Function');
    expect(receipt.hostName).toBe('Our family');
  });

  it('renders every detail into the printable html', () => {
    const receipt = buildReceipt({
      entry, functionEntries: all, person, fn, hostName: 'Karthick',
    });
    const html = buildReceiptHtml(receipt);

    expect(html).toContain('Karthick Wedding');
    expect(html).toContain('B. Murugan');
    expect(html).toContain('98765 43210');
    expect(html).toContain('Tenkasi');
    expect(html).toContain('MOI-260513-002');
    expect(html).toContain('One Thousand and One Rupees Only');
    expect(html).toContain('Thank you for your kindness');
    expect(html).toContain('Karthick and family');
    expect(html.split('<div').length).toBe(html.split('</div>').length);
  });

  it('escapes html so a name cannot break the receipt', () => {
    const receipt = buildReceipt({
      entry,
      functionEntries: all,
      person: { ...person, name: '<script>alert(1)</script>' },
      fn,
      hostName: 'Karthick',
    });
    const html = buildReceiptHtml(receipt);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('carries every printed detail into the shared text', () => {
    const receipt = buildReceipt({
      entry, functionEntries: all, person, fn, hostName: 'Karthick',
    });
    const text = buildReceiptText(receipt);

    // The shared message must say everything the printed receipt shows —
    // a guest reading it on WhatsApp gets no second page.
    for (const expected of [
      'Karthick Wedding',
      'Meenakshi Mahal',
      'MOI RECEIVED WITH GRATITUDE',
      '₹1,001',
      'One Thousand and One Rupees Only',
      'From: B. Murugan',
      'Phone: 98765 43210',
      'Village: Tenkasi',
      'Payment: Cash',
      'Recorded: 13 May 2026',
      'Receipt no: MOI-260513-002',
      'Note: Happy wishes',
      'Thank you for your kindness',
      'Karthick and family',
      'Recorded with Moi Manager',
    ]) {
      expect(text).toContain(expected);
    }

    // Plain text, no markup leaking through from the html version.
    expect(text).not.toContain('<');
  });

  it('omits a line rather than printing an empty one', () => {
    const receipt = buildReceipt({
      entry: { ...entry, notes: undefined },
      functionEntries: all,
      person: { ...person, phone: undefined, village: undefined },
      fn,
      hostName: 'Karthick',
    });
    const text = buildReceiptText(receipt);

    expect(text).not.toContain('Phone:');
    expect(text).not.toContain('Village:');
    expect(text).not.toContain('Note:');
    expect(text).toContain('From: B. Murugan');
  });
});

describe('a gift receipt', () => {
  const giftEntry: MoiEntry = {
    ...entry,
    id: 'm3',
    kind: 'gift',
    amount: 0,
    giftName: 'Vessels set',
  };

  it('leads with the gift, not a rupee figure', () => {
    const receipt = buildReceipt({ entry: giftEntry, functionEntries: [giftEntry], person, fn, hostName: 'Karthick' });
    const html = buildReceiptHtml(receipt);
    expect(html).toContain('Vessels set');
    // "₹0" and "Rupees zero only" would both read as a mistake.
    expect(html).not.toContain('₹0');
    expect(receipt.amountWords).toBe('');
  });

  it('says what the host valued it at, when they said', () => {
    const valued = { ...giftEntry, giftValue: 3500 };
    const receipt = buildReceipt({ entry: valued, functionEntries: [valued], person, fn, hostName: 'Karthick' });
    expect(receipt.amount).toBe(3500);
    expect(receipt.amountWords).toMatch(/estimated/i);
  });

  it('claims no payment type, since none was used', () => {
    const receipt = buildReceipt({ entry: giftEntry, functionEntries: [giftEntry], person, fn, hostName: 'Karthick' });
    expect(buildReceiptText(receipt)).not.toMatch(/^Payment/m);
  });
});
