'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Toast from '@/components/Toast';
import CustomSelect from '@/components/CustomSelect';
import { FileText, Receipt, ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react';

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function ReportsClient({ sources, withdrawals, contacts }) {
  const { t, lang } = useLanguage();
  const [toast, setToast] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState('overall');

  // Get unique years from withdrawals
  const years = useMemo(() => {
    const yearSet = new Set();
    yearSet.add(new Date().getFullYear().toString());
    withdrawals.forEach(w => {
      if (w.withdrawal_date) {
        yearSet.add(w.withdrawal_date.substring(0, 4));
      }
    });
    return Array.from(yearSet).sort().reverse();
  }, [withdrawals]);

  // Filter withdrawals by year
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => w.withdrawal_date?.startsWith(selectedYear));
  }, [withdrawals, selectedYear]);

  const totalWithdrawnThisYear = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  // Distribution summary
  const distributionSummary = useMemo(() => {
    const summary = {};
    filteredWithdrawals.forEach(w => {
      w.distributions.forEach(d => {
        if (!summary[d.contact_name]) {
          summary[d.contact_name] = { total: 0, count: 0, methods: {} };
        }
        summary[d.contact_name].total += d.amount;
        summary[d.contact_name].count += 1;
        summary[d.contact_name].methods[d.method] = (summary[d.contact_name].methods[d.method] || 0) + d.amount;
      });
    });
    return summary;
  }, [filteredWithdrawals]);

  const exportPdf = async (type) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(34, 211, 238);
    doc.text('Income Manager', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPos);
    yPos += 12;

    if (type === 'overall') {
      // Overall Summary
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Overall Summary - ${selectedYear}`, 14, yPos);
      yPos += 10;

      // Income Sources Table
      doc.setFontSize(12);
      doc.text('Income Sources', 14, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Source', 'Total', 'Monthly', 'Months', 'Withdrawn', 'Remaining', 'Status']],
        body: sources.map(s => [
          s.contact_name,
          `${s.currency} ${formatNumber(s.total_amount)}`,
          `${s.currency} ${formatNumber(s.monthly_amount)}`,
          `${s.withdrawal_count}/${s.total_months}`,
          `${s.currency} ${formatNumber(s.total_withdrawn)}`,
          `${s.currency} ${formatNumber(s.total_amount - s.total_withdrawn)}`,
          s.status,
        ]),
        headStyles: { fillColor: [34, 211, 238], textColor: [10, 14, 23] },
        styles: { fontSize: 8 },
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Withdrawals for the year
      if (filteredWithdrawals.length > 0) {
        doc.setFontSize(12);
        doc.text(`Withdrawals - ${selectedYear}`, 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Source', 'Month', 'Amount', 'Distributions']],
          body: filteredWithdrawals.map(w => [
            w.withdrawal_date,
            w.source_contact_name,
            w.month_label || `Month ${w.month_number}`,
            `${w.currency} ${formatNumber(w.amount)}`,
            w.distributions.map(d => `${d.contact_name}: ${formatNumber(d.amount)}`).join(', '),
          ]),
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
          styles: { fontSize: 8 },
        });

        yPos = doc.lastAutoTable.finalY + 12;
      }

      // Distribution Summary
      const distEntries = Object.entries(distributionSummary);
      if (distEntries.length > 0) {
        doc.setFontSize(12);
        doc.text('Distribution Summary', 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Recipient', 'Total Received', 'Transactions']],
          body: distEntries.map(([name, data]) => [
            name,
            formatNumber(data.total),
            data.count,
          ]),
          headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
          styles: { fontSize: 8 },
        });
      }

    } else if (type === 'receipt') {
      // Receipt / Balance view
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('Remaining Balance Receipt', 14, yPos);
      yPos += 14;

      sources.forEach(s => {
        const remaining = s.total_amount - s.total_withdrawn;
        const progress = (s.total_withdrawn / s.total_amount) * 100;
        
        // Check for page break
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Source Box
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(14, yPos, pageWidth - 28, 48, 2, 2, 'FD');

        // Title & Status
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${s.contact_name}`, 20, yPos + 10);
        
        // Status Badge
        const statusColor = s.status === 'active' ? [16, 185, 129] : [100, 116, 139];
        doc.setFillColor(...statusColor);
        doc.roundedRect(pageWidth - 45, yPos + 5, 25, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(s.status.toUpperCase(), pageWidth - 32.5, yPos + 9.5, { align: 'center' });

        // Details Grid
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('START DATE', 20, yPos + 22);
        doc.text('MONTHLY', 65, yPos + 22);
        doc.text('PROGRESS', 110, yPos + 22);
        doc.text('REMAINING', 155, yPos + 22);

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(s.start_date || '-', 20, yPos + 28);
        doc.text(`${s.currency} ${formatNumber(s.monthly_amount)}`, 65, yPos + 28);
        doc.text(`${s.withdrawal_count} / ${s.total_months} mo`, 110, yPos + 28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(34, 211, 238); // Cyan
        doc.text(`${s.currency} ${formatNumber(remaining)}`, 155, yPos + 28);

        // Quick Progress Bar
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(20, yPos + 38, pageWidth - 40, 2, 1, 1, 'F');
        doc.setFillColor(34, 211, 238);
        const barWidth = (pageWidth - 40) * (progress / 100);
        doc.roundedRect(20, yPos + 38, barWidth, 2, 1, 1, 'F');

        yPos += 58;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Income Manager • Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    const fileName = type === 'receipt' 
      ? `balance_receipt_${new Date().toISOString().split('T')[0]}.pdf`
      : `income_report_${selectedYear}.pdf`;
    doc.save(fileName);
    setToast({ message: `PDF exported: ${fileName}`, type: 'success' });
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">{t('reports')}</h1>
        <p className="page-subtitle">{t('overallSummary')}</p>
      </div>

      {/* Filters & Actions */}
      <div className="card mb-lg animate-in stagger-1">
        <div className="report-header">
          <div className="report-filters">
            <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
              <CustomSelect 
                name="selectedYear"
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                options={years.map(y => ({ value: y, label: y }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-primary" onClick={() => exportPdf('overall')}>
              <FileText size={16} /> {t('exportPdf')} — {t('overallSummary')}
            </button>
            <button className="btn btn-secondary" onClick={() => exportPdf('receipt')}>
              <Receipt size={16} /> {t('exportPdf')} — {t('receiptView')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="card stat-card animate-in stagger-1">
          <div className="card-icon cyan"><ArrowDownToLine size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalIncome')}</div>
            <div className="card-value">{formatNumber(sources.reduce((s, src) => s + src.total_amount, 0))}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-2">
          <div className="card-icon purple"><ArrowUpFromLine size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalWithdrawn')} ({selectedYear})</div>
            <div className="card-value">{formatNumber(totalWithdrawnThisYear)}</div>
          </div>
        </div>
        <div className="card stat-card animate-in stagger-3">
          <div className="card-icon green"><Wallet size={24} /></div>
          <div className="stat-info">
            <div className="card-title">{t('totalRemaining')}</div>
            <div className="card-value">
              {formatNumber(sources.reduce((s, src) => s + (src.total_amount - src.total_withdrawn), 0))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Income Sources Summary */}
        <div className="card animate-in stagger-2">
          <div className="card-header">
            <h2 className="card-title">{t('incomeSources')}</h2>
          </div>
          {sources.length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">{t('noIncomeSources')}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('name')}</th>
                    <th>{t('total')}</th>
                    <th>{t('remaining')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                        {s.contact_name}
                        {s.description && <div className="source-description">{s.description}</div>}
                      </td>
                      <td>{s.currency} {formatNumber(s.total_amount)}</td>
                      <td className="text-accent">{s.currency} {formatNumber(s.total_amount - s.total_withdrawn)}</td>
                      <td>
                        <span className={`badge badge-${s.status}`}>{t(s.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Distribution Summary */}
        <div className="card animate-in stagger-3">
          <div className="card-header">
            <h2 className="card-title">{t('distributionBreakdown')} ({selectedYear})</h2>
          </div>
          {Object.keys(distributionSummary).length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">{t('noData')}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('recipient')}</th>
                    <th>{t('totalReceived')}</th>
                    <th>{t('method')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(distributionSummary).map(([name, data]) => (
                    <tr key={name}>
                      <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{name}</td>
                      <td className="text-accent">{formatNumber(data.total)}</td>
                      <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {Object.entries(data.methods).map(([m, a]) => 
                          `${m === 'bank_transfer' ? t('bankTransfer') : m === 'cash' ? t('cash') : m === 'revolut' ? t('revolut') : m}: ${formatNumber(a)}`
                        ).join(' | ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="card mt-lg animate-in stagger-4">
        <div className="card-header">
          <h2 className="card-title">{t('withdrawals')} — {selectedYear}</h2>
        </div>
        {filteredWithdrawals.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">{t('noWithdrawals')}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('contactPerson')}</th>
                  <th>{t('month')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('distributions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map(w => (
                  <tr key={w.id}>
                    <td>{w.withdrawal_date}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{w.source_contact_name}</td>
                    <td>{w.month_label || `${t('month')} ${w.month_number}`}</td>
                    <td className="text-accent" style={{ fontWeight: 700 }}>{w.currency} {formatNumber(w.amount)}</td>
                    <td>
                      {w.distributions.map((d, i) => (
                        <div key={i} style={{ fontSize: 'var(--font-size-xs)' }}>
                          {d.contact_name}: {formatNumber(d.amount)} ({d.method === 'bank_transfer' ? t('bankTransfer') : d.method})
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
