import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Fish, Weight, Ruler, Search } from 'lucide-react';
import './RecentCatchesPanel.css';

export default function RecentCatchesPanel({ onCatchSelect }) {
  const [recentCatches, setRecentCatches] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentCatches();
  }, []);

  const fetchRecentCatches = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/recent-fish-catches?query=${query}`);
      if (!response.ok) throw new Error('Failed to fetch recent catches');
      const data = await response.json();
      setRecentCatches(data);
    } catch (error) {
      console.error('Error fetching recent catches:', error);
      setError('Failed to fetch recent catches. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    fetchRecentCatches(e.target.value);
  };

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`${styles.panel} ${isExpanded ? styles.expanded : styles.minimized}`}>
      <div className={styles.header} onClick={togglePanel}>
        <h2>Recent Catches</h2>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="Search by fish name or rarity..."
          value={searchQuery}
          onChange={handleSearch}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loader}></div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : recentCatches.length === 0 ? (
          <div className={styles.noResults}>No fish catches found.</div>
        ) : (
          <ul className={styles.catchList}>
            {recentCatches.map((fishCatch) => (
              <li key={fishCatch._id} className={styles.catchItem} onClick={() => onCatchSelect(fishCatch)}>
                <div className={styles.catchHeader}>
                  <Fish className={styles.fishIcon} style={{ color: getFishColor(fishCatch.rarityScore) }} />
                  <h3>{fishCatch.fishName}</h3>
                </div>
                <div className={styles.catchInfo}>
                  <p className={styles.catchDate}>{format(new Date(fishCatch.dateCaught), 'MMM dd, yyyy HH:mm')}</p>
                  <div className={styles.rarityBar}>
                    <div 
                      className={styles.rarityFill} 
                      style={{ width: `${fishCatch.rarityScore * 10}%` }}
                    ></div>
                  </div>
                  <div className={styles.catchDetails}>
                    <span><Weight size={16} /> {fishCatch.weight}g</span>
                    <span><Ruler size={16} /> {fishCatch.length}cm</span>
                    <span>Rarity: {fishCatch.rarityScore}/10</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const getFishColor = (rarityScore) => {
  const hue = 200 - (rarityScore * 20); // Blue (200) to Red (0)
  return `hsl(${hue}, 100%, 50%)`;
};


