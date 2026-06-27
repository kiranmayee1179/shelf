import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaPlus, 
  FaBarcode, 
  FaEdit, 
  FaTrashAlt, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaCalendarAlt, 
  FaBoxes, 
  FaStar,
  FaCheckCircle,
  FaLightbulb,
  FaTag
} from 'react-icons/fa';
import API from '../services/api';
import BatchForm from '../components/BatchForm';

// Static catalog metadata for traditional items
const CATALOG_METADATA = {
  'Plain Appalam': { price: 60, shelfLife: 90, tags: ['Homemade', 'Fresh', 'No Preservatives'], popularity: 5.0 },
  'Masala Appalam': { price: 75, shelfLife: 90, tags: ['Homemade', 'Fresh', 'Spicy', 'No Preservatives'], popularity: 4.5 },
  'Murukku': { price: 120, shelfLife: 45, tags: ['Homemade', 'No Preservatives', 'Fresh', 'Crispy'], popularity: 4.8 },
  'Mixture': { price: 130, shelfLife: 45, tags: ['Homemade', 'No Preservatives', 'Fresh', 'Spicy'], popularity: 4.6 },
  'Chakli': { price: 110, shelfLife: 45, tags: ['Homemade', 'No Preservatives', 'Fresh'], popularity: 4.2 },
  'Rice Vadam': { price: 90, shelfLife: 180, tags: ['Homemade', 'Sun-Dried', 'No Preservatives'], popularity: 4.4 },
  'Color Vadam': { price: 95, shelfLife: 180, tags: ['Homemade', 'Sun-Dried', 'No Preservatives'], popularity: 4.1 },
  'Mango Pickle': { price: 150, shelfLife: 180, tags: ['Homemade', 'Traditional', 'No Preservatives', 'Spicy'], popularity: 4.9 },
  'Lemon Pickle': { price: 140, shelfLife: 180, tags: ['Homemade', 'Traditional', 'No Preservatives'], popularity: 4.3 },
  'Pure Homemade Ghee': { price: 450, shelfLife: 180, tags: ['Homemade', '100% Pure', 'Purity Tag', 'Quality Checked'], popularity: 5.0 },
  'Banana Chips': { price: 100, shelfLife: 30, tags: ['Homemade', 'Fresh', 'Crispy'], popularity: 4.7 },
  'Potato Chips': { price: 90, shelfLife: 30, tags: ['Homemade', 'Fresh', 'Crispy'], popularity: 4.5 }
};

