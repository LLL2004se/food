import React, { useState } from 'react';
import axios from 'axios';

const ReviewCard = ({ review }) => {
  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-300"}>★</span>
    ));
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {review.reviewer_id?.profile_picture && (
            <img 
              src={review.reviewer_id.profile_picture} 
              alt={review.reviewer_id.name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-sm">{review.reviewer_id?.name || 'Anonymous'}</p>
            <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-0">{renderStars(review.rating)}</div>
      </div>
      {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
    </div>
  );
};

const ReviewModal = ({
  isOpen,
  onClose,
  recipientId,
  donationId,
  reviewType = 'donor',
  recipientLabel = 'User',
  onSubmit,
  apiBaseUrl = 'http://localhost:5000'
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!recipientId) {
      alert('Recipient is missing. Please try again.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to submit a review.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${apiBaseUrl}/api/reviews`, {
        recipient_id: recipientId,
        donation_id: donationId,
        rating,
        comment,
        review_type: reviewType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRating(5);
      setComment('');
      if (onSubmit) onSubmit();
      onClose();
    } catch (error) {
      alert('Error submitting review: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-bold mb-4">Rate {recipientLabel}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Comment (Optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            rows="4"
            placeholder="Share your experience..."
          />
          <p className="text-xs text-gray-500 mt-1">{comment.length}/500</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ReviewCard, ReviewModal };
