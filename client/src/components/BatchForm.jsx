import React, { useState, useEffect } from 'react';

const BatchForm = ({ batch, onSubmit, onCancel }) => {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [quantity, setQuantity] = useState('');
  const [source, setSource] = useState('Web Dashboard');
  const [batchDetails, setBatchDetails] = useState('');
  
  // Real-time calculation state
  const [remainingDays, setRemainingDays] = useState(null);
  const [calculatedStatus, setCalculatedStatus] = useState('');
  const [error, setError] = useState('');

  // Standard category list for Sharadha Stores
  const categories = ['Appalam', 'Home Made Snacks', 'Vadam', 'Dry Pickle', 'Home Made Ghee', 'Chips', 'Pickles', 'Sweets', 'Snacks', 'Powders', 'Ready Mixes', 'Ghee'];
  // Source entry options
  const sources = ['Web Dashboard', 'Mobile Terminal', 'Kitchen Unit', 'Supplier Portal', 'Other API'];

  useEffect(() => {
    if (batch) {
      setProductName(batch.product_name || '');
      setCategory(batch.category || '');
      
      const dateVal = batch.manufacturing_date || batch.prepared_date;
      if (dateVal) {
        const d = new Date(dateVal);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setMfgDate(`${yyyy}-${mm}-${dd}`);
      }

      const expVal = batch.expiry_date;
      if (expVal) {
        const d = new Date(expVal);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setExpiryDate(`${yyyy}-${mm}-${dd}`);
      }

      setShelfLife(batch.shelf_life !== undefined ? batch.shelf_life : '');
      setQuantity(batch.quantity !== undefined ? batch.quantity : (batch.quantity_produced || ''));
      setSource(batch.source || 'Web Dashboard');
      setBatchDetails(batch.batch_details || '');
    } else {
      setProductName('');
      setCategory('');
      setMfgDate('');
      setExpiryDate('');
      setShelfLife('');
      setQuantity('');
      setSource('Web Dashboard');
      setBatchDetails('');
      setRemainingDays(null);
      setCalculatedStatus('');
    }
  }, [batch]);

  // Reactive updates for remaining days & status based on dates
  useEffect(() => {
    if (expiryDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const exp = new Date(expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp - now;
      const rem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setRemainingDays(rem);

      if (rem < 0) {
        setCalculatedStatus('Expired');
      } else if (rem <= 5) {
        setCalculatedStatus('Near Expiry');
      } else {
        setCalculatedStatus('Fresh');
      }
    } else {
      setRemainingDays(null);
      setCalculatedStatus('');
    }
  }, [expiryDate]);

  // Reactive updates: Manufacturing Date & Shelf Life -> Expiry Date
  const handleMfgDateChange = (val) => {
    setMfgDate(val);
    if (val && shelfLife) {
      const slVal = parseInt(shelfLife);
      if (!isNaN(slVal) && slVal > 0) {
        const mfg = new Date(val);
        const exp = new Date(mfg);
        exp.setDate(exp.getDate() + slVal);
        setExpiryDate(exp.toISOString().split('T')[0]);
      }
    }
  };

  const handleShelfLifeChange = (val) => {
    setShelfLife(val);
    if (mfgDate && val) {
      const slVal = parseInt(val);
      if (!isNaN(slVal) && slVal > 0) {
        const mfg = new Date(mfgDate);
        const exp = new Date(mfg);
        exp.setDate(exp.getDate() + slVal);
        setExpiryDate(exp.toISOString().split('T')[0]);
      }
    }
  };

  // Reactive updates: Expiry Date -> Shelf Life
  const handleExpiryDateChange = (val) => {
    setExpiryDate(val);
    if (mfgDate && val) {
      const mfg = new Date(mfgDate);
      const exp = new Date(val);
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
        const diffTime = exp - mfg;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setShelfLife(diffDays >= 0 ? diffDays : 0);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!productName.trim()) return setError('Product Name is required.');
    if (!category) return setError('Category is required.');
    if (!mfgDate) return setError('Manufacturing Date is required.');
    if (!expiryDate) return setError('Expiry Date is required.');
    
    const mfg = new Date(mfgDate);
    const exp = new Date(expiryDate);
    if (exp < mfg) {
      return setError('Expiry Date cannot be before Manufacturing Date.');
    }

    const slVal = parseInt(shelfLife);
    if (isNaN(slVal) || slVal < 0) {
      return setError('Calculated Shelf Life must be a non-negative number.');
    }

    const qtyVal = parseInt(quantity);
    if (isNaN(qtyVal) || qtyVal < 0) {
      return setError('Quantity must be a non-negative integer.');
    }

    onSubmit({
      product_name: productName.trim(),
      category: category,
      manufacturing_date: mfgDate,
      expiry_date: expiryDate,
      shelf_life: slVal,
      quantity: qtyVal,
      source,
      batch_details: batchDetails.trim()
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Expired':
        return 'var(--danger)';
      case 'Near Expiry':
        return 'var(--warning)';
      case 'Fresh':
      default:
        return 'var(--success)';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="alert-banner danger" style={{ margin: '0 0 1rem 0', padding: '0.75rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="batch-product-name">Product Name *</label>
        <input 
          id="batch-product-name"
          type="text" 
          className="form-input" 
          value={productName} 
          onChange={(e) => setProductName(e.target.value)} 
          placeholder="e.g. Special Mango Pickle"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="batch-category">Category *</label>
          <select 
            id="batch-category"
            className="form-select" 
            style={{ width: '100%' }}
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="batch-source">Data Source *</label>
          <select 
            id="batch-source"
            className="form-select" 
            style={{ width: '100%' }}
            value={source} 
            onChange={(e) => setSource(e.target.value)}
            required
          >
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="batch-qty">Quantity *</label>
          <input 
            id="batch-qty"
            type="number" 
            className="form-input" 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value)} 
            placeholder="e.g. 50"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="batch-shelf-life">Shelf Life (Days) *</label>
          <input 
            id="batch-shelf-life"
            type="number" 
            className="form-input" 
            value={shelfLife} 
            onChange={(e) => handleShelfLifeChange(e.target.value)} 
            placeholder="e.g. 180"
            min="0"
            required
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="batch-mfg">Manufacturing Date *</label>
          <input 
            id="batch-mfg"
            type="date" 
            className="form-input" 
            value={mfgDate} 
            onChange={(e) => handleMfgDateChange(e.target.value)} 
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="batch-expiry">Expiry Date *</label>
          <input 
            id="batch-expiry"
            type="date" 
            className="form-input" 
            value={expiryDate} 
            onChange={(e) => handleExpiryDateChange(e.target.value)} 
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="batch-details">Batch Details / Notes</label>
        <textarea 
          id="batch-details"
          className="form-input" 
          style={{ height: '70px', resize: 'none', padding: '0.5rem 0.75rem' }}
          value={batchDetails} 
          onChange={(e) => setBatchDetails(e.target.value)} 
          placeholder="e.g. Morning preparation slot, stored on main shelf Section B."
        />
      </div>

      {expiryDate && (
        <div className="alert-banner info" style={{ padding: '0.75rem', marginBottom: '1.25rem', borderLeftColor: 'var(--primary)' }}>
          <div className="alert-banner-message" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div>
              <strong>Calculated Time Remaining:</strong> {remainingDays < 0 ? (
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Expired ({Math.abs(remainingDays)} days ago)</span>
              ) : remainingDays === 0 ? (
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Expires Today</span>
              ) : (
                <span>{remainingDays} days</span>
              )}
            </div>
            <div>
              <strong>Shelf Classification:</strong> <span style={{ color: getStatusColor(calculatedStatus), fontWeight: 'bold' }}>{calculatedStatus}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">{batch ? 'Update Batch' : 'Add Batch'}</button>
      </div>
    </form>
  );
};

export default BatchForm;