const ProductDetail = () => {
  const { productName } = useParams();
  const decodedProductName = decodeURIComponent(productName);
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const fetchProductBatches = async () => {
    setLoading(true);
    try {
      const res = await API.get('/batches');
      const allBatches = res.data || [];
      
      // Filter batches belonging to this specific product name
      const filtered = allBatches.filter(b => b.product_name === decodedProductName);
      setBatches(filtered);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve product batch details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductBatches();
  }, [decodedProductName]);

  // Catalog item details
  const meta = CATALOG_METADATA[decodedProductName] || {
    price: 100,
    shelfLife: batches.length > 0 ? batches[0].shelf_life : 90,
    tags: ['Homemade', 'Fresh', 'No Preservatives'],
    popularity: 4.0
  };

  // Extract category from batches, or fall back to metadata category mapping
  const getCategory = () => {
    if (batches.length > 0) return batches[0].category;
    // Guess based on naming
    if (decodedProductName.includes('Appalam')) return 'Appalam';
    if (decodedProductName.includes('Vadam')) return 'Vadam';
    if (decodedProductName.includes('Pickle')) return 'Dry Pickle';
    if (decodedProductName.includes('Ghee')) return 'Home Made Ghee';
    if (decodedProductName.includes('Chips')) return 'Chips';
    return 'Home Made Snacks';
  };

  const productCategory = getCategory();

  // Expiry Statistics
  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
  const expiredBatches = batches.filter(b => b.status === 'Expired');
  const nearExpiryBatches = batches.filter(b => b.status === 'Near Expiry');
  const freshBatches = batches.filter(b => b.status === 'Fresh');

  // FEFO Recommendation Logic
  // First Expiry First Out suggests the active batch (stock > 0 and not expired) that has the closest expiry date.
  const getFEFORecommendation = () => {
    const activeWithStock = batches.filter(b => b.quantity > 0 && b.remaining_days >= 0);
    if (activeWithStock.length === 0) return null;
    
    // Sort in ascending order of remaining days (earliest expiry first)
    const sorted = [...activeWithStock].sort((a, b) => a.remaining_days - b.remaining_days);
    return sorted[0];
  };

  const fefoBatch = getFEFORecommendation();

  // Add, Edit, Delete Handlers
  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingBatch) {
        await API.put(`/batches/${editingBatch.id}`, formData);
      } else {
        await API.post('/batches', formData);
      }
      setShowModal(false);
      setEditingBatch(null);
      fetchProductBatches();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save batch details.');
    }
  };

  const handleDelete = async (id, batchNumber) => {
    if (window.confirm(`Are you sure you want to delete batch "${batchNumber}"?`)) {
      try {
        await API.delete(`/batches/${id}`);
        fetchProductBatches();
      } catch (err) {
        console.error(err);
        alert('Failed to delete batch.');
      }
    }
  };

  const openAddModal = () => {
    // We pre-populate the current product name and category
    setEditingBatch({
      product_name: decodedProductName,
      category: productCategory,
      shelf_life: meta.shelfLife,
      quantity: 50,
      source: 'Web Dashboard',
      batch_details: `Preparation batch of ${decodedProductName}`
    });
    setShowModal(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setShowModal(true);
  };

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
        return <span className="badge badge-red">Expired (Critical)</span>;
      case 'Near Expiry':
        return <span className="badge badge-orange">Near Expiry (Warning)</span>;
      case 'Fresh':
      default:
        return <span className="badge badge-green">Fresh / Safe</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/preserved-foods')}
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <FaArrowLeft /> Back to Preserved Foods
          </button>
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaBoxes style={{ color: 'var(--primary)' }} /> {decodedProductName}
          </h1>
          <p className="page-header-subtitle">Batch list and FEFO tracking details for {decodedProductName}</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <FaPlus />
          <span>Add Batch</span>
        </button>
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      {/* Main Details and Side Stats */}
      <div className="product-details-grid-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Batch Table and FEFO suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* FEFO Suggestion Banner */}
          {fefoBatch ? (
            <div className="fefo-banner">
              <div className="fefo-banner-icon-wrapper">
                <FaLightbulb />
              </div>
              <div className="fefo-banner-content">
                <h3>FEFO Recommendation (First Expiry First Out)</h3>
                <p>
                  To minimize shelf waste, prioritize dispatching/selling <strong>Batch {fefoBatch.batch_number || `B-BATCH-${fefoBatch.id.toString().padStart(3, '0')}`}</strong>. 
                  It has the closest expiry date of <strong>{formatDate(fefoBatch.expiry_date)}</strong> ({fefoBatch.remaining_days === 0 ? 'expires today' : `expires in ${fefoBatch.remaining_days} days`}) and has <strong>{fefoBatch.quantity}</strong> units in stock.
                </p>
              </div>
            </div>
          ) : (
            batches.length > 0 && totalStock > 0 && (
              <div className="fefo-banner expired">
                <div className="fefo-banner-icon-wrapper">
                  <FaExclamationTriangle />
                </div>
                <div className="fefo-banner-content">
                  <h3>All Batches Expired or Empty</h3>
                  <p>There are no fresh or near-expiry batches with stock left. Please register a new batch immediately.</p>
                </div>
              </div>
            )
          )}

          {/* Batches Table Card */}
          <div className="details-card" style={{ padding: '1.5rem' }}>
            <div className="details-header" style={{ marginBottom: '1.5rem' }}>
              <span className="details-title"><FaBarcode /> Batch Inventory Matrix</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Fetching product batches...</p>
              </div>
            ) : batches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <FaBarcode style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--border)' }} />
                <p style={{ fontWeight: 600 }}>No batches recorded for this product.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click "Add Batch" in the top right to log a batch preparation.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table product-batch-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Quantity</th>
                      <th>Mfg Date</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => {
                      const isFefo = fefoBatch && fefoBatch.id === b.id;
                      return (
                        <tr 
                          key={b.id}
                          className={`${b.status === 'Expired' ? 'batch-row-expired' : b.status === 'Near Expiry' ? 'batch-row-warning' : ''} ${isFefo ? 'batch-row-fefo' : ''}`}
                        >
                          <td data-label="Batch ID">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <code className="batch-code-style">
                                {b.batch_number || `B-BATCH-${b.id.toString().padStart(3, '0')}`}
                              </code>
                              {isFefo && (
                                <span className="fefo-row-pill" title="FEFO Priority Batch">FEFO</span>
                              )}
                            </div>
                          </td>
                          <td data-label="Quantity" style={{ fontWeight: 700 }}>
                            {b.quantity} Units
                          </td>
                          <td data-label="Mfg Date">{formatDate(b.manufacturing_date)}</td>
                          <td data-label="Expiry Date">{formatDate(b.expiry_date)}</td>
                          <td data-label="Days Left">
                            {b.remaining_days < 0 ? (
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expired ({Math.abs(b.remaining_days)}d ago)</span>
                            ) : b.remaining_days === 0 ? (
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Expires Today</span>
                            ) : (
                              `${b.remaining_days} days`
                            )}
                          </td>
                          <td data-label="Status">
                            {getStatusBadge(b.status)}
                          </td>
                          <td data-label="Actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-secondary btn-icon-only" 
                              onClick={() => openEditModal(b)}
                              title="Edit Batch"
                            >
                              <FaEdit style={{ color: 'var(--primary)' }} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-icon-only" 
                              onClick={() => handleDelete(b.id, b.batch_number)}
                              title="Delete Batch"
                            >
                              <FaTrashAlt style={{ color: 'var(--danger)' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Product Details & Expiry Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Product Specs */}
          <div className="details-card">
            <div className="details-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
              <span className="details-title" style={{ fontSize: '0.95rem' }}><FaTag /> Product Profile</span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit, sans-serif' }}>
                ₹{meta.price}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Suggested retail price per unit
              </p>
              
              <div style={{ marginTop: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{productCategory}</span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Default Shelf Life</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{meta.shelfLife} Days</span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {meta.tags.map((t, idx) => (
                    <span key={idx} className="product-card-tag" style={{ fontSize: '0.65rem' }}>{t}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ display: 'flex', color: '#fbbf24' }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <FaStar 
                      key={idx} 
                      style={{ 
                        opacity: idx < Math.floor(meta.popularity) ? 1 : 0.35, 
                        fontSize: '0.8rem' 
                      }} 
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>({meta.popularity.toFixed(1)})</span>
              </div>
            </div>
          </div>

          {/* Card 2: Batch Inventory Summary */}
          <div className="details-card">
            <div className="details-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
              <span className="details-title" style={{ fontSize: '0.95rem' }}><FaBoxes /> Batch Summary</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Total Quantity</span>
                <strong style={{ color: 'var(--dark)' }}>{totalStock} Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Active Batches</span>
                <strong style={{ color: 'var(--dark)' }}>{batches.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Fresh Batches</span>
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{freshBatches.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Near Expiry Batches</span>
                <span className="badge badge-orange" style={{ fontSize: '0.7rem' }}>{nearExpiryBatches.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Expired Batches</span>
                <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{expiredBatches.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{editingBatch?.id ? 'Edit Batch' : 'Register New Batch'}</span>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <BatchForm 
                batch={editingBatch} 
                onSubmit={handleCreateOrUpdate} 
                onCancel={() => setShowModal(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Styled styles for Product Detail page styling */}
      <style>{`
        .batch-code-style {
          font-size: 0.85rem;
          font-weight: bold;
          padding: 0.2rem 0.4rem;
          background-color: var(--primary-light);
          color: var(--primary);
          border-radius: 4px;
        }

        .fefo-banner {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-left: 5px solid #22c55e;
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          box-shadow: var(--shadow-sm);
        }

        .fefo-banner.expired {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-left: 5px solid #ef4444;
        }

        .fefo-banner-icon-wrapper {
          background-color: #dcfce7;
          color: #15803d;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .fefo-banner.expired .fefo-banner-icon-wrapper {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .fefo-banner-content h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 0.25rem;
        }

        .fefo-banner-content p {
          font-size: 0.85rem;
          color: var(--text);
          line-height: 1.5;
        }

        .product-batch-table tbody tr.batch-row-expired {
          background-color: rgba(239, 68, 68, 0.03);
        }

        .product-batch-table tbody tr.batch-row-expired:hover {
          background-color: rgba(239, 68, 68, 0.08);
        }

        .product-batch-table tbody tr.batch-row-warning {
          background-color: rgba(245, 158, 11, 0.02);
        }

        .product-batch-table tbody tr.batch-row-warning:hover {
          background-color: rgba(245, 158, 11, 0.07);
        }

        .product-batch-table tbody tr.batch-row-fefo {
          background-color: rgba(34, 197, 94, 0.02);
          border-left: 3px solid #22c55e;
        }

        .product-batch-table tbody tr.batch-row-fefo:hover {
          background-color: rgba(34, 197, 94, 0.08);
        }

        .fefo-row-pill {
          background-color: #22c55e;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;
