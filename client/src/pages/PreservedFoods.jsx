import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaSortAmountDown, 
  FaStar, 
  FaCalendarAlt, 
  FaTag, 
  FaBoxes, 
  FaExclamationTriangle, 
  FaTimesCircle, 
  FaChevronRight,
  FaFire
} from 'react-icons/fa';
import API from '../services/api';

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

const PreservedFoods = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity' | 'expiry'

  const categories = [
    'Trending',
    'Appalam',
    'Home Made Snacks',
    'Vadam',
    'Dry Pickle',
    'Home Made Ghee',
    'Chips'
  ];

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const res = await API.get('/batches');
        setBatches(res.data || []);
      } catch (err) {
        console.error('Failed to fetch batches:', err);
        setError('Failed to fetch batches from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  // Process batches to roll them up to unique product records
  const getProductRollups = () => {
    const productsMap = {};

    batches.forEach(b => {
      // Group only for traditional preserved foods categories
      const normalizedCategory = b.category;
      if (!categories.includes(normalizedCategory) && normalizedCategory !== 'Ghee' && normalizedCategory !== 'Snacks' && normalizedCategory !== 'Pickles') {
        // Skip categories that are not traditional/preserved
        return;
      }

      // Map back old/different categories to new menu titles if needed
      let displayCategory = normalizedCategory;
      if (normalizedCategory === 'Pickles') displayCategory = 'Dry Pickle';
      if (normalizedCategory === 'Snacks') displayCategory = 'Home Made Snacks';
      if (normalizedCategory === 'Ghee') displayCategory = 'Home Made Ghee';

      const key = `${b.product_name}::${displayCategory}`;

      if (!productsMap[key]) {
        // Find metadata or default it
        const meta = CATALOG_METADATA[b.product_name] || {
          price: 100,
          shelfLife: b.shelf_life || 90,
          tags: ['Homemade', 'Fresh', 'No Preservatives'],
          popularity: 4.0
        };

        productsMap[key] = {
          name: b.product_name,
          category: displayCategory,
          price: meta.price,
          shelfLife: meta.shelfLife,
          tags: meta.tags,
          popularity: meta.popularity,
          batches: []
        };
      }

      productsMap[key].batches.push(b);
    });

    // Finalize rollup details for each product
    return Object.values(productsMap).map(product => {
      const activeBatches = product.batches.filter(b => b.quantity > 0);
      
      // Calculate total stock
      const totalStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
      
      // Status flags
      const hasExpired = product.batches.some(b => b.status === 'Expired');
      const hasNearExpiry = product.batches.some(b => b.status === 'Near Expiry');
      
      // Earliest expiry date
      let nextExpiryDate = null;
      let nextExpiryDaysLeft = Infinity;
      
      activeBatches.forEach(b => {
        if (b.remaining_days < nextExpiryDaysLeft) {
          nextExpiryDaysLeft = b.remaining_days;
          nextExpiryDate = b.expiry_date;
        }
      });

      return {
        ...product,
        totalStock,
        batchCount: product.batches.length,
        hasExpired,
        hasNearExpiry,
        nextExpiryDate,
        nextExpiryDaysLeft: nextExpiryDaysLeft === Infinity ? null : nextExpiryDaysLeft
      };
    });
  };

  const productRollups = getProductRollups();

  // Filter products by selected category and search query
  const filteredProducts = productRollups.filter(product => {
    // 1. Category Filter
    if (selectedCategory !== 'Trending') {
      if (product.category !== selectedCategory) return false;
    } else {
      // Trending: show products with high popularity >= 4.5
      if (product.popularity < 4.5) return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = product.name.toLowerCase().includes(q);
      const categoryMatch = product.category.toLowerCase().includes(q);
      const tagMatch = product.tags.some(t => t.toLowerCase().includes(q));
      if (!nameMatch && !categoryMatch && !tagMatch) return false;
    }

    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'popularity') {
      return b.popularity - a.popularity;
    } else if (sortBy === 'expiry') {
      // Products with no expiry date go to the end
      const daysA = a.nextExpiryDaysLeft !== null ? a.nextExpiryDaysLeft : Infinity;
      const daysB = b.nextExpiryDaysLeft !== null ? b.nextExpiryDaysLeft : Infinity;
      return daysA - daysB;
    }
    return 0;
  });

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Trending': return <FaFire style={{ color: '#ef4444' }} />;
      default: return <FaTag style={{ color: 'var(--primary)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-header-title" style={{ fontFamily: 'Outfit, sans-serif' }}>Traditional Preserved Foods</h1>
          <p className="page-header-subtitle">Freshly prepared, zero-preservatives store items grouped by batch details and FEFO suggestions</p>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <div className="alert-banner-message">{error}</div>
        </div>
      )}

      {/* Main Grid: Sidebar Menu + Product List */}
      <div className="preserved-container">
        
        {/* Category Menu: Sidebar on Desktop, Dropdown on Mobile */}
        <aside className="preserved-sidebar">
          <div className="preserved-sidebar-header">
            <h3>Categories</h3>
          </div>
          <ul className="preserved-sidebar-menu">
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => setSelectedCategory(cat)}
                  className={`preserved-sidebar-item ${selectedCategory === cat ? 'active' : ''}`}
                >
                  <span className="category-item-icon-wrapper">
                    {getCategoryIcon(cat)}
                  </span>
                  <span className="category-item-name">{cat}</span>
                  <FaChevronRight className="category-chevron" />
                </button>
              </li>
            ))}
          </ul>

          {/* Mobile responsive dropdown menu */}
          <div className="preserved-mobile-menu">
            <label htmlFor="mobile-category-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
              Select Food Category
            </label>
            <select
              id="mobile-category-select"
              className="form-select"
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Product Display Area */}
        <div className="preserved-list-area">
          {/* Controls Bar */}
          <div className="table-actions-bar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
            {/* Search */}
            <div className="navbar-search" style={{ maxWidth: '360px', flexGrow: 1 }}>
              <FaSearch className="navbar-search-icon" />
              <input 
                type="text" 
                className="navbar-search-input" 
                placeholder="Search name, tags or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sorting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <FaSortAmountDown /> Sort:
              </span>
              <select
                className="form-select"
                style={{ padding: '0.4rem 2rem 0.4rem 1rem', height: '36px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popularity">Popularity (High-Low)</option>
                <option value="expiry">Soonest Expiry First</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', width: '100%' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Retrieving delicious catalog products...</p>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="details-card" style={{ padding: '4rem', textAlign: 'center', width: '100%' }}>
              <FaBoxes className="no-data-icon" style={{ fontSize: '3rem', color: 'var(--border)' }} />
              <h3 style={{ marginTop: '1rem', fontFamily: 'Outfit, sans-serif' }}>No Products Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                No active food items match the selected filters or search queries.
              </p>
            </div>
          ) : (
            <div className="preserved-grid">
              {sortedProducts.map((p) => (
                <div 
                  key={p.name} 
                  className={`preserved-card ${p.hasExpired ? 'expired-border' : p.hasNearExpiry ? 'warning-border' : ''}`}
                  onClick={() => navigate(`/preserved-foods/product/${encodeURIComponent(p.name)}`)}
                >
                  {/* Status Flags on top */}
                  <div className="preserved-card-badges">
                    {p.hasExpired && (
                      <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FaTimesCircle /> EXPIRED BATCH
                      </span>
                    )}
                    {!p.hasExpired && p.hasNearExpiry && (
                      <span className="badge badge-orange" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FaExclamationTriangle /> NEAR EXPIRY
                      </span>
                    )}
                  </div>

                  <div className="preserved-card-body">
                    <span className="product-card-category">{p.category}</span>
                    <h3 className="product-card-title">{p.name}</h3>

                    {/* Price and Shelf Life info */}
                    <div className="product-card-pricing">
                      <span className="product-card-price">₹{p.price}</span>
                      <span className="product-card-shelf-life">Shelf Life: {p.shelfLife}d</span>
                    </div>

                    {/* Tags */}
                    <div className="product-card-tags">
                      {p.tags.map((t, i) => (
                        <span key={i} className="product-card-tag">{t}</span>
                      ))}
                    </div>

                    {/* Popularity Stars */}
                    <div className="product-card-popularity" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', color: '#fbbf24' }}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <FaStar 
                            key={idx} 
                            style={{ 
                              opacity: idx < Math.floor(p.popularity) ? 1 : 0.35, 
                              fontSize: '0.85rem' 
                            }} 
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>({p.popularity.toFixed(1)})</span>
                    </div>
                  </div>

                  {/* Card Footer containing Batch Summary */}
                  <div className="preserved-card-footer">
                    <span className="footer-batch-count">
                      <strong>{p.batchCount}</strong> {p.batchCount === 1 ? 'Batch' : 'Batches'}
                    </span>
                    <span className="footer-total-stock">
                      Stock: <strong>{p.totalStock}</strong> units
                    </span>
                  </div>

                  {/* Expiry summary */}
                  {p.nextExpiryDate && (
                    <div className="preserved-card-expiry-alert" style={{
                      backgroundColor: p.hasExpired ? 'var(--danger-bg)' : p.hasNearExpiry ? 'var(--warning-bg)' : 'var(--success-bg)',
                      color: p.hasExpired ? 'var(--danger)' : p.hasNearExpiry ? 'var(--warning)' : 'var(--success)'
                    }}>
                      <FaCalendarAlt style={{ fontSize: '0.75rem' }} />
                      <span>
                        {p.nextExpiryDaysLeft < 0 ? (
                          `Expired ${Math.abs(p.nextExpiryDaysLeft)}d ago`
                        ) : p.nextExpiryDaysLeft === 0 ? (
                          'Expires Today'
                        ) : (
                          `Next Expiry: ${p.nextExpiryDaysLeft}d`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Styled styles specific to Preserved Foods layout */}
      <style>{`
        .preserved-container {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .preserved-sidebar {
          background-color: var(--card-bg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
        }

        .preserved-sidebar-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        }

        .preserved-sidebar-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--dark);
        }

        .preserved-sidebar-menu {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .preserved-sidebar-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius);
          border: none;
          background: none;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }

        .preserved-sidebar-item:hover {
          background-color: var(--primary-light);
        }

        .preserved-sidebar-item.active {
          background-color: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(224, 90, 16, 0.25);
        }

        .category-item-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: var(--transition);
        }

        .preserved-sidebar-item.active .category-item-icon-wrapper svg {
          color: #ffffff !important;
        }

        .category-item-name {
          flex-grow: 1;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .category-chevron {
          font-size: 0.75rem;
          opacity: 0.6;
          transition: var(--transition);
        }

        .preserved-sidebar-item:hover .category-chevron {
          transform: translateX(3px);
        }

        .preserved-sidebar-item.active .category-chevron {
          color: #ffffff;
          opacity: 1;
          transform: translateX(3px);
        }

        .preserved-mobile-menu {
          display: none;
        }

        .preserved-list-area {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .preserved-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .preserved-card {
          background-color: var(--card-bg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .preserved-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
        }

        .preserved-card.expired-border {
          border-left: 5px solid var(--danger);
        }

        .preserved-card.warning-border {
          border-left: 5px solid var(--warning);
        }

        .preserved-card-badges {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 10;
        }

        .preserved-card-body {
          padding: 1.5rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .product-card-category {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .product-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--dark);
          line-height: 1.3;
          margin-bottom: 0.5rem;
        }

        .product-card-pricing {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.5rem 0;
        }

        .product-card-price {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .product-card-shelf-life {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          background-color: var(--bg);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .product-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.75rem;
        }

        .product-card-tag {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--primary);
          background-color: var(--primary-light);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }

        .preserved-card-footer {
          display: flex;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          font-size: 0.8rem;
          background-color: #fafbfc;
          color: var(--text-muted);
        }

        .preserved-card-expiry-alert {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        @media (max-width: 900px) {
          .preserved-container {
            grid-template-columns: 1fr;
          }

          .preserved-sidebar {
            display: none;
          }

          .preserved-mobile-menu {
            display: block;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PreservedFoods;
