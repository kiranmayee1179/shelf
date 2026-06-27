import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrashAlt, FaBarcode, FaEye } from 'react-icons/fa';
import API from '../services/api';
import BatchForm from '../components/BatchForm';

const Batches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const fetchBatches = async (term = '') => {
    setLoading(true);
    try {
      const res = await API.get(`/batches?search=${encodeURIComponent(term)}`);
      setBatches(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not fetch production batches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches(search);
  }, [search]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingBatch) {
        // Edit batch
        await API.put(`/batches/${editingBatch.id}`, formData);
      } else {
        // Create batch
        await API.post('/batches', formData);
      }
      setShowModal(false);
      setEditingBatch(null);
      fetchBatches(search);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save batch details.');
    }
  };

  const handleDelete = async (id, batchNumber) => {
    if (window.confirm(`Are you sure you want to delete batch "${batchNumber}"?`)) {
      try {
        await API.delete(`/batches/${id}`);
        fetchBatches(search);
      } catch (err) {
        console.error(err);
        alert('Failed to delete batch.');
      }
    }
  };

  const openAddModal = () => {
    setEditingBatch(null);
    setShowModal(true);
  };

  const openEditModal = (e, batch) => {
    e.stopPropagation(); // prevent row click navigation
    setEditingBatch(batch);
    setShowModal(true);
  };

  const handleDeleteClick = (e, id, batchNumber) => {
    e.stopPropagation(); // prevent row click navigation
    handleDelete(id, batchNumber);
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
        return <span className="badge badge-red">Expired</span>;
      case 'Near Expiry':
        return <span className="badge badge-orange">Near Expiry</span>;
      case 'Fresh':
      default:
        return <span className="badge badge-green">Fresh</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Stock-by-Batch Table</h1>
          <p className="page-header-subtitle">Record and review homemade food batches, shelf life timelines, and expiry risks</p>
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

      {/* Filters Bar */}
      <div className="table-actions-bar">
        <div className="navbar-search" style={{ width: '320px' }}>
          <FaSearch className="navbar-search-icon" />
          <input 
            type="text" 
            className="navbar-search-input" 
            placeholder="Search product name, category or batch..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Fetching production batches...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Manufacturing Date</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-data">
                      <FaBarcode className="no-data-icon" />
                      <p>No batches registered yet. Click "Add Batch" to record product preparation.</p>
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr 
                      key={b.id} 
                      onClick={() => navigate(`/batches/${b.id}`)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full batch details"
                    >
                      <td data-label="Batch Number">
                        <code style={{ fontSize: '0.9rem', fontWeight: 'bold', padding: '0.2rem 0.4rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px' }}>
                          {b.batch_number}
                        </code>
                      </td>
                      <td data-label="Product Name" style={{ fontWeight: 600 }}>{b.product_name}</td>
                      <td data-label="Category">
                        <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                          {b.category}
                        </span>
                      </td>
                      <td data-label="Quantity" style={{ fontWeight: 700 }}>
                        {b.quantity} Units
                      </td>
                      <td data-label="Manufacturing Date">{formatDate(b.manufacturing_date)}</td>
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
                      <td data-label="Status">{getStatusBadge(b.status)}</td>
                      <td data-label="Actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/batches/${b.id}`);
                          }}
                          title="View Full Batch Specifications"
                        >
                          <FaEye style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only" 
                          onClick={(e) => openEditModal(e, b)}
                          title="Edit Batch Specifications"
                        >
                          <FaEdit style={{ color: 'var(--primary)' }} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon-only" 
                          onClick={(e) => handleDeleteClick(e, b.id, b.batch_number)}
                          title="Delete Batch"
                        >
                          <FaTrashAlt style={{ color: 'var(--danger)' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{editingBatch ? 'Edit Batch' : 'Register New Batch'}</span>
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
    </div>
  );
};

export default Batches;
