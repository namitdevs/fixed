import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function createSamplePdf(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    doc.fontSize(20).text('SPECIAL INTELLIGENCE BUREAU', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).text('CONFIDENTIAL SURVEILLANCE DOSSIER - OPERATION NIGHTFALL', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(12).text('Date of Assessment: 14 March 2026');
    doc.text('Subject: Hawala Network Layering & Logistics Linkage');
    doc.text('Case Reference: CASE-2026-001');
    doc.moveDown();

    doc.fontSize(14).text('1. EXECUTIVE SUMMARY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'Target entity Ravi Sharma coordinates financial settlements between overseas syndicates and domestic transport routes. ' +
      'Amit Kumar operates as the secondary conduit for disbursement of liquidity through staggered online NEFT transfers.'
    );
    doc.moveDown();

    doc.fontSize(14).text('2. VEHICULAR & PHYSICAL MOVEMENTS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'Vehicle PB-02-AZ-9988 registered to Mohit Singh has been tracked traversing toll plazas along National Highway 44. ' +
      'On 13 March 2026, Sahil Verma met Mohit Singh at an industrial estate in Ambala to exchange logistical consignments.'
    );
    doc.moveDown();

    doc.fontSize(14).text('3. FINANCIAL OBSERVATIONS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'Account ACC-4412 maintained by Amit Kumar received an aggregate credit of INR 5,00,000 from primary account ACC-8801. ' +
      'Within ninety minutes, split remittances of INR 1,60,000 were wired to accounts ACC-9021, ACC-9022, and ACC-9023 to circumvent anti-money laundering thresholds.'
    );

    doc.end();

    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => reject(err));
  });
}

// If run directly
if (require.main === module) {
  const target = path.join(__dirname, '../../sample_data/police_report.pdf');
  createSamplePdf(target)
    .then(() => console.log('Sample PDF created at:', target))
    .catch((err) => console.error('Failed to create sample PDF:', err));
}
