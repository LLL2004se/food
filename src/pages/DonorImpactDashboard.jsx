import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DonorImpactDashboard = ({ auth }) => {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchImpactStats();
  }, []);

  const fetchImpactStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/donor/impact-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setImpact(response.data);
    } catch (err) {
      console.error('Error fetching impact stats:', err);
      setError('Failed to load impact data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading your impact...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!impact) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>No impact data available yet. Start donating to see your impact!</p>
      </div>
    );
  }

  const stats = impact.stats || {};

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5em', marginBottom: '10px' }}>Your Impact</h1>
        <p style={{ fontSize: '1.1em', color: '#7f8c8d' }}>
          Thank you for making a difference! Here's what you've accomplished.
        </p>
      </div>

      {/* Impact Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {/* Total Donations */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.totalDonations || 0}
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>Total Donations</div>
        </div>

        {/* Total Meals */}
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.totalMeals || 0}
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>Meals Donated</div>
        </div>

        {/* People Served */}
        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.completedMeals || 0}
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>People Served</div>
        </div>

        {/* NGOs Helped */}
        <div style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(67, 233, 123, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.ngosHelped || 0}
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>NGOs Helped</div>
        </div>

        {/* Completed Donations */}
        <div style={{
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(250, 112, 154, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.completedDonations || 0}
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>Delivered</div>
        </div>

        {/* Carbon Saved */}
        <div style={{
          background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(48, 207, 208, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
            {stats.carbonSavedKg || 0}kg
          </div>
          <div style={{ fontSize: '1em', opacity: 0.9 }}>CO₂ Saved</div>
        </div>
      </div>

      {/* Achievements Section */}
      <div style={{
        background: '#f8f9fa',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '40px'
      }}>
        <h2 style={{ fontSize: '1.8em', marginBottom: '20px' }}>Achievements</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {/* Donor Badge */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #3498db',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>⭐</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Food Donor</div>
            <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>Active since {stats.daysSinceDonating || 0} days</div>
          </div>

          {/* Impact Champion - Show if helped 3+ NGOs */}
          {(stats.ngosHelped || 0) >= 3 && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #f39c12',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>🏆</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Impact Champion</div>
              <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>Helping multiple organizations</div>
            </div>
          )}

          {/* Green Hero - Show if saved 50kg+ CO2 */}
          {(stats.carbonSavedKg || 0) >= 50 && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #27ae60',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>🌱</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Green Hero</div>
              <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>Significant environmental impact</div>
            </div>
          )}

          {/* Generous Soul - Show if donated 100+ meals */}
          {(stats.totalMeals || 0) >= 100 && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #e74c3c',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>❤️</div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Generous Soul</div>
              <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>Donated 100+ meals</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Donations */}
      {impact.recentDonations && impact.recentDonations.length > 0 && (
        <div style={{
          background: '#f8f9fa',
          padding: '30px',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '1.8em', marginBottom: '20px' }}>Recent Donations</h2>
          <div style={{
            display: 'grid',
            gap: '15px'
          }}>
            {impact.recentDonations.map((donation, idx) => (
              <div key={idx} style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #3498db',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px' }}>
                    {donation.food_name}
                  </div>
                  <div style={{ color: '#7f8c8d', fontSize: '0.9em' }}>
                    {donation.ngo_id?.name ? `To: ${donation.ngo_id.name}` : 'General Donation'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2em', color: '#27ae60' }}>
                    {donation.quantity} meals
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    marginTop: '5px',
                    background: donation.status === 'completed' ? '#d5f4e6' : donation.status === 'assigned' ? '#ffeaa7' : '#dfe6e9',
                    color: donation.status === 'completed' ? '#27ae60' : donation.status === 'assigned' ? '#f39c12' : '#7f8c8d'
                  }}>
                    {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivation Section */}
      <div style={{
        marginTop: '40px',
        padding: '30px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '1.8em', marginBottom: '15px' }}>Keep Making a Difference</h2>
        <p style={{ fontSize: '1.1em', marginBottom: '20px', opacity: 0.9 }}>
          {stats.completedMeals > 0 
            ? `You've already served ${stats.completedMeals} people. Continue your mission to help more!`
            : 'Every donation counts. Start your journey today and help feed those in need.'}
        </p>
      </div>
    </div>
  );
};

export default DonorImpactDashboard;
