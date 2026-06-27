import React, { useState, useEffect } from 'react';
import {
  FaFileAlt,
  FaSearch,
  FaDownload,
  FaCalendarAlt,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaList,
  FaBoxes,
  FaArrowRight
} from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Filters State
  const [tempFilters, setTempFilters] = useState({
    reportType: 'all', // 'all', 'near-expiry', 'expired', 'batch-wise'
    productName: '',
    category: 'all',
    expiryStatus: 'all',
    startDate: '',
    endDate: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({
    reportType: 'all',
    productName: '',
    category: 'all',
    expiryStatus: 'all',
    startDate: '',
    endDate: ''
  });

  // Fetch all batches
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all batches from endpoint
      const res = await API.get('/batches');
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError('Failed to fetch data from the server. Please verify backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Sync Report Type click changes immediately
  const handleReportTypeChange = (type) => {
    let targetStatus = 'all';
    if (type === 'near-expiry') targetStatus = 'Near Expiry';
    if (type === 'expired') targetStatus = 'Expired';

    setTempFilters(prev => ({
      ...prev,
      reportType: type,
      expiryStatus: targetStatus
    }));

    setAppliedFilters(prev => ({
      ...prev,
      reportType: type,
      expiryStatus: targetStatus
    }));
  };

  const handleGenerateReport = (e) => {
    if (e) e.preventDefault();
    setGenerating(true);

    // Simulate generation delay for feedback
    setTimeout(() => {
      setAppliedFilters({ ...tempFilters });
      setGenerating(false);
    }, 400);
  };

  const handleResetFilters = () => {
    const defaults = {
      reportType: 'all',
      productName: '',
      category: 'all',
      expiryStatus: 'all',
      startDate: '',
      endDate: ''
    };
    setTempFilters(defaults);
    setAppliedFilters(defaults);
  };

  // Filter Logic
  const filteredBatches = batches.filter(b => {
    // 1. Product Name filter
    if (appliedFilters.productName) {
      const searchVal = appliedFilters.productName.toLowerCase();
      const matchesName = b.product_name.toLowerCase().includes(searchVal);
      const matchesBatch = b.batch_number && b.batch_number.toLowerCase().includes(searchVal);
      if (!matchesName && !matchesBatch) return false;
    }

    // 1.5. Category filter
    if (appliedFilters.category !== 'all') {
      let cat = b.category;
      if (cat === 'Pickles') cat = 'Dry Pickle';
      if (cat === 'Snacks') cat = 'Home Made Snacks';
      if (cat === 'Ghee') cat = 'Home Made Ghee';
      if (cat !== appliedFilters.category) return false;
    }

    // 2. Expiry Status filter
    if (appliedFilters.expiryStatus !== 'all') {
      if (b.status !== appliedFilters.expiryStatus) return false;
    }

    // 3. Date range filter on expiry_date
    if (appliedFilters.startDate) {
      const start = new Date(appliedFilters.startDate);
      start.setHours(0, 0, 0, 0);
      const exp = new Date(b.expiry_date);
      if (exp < start) return false;
    }
    if (appliedFilters.endDate) {
      const end = new Date(appliedFilters.endDate);
      end.setHours(23, 59, 59, 999);
      const exp = new Date(b.expiry_date);
      if (exp > end) return false;
    }

    return true;
  });

  // Calculate Metrics for Active Filtered Dataset
  const totalBatchesCount = filteredBatches.length;
  const totalStockUnits = filteredBatches.reduce((sum, b) => sum + b.quantity, 0);
  const expiredCount = filteredBatches.filter(b => b.status === 'Expired').length;
  const nearExpiryCount = filteredBatches.filter(b => b.status === 'Near Expiry').length;
  const freshCount = filteredBatches.filter(b => b.status === 'Fresh').length;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Expired':
        return <span className="badge badge-red">Expired</span>;
      case 'Near Expiry':
        return <span className="badge badge-orange">Near Expiry</span>;
      case 'Fresh':
      default:
        return <span className="badge badge-green">Fresh</span>;
    }
  };

  // PDF Export Generation
  const downloadPDFReport = () => {
    setError('');
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header styling
      doc.setFillColor(62, 39, 35); // Dark Brown
      doc.rect(0, 0, pageWidth, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('SHARADHA STORES - SHELF LIFE REMINDER', 14, 16);

      // Document Title
      doc.setTextColor(62, 39, 35);
      doc.setFontSize(12);
      doc.text('EXPIRY RISK & ANALYSIS REPORT', 14, 35);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);

      const reportTypeNames = {
        all: 'List of all products with expiry status',
        'near-expiry': 'Near-expiry products report',
        expired: 'Expired products report',
        'batch-wise': 'Batch-wise expiry report'
      };

      const typeText = reportTypeNames[appliedFilters.reportType] || 'Custom Report';
      doc.text(`Report Type: ${typeText}`, 14, 41);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 47);
      doc.text(`Generated By: ${user?.fullName || 'System Admin'} (${user?.role || 'administrator'})`, 14, 53);

      // Expiry Date Range or Category details
      let summaryY = 60;
      let filterDetails = [];
      if (appliedFilters.category !== 'all') {
        filterDetails.push(`Category: ${appliedFilters.category}`);
      }
      if (appliedFilters.startDate || appliedFilters.endDate) {
        const startStr = appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString() : 'Beginning';
        const endStr = appliedFilters.endDate ? new Date(appliedFilters.endDate).toLocaleDateString() : 'End';
        filterDetails.push(`Expiry: ${startStr} to ${endStr}`);
      }
      if (filterDetails.length > 0) {
        doc.text(filterDetails.join(' | '), 14, 59);
        summaryY = 66;
      }

      // Summary Box Background
      doc.setFillColor(250, 246, 240); // Soft cream
      doc.setDrawColor(238, 222, 197); // Border cream
      doc.rect(14, summaryY, pageWidth - 28, 24, 'FD');

      doc.setTextColor(62, 39, 35);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('REPORT SUMMARY DATA', 18, summaryY + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);

      doc.text(`Total Batches: ${totalBatchesCount}`, 18, summaryY + 14);
      doc.text(`Total Quantity: ${totalStockUnits} Units`, 18, summaryY + 20);

      doc.text(`Expired Batches: ${expiredCount}`, pageWidth / 2 - 20, summaryY + 14);
      doc.text(`Near Expiry: ${nearExpiryCount}`, pageWidth / 2 - 20, summaryY + 20);

      doc.text(`Fresh Batches: ${freshCount}`, pageWidth * 3 / 4 - 20, summaryY + 14);

      // Prepare table data
      const tableHeaders = ['Product Name', 'Category', 'Quantity', 'Batch ID', 'Expiry Date', 'Status'];
      const tableBody = filteredBatches.map(b => [
        b.product_name,
        b.category,
        `${b.quantity} Units`,
        b.batch_number || `B-BATCH-${b.id.toString().padStart(3, '0')}`,
        new Date(b.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        b.status
      ]);

      // Resolve autotable function reference
      const tableFunc = typeof autoTable === 'function' ? autoTable : (autoTable && autoTable.default);
      if (typeof tableFunc !== 'function') {
        throw new Error('autoTable plugin is not a function. Check import layout.');
      }

      // Render Table
      tableFunc(doc, {
        startY: summaryY + 30,
        head: [tableHeaders],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [224, 90, 16], // Primary Orange
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'left' },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.cell.section === 'body') {
            const val = data.cell.raw;
            if (val === 'Expired') {
              data.cell.styles.textColor = [239, 68, 68]; // Red
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Near Expiry') {
              data.cell.styles.textColor = [245, 158, 11]; // Orange
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Fresh') {
              data.cell.styles.textColor = [16, 185, 129]; // Green
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        }
      });

      // Page numbering and disclaimer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);

        // Left side footer
        doc.text(
          `Sharadha Stores Shelf Life System | Page ${i} of ${totalPages}`,
          14,
          doc.internal.pageSize.getHeight() - 10
        );

        // Right side footer
        doc.text(
          'CONFIDENTIAL - OFFICIAL RECORD COPY',
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      const filename = `Sharadha_Stores_${appliedFilters.reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError(`Failed to generate/download PDF report: ${err.message || err}`);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-header-title">Reports & Analytics Engine</h1>
          <p className="page-header-subtitle">Generate custom product expiry reports, filter records, and download PDFs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchReportData}
            disabled={loading}
          >
            <FaSync className={loading ? 'spin-animation' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadPDFReport}
            disabled={loading || filteredBatches.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaDownload />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      {/* Report Type Navigation Tabs */}
      <div className="reports-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '1px', marginBottom: '1.5rem' }}>
        {[
          { id: 'all', label: 'All Products Expiry Status' },
          { id: 'near-expiry', label: 'Near-Expiry Products' },
          { id: 'expired', label: 'Expired Products' },
          { id: 'batch-wise', label: 'Batch-Wise Expiry Details' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleReportTypeChange(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              borderBottom: tempFilters.reportType === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              color: tempFilters.reportType === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: tempFilters.reportType === tab.id ? '700' : '500',
              cursor: 'pointer',
              transition: 'var(--transition)',
              fontSize: '0.9rem',
              outline: 'none',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive Filters Panel */}
      <div className="details-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <form onSubmit={handleGenerateReport}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Filter 1: Product Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Product Name / Batch ID</label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder="Search name or batch..."
                  style={{ width: '100%', paddingLeft: '2.25rem', backgroundColor: 'var(--bg)' }}
                  value={tempFilters.productName}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, productName: e.target.value }))}
                />
              </div>
            </div>

            {/* Filter 1.5: Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category Filter</label>
              <select
                className="form-select"
                style={{ width: '100%', height: '38px' }}
                value={tempFilters.category}
                onChange={(e) => setTempFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                {['Appalam', 'Home Made Snacks', 'Vadam', 'Dry Pickle', 'Home Made Ghee', 'Chips', 'Pickles', 'Sweets', 'Snacks', 'Powders', 'Ready Mixes', 'Ghee'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filter 2: Expiry Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Expiry Status Filter</label>
              <select
                className="form-select"
                style={{ width: '100%', height: '38px', backgroundColor: tempFilters.reportType !== 'all' && tempFilters.reportType !== 'batch-wise' ? 'var(--bg)' : '#ffffff' }}
                value={tempFilters.expiryStatus}
                onChange={(e) => setTempFilters(prev => ({ ...prev, expiryStatus: e.target.value }))}
                disabled={tempFilters.reportType === 'near-expiry' || tempFilters.reportType === 'expired'}
              >
                <option value="all">All Statuses</option>
                <option value="Fresh">Fresh</option>
                <option value="Near Expiry">Near Expiry</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* Filter 3: Expiry Date Start */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Expiry Start Date</label>
              <input
                type="date"
                className="form-select"
                style={{ width: '100%', height: '38px' }}
                value={tempFilters.startDate}
                onChange={(e) => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            {/* Filter 4: Expiry Date End */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Expiry End Date</label>
              <input
                type="date"
                className="form-select"
                style={{ width: '100%', height: '38px' }}
                value={tempFilters.endDate}
                onChange={(e) => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={generating}
              style={{ minWidth: '140px' }}
            >
              <span>{generating ? 'Filtering...' : 'Generate Report'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Summary Metrics Cards for Active Report */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-info">
            <span className="stat-label">Total Batches</span>
            <span className="stat-value">{totalBatchesCount}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FaList />
          </div>
        </div>

        <div className="stat-card success" style={{ cursor: 'default' }}>
          <div className="stat-info">
            <span className="stat-label">Total Stock Units</span>
            <span className="stat-value">{totalStockUnits}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FaBoxes />
          </div>
        </div>

        <div className="stat-card success" style={{ cursor: 'default' }}>
          <div className="stat-info">
            <span className="stat-label">Fresh Batches</span>
            <span className="stat-value">{freshCount}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FaCheckCircle style={{ color: 'var(--success)' }} />
          </div>
        </div>

        <div className="stat-card warning" style={{ cursor: 'default' }}>
          <div className="stat-info">
            <span className="stat-label">Near Expiry</span>
            <span className="stat-value">{nearExpiryCount}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FaExclamationTriangle style={{ color: 'var(--warning)' }} />
          </div>
        </div>

        <div className="stat-card danger" style={{ cursor: 'default' }}>
          <div className="stat-info">
            <span className="stat-label">Expired Batches</span>
            <span className="stat-value">{expiredCount}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FaTimesCircle style={{ color: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      {/* Report Table Display */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Compiling report records...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Batch ID</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Remaining Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--border)' }}>
                        <FaFileAlt />
                      </div>
                      <p style={{ fontWeight: 600 }}>No records found matching current filter specifications.</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Adjust your product name, category, date ranges, or status selections above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => (
                    <tr key={b.id}>
                      <td data-label="Product Name" style={{ fontWeight: 600 }}>{b.product_name}</td>
                      <td data-label="Category">
                        <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                          {b.category}
                        </span>
                      </td>
                      <td data-label="Batch ID">
                        <code style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.2rem 0.4rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px' }}>
                          {b.batch_number || `B-BATCH-${b.id.toString().padStart(3, '0')}`}
                        </code>
                      </td>
                      <td data-label="Quantity" style={{ fontWeight: 700 }}>
                        {b.quantity} Units
                      </td>
                      <td data-label="Expiry Date">{formatDate(b.expiry_date)}</td>
                      <td data-label="Remaining Days">
                        {b.remaining_days < 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expired ({Math.abs(b.remaining_days)}d ago)</span>
                        ) : b.remaining_days === 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expires Today</span>
                        ) : (
                          `${b.remaining_days} days`
                        )}
                      </td>
                      <td data-label="Status">{getStatusBadge(b.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Styles for animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default Reports;
