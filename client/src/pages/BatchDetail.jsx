import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBarcode, FaBox, FaCalendarAlt, FaHourglassHalf, FaInfoCircle } from 'react-icons/fa';
import API from '../services/api';

const BatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBatchDetail = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/batches/${id}`);
        setBatch(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch food batch specifications. It may have been removed or does not exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchBatchDetail();
  }, [id]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Expired':
        return <span className="badge badge-red" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Expired</span>;
      case 'Near Expiry':
        return <span className="badge badge-orange" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Near Expiry</span>;
      case 'Fresh':
      default:
        return <span className="badge badge-green" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Fresh / Safe</span>;
    }
  };

  const getStatusMessage = (status, remainingDays) => {
    if (status === 'Expired') {
      return `This batch expired ${Math.abs(remainingDays)} days ago and is no longer fit for sale. Please remove it from the shelf immediately.`;
    } else if (status === 'Near Expiry') {
      return `This batch is expiring in ${remainingDays} days. Ensure high-priority dispatch and shelf placement according to FEFO strategy.`;
    } else {
      return `This batch is fresh and safe with ${remainingDays} days of remaining shelf life. Keep stored under standard guidelines.`;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Retrieving batch specification sheet...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="details-card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <FaInfoCircle className="no-data-icon" style={{ color: 'var(--danger)' }} />
        <h3 style={{ margin: '1rem 0', fontFamily: 'Outfit, sans-serif' }}>Error Loading Details</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Batch not found.'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/batches')}>
          <FaArrowLeft /> Back to Batches
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/batches')}
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <FaArrowLeft /> Back to Batches
          </button>
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaBarcode style={{ color: 'var(--primary)' }} /> Batch specification: {batch.batch_number}
          </h1>
          <p className="page-header-subtitle">Full record analysis, shelf life monitoring, and expiry details</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Details Panel */}
        <div className="details-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>
                {batch.product_name}
              </h2>
              <span className="badge badge-blue" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Category: {batch.category}
              </span>
            </div>
            <div>
              {getStatusBadge(batch.status)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Batch Identifier
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                {batch.batch_number}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Total Quantity
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                {batch.quantity} Units
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Manufacturing Date
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                {formatDate(batch.manufacturing_date)}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Shelf Life Duration
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                {batch.shelf_life} Days
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Data Entry Source
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                {batch.source || 'Web Dashboard'}
              </span>
            </div>
          </div>

          {batch.batch_details && (
            <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', borderRadius: '0 var(--radius) var(--radius) 0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Batch Details / Notes
              </span>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.5', fontWeight: 500 }}>
                {batch.batch_details}
              </p>
            </div>
          )}

          {batch.quantity <= 15 && (
            <div className={`alert-banner ${batch.quantity === 0 ? 'danger' : 'warning'}`} style={{ padding: '1rem', marginBottom: '1.5rem', borderLeftWidth: '5px' }}>
              <FaInfoCircle className="alert-banner-icon" style={{ fontSize: '1.25rem', marginTop: '2px', color: batch.quantity === 0 ? 'var(--danger)' : 'var(--warning)' }} />
              <div className="alert-banner-content">
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--dark)', marginBottom: '0.2rem' }}>
                  {batch.quantity === 0 ? 'Batch Completely Out of Stock' : 'Low Stock Warning'}
                </strong>
                <span className="alert-banner-message" style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                  {batch.quantity === 0 
                    ? 'Current stock level is 0 units. Please prepare a new batch immediately to resume supply.'
                    : `Current stock level is only ${batch.quantity} units. Consider scheduling a replenishment batch.`
                  }
                </span>
              </div>
            </div>
          )}

          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <FaInfoCircle style={{ fontSize: '1.5rem', color: batch.status === 'Expired' ? 'var(--danger)' : (batch.status === 'Near Expiry' ? 'var(--warning)' : 'var(--primary)') }} />
            <div style={{ fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 500 }}>
              {getStatusMessage(batch.status, batch.remaining_days)}
            </div>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1.25rem' }}>
              Lifespan & Expiry Status History
            </h3>
            <div className="lifecycle-timeline">
              {(() => {
                const mfg = new Date(batch.manufacturing_date);
                const exp = new Date(batch.expiry_date);
                const nearExp = new Date(exp);
                nearExp.setDate(nearExp.getDate() - 5);
                const rem = batch.remaining_days;

                const steps = [
                  {
                    title: 'Batch Prepared & Logged (Fresh)',
                    date: mfg.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    desc: `Batch registered with ${batch.quantity} units under the "${batch.category}" category.`,
                    statusClass: 'completed'
                  },
                  {
                    title: 'Near Expiry Warning Period',
                    date: nearExp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    desc: 'Batch shelf life enters the final 5-day critical buffer. Priority shelving is recommended.',
                    statusClass: rem < 0 ? 'completed' : (rem <= 5 && rem >= 0 ? 'warning-active active' : '')
                  },
                  {
                    title: 'Batch Shelf Life Expired',
                    date: exp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    desc: `Product reaches its calculated shelf life limit of ${batch.shelf_life} days and must be discarded.`,
                    statusClass: rem < 0 ? 'danger-active active' : ''
                  }
                ];

                return steps.map((step, idx) => (
                  <div key={idx} className={`timeline-step ${step.statusClass}`}>
                    <span className="timeline-marker" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span className="timeline-title" style={{ fontWeight: step.statusClass.includes('active') ? 700 : 600 }}>{step.title}</span>
                        <span className="timeline-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.date}</span>
                      </div>
                      <span className="timeline-desc" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step.desc}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Expiry Overview Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Expiry Timeline */}
          <div className="details-card" style={{ borderLeft: `4px solid ${batch.status === 'Expired' ? 'var(--danger)' : (batch.status === 'Near Expiry' ? 'var(--warning)' : 'var(--success)')}` }}>
            <div className="details-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
              <span className="details-title" style={{ fontSize: '0.95rem' }}>
                <FaCalendarAlt /> Expiry Timeline
              </span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dark)', fontFamily: 'Outfit, sans-serif' }}>
                {formatDate(batch.expiry_date)}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Auto-calculated expiry limit date
              </p>
            </div>
          </div>

          {/* Card 2: Remaining Days Indicator */}
          <div className="details-card" style={{ borderLeft: `4px solid ${batch.status === 'Expired' ? 'var(--danger)' : (batch.status === 'Near Expiry' ? 'var(--warning)' : 'var(--success)')}` }}>
            <div className="details-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
              <span className="details-title" style={{ fontSize: '0.95rem' }}>
                <FaHourglassHalf /> Time Remaining
              </span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {batch.remaining_days < 0 ? (
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>
                  {Math.abs(batch.remaining_days)} Days Overdue
                </div>
              ) : batch.remaining_days === 0 ? (
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit, sans-serif' }}>
                  Expires Today
                </div>
              ) : (
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: batch.status === 'Near Expiry' ? 'var(--warning)' : 'var(--success)', fontFamily: 'Outfit, sans-serif' }}>
                  {batch.remaining_days} Days Left
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Remaining safe shelf-life duration
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchDetail;
