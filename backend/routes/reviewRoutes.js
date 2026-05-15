const express = require("express");
const router = express.Router();
const Review = require("../models/review");
const User = require("../models/user");
const { requireAuth } = require("../middleware/auth");

// Create a review
router.post("/", requireAuth, async (req, res) => {
  try {
    const { recipient_id, donation_id, rating, comment, review_type } = req.body;

    if (!recipient_id || !rating || !review_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const recipient = await User.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (donation_id) {
      const existingReview = await Review.findOne({ reviewer_id: req.userId, donation_id });
      if (existingReview) {
        return res.status(409).json({ message: "You have already reviewed this delivery" });
      }
    }

    const review = new Review({
      reviewer_id: req.userId,
      recipient_id,
      donation_id,
      rating,
      comment,
      review_type,
      recipient_type: recipient.user_type
    });

    await review.save();
    res.status(201).json({ message: "Review created successfully", review });
  } catch (error) {
    res.status(500).json({ message: "Error creating review", error: error.message });
  }
});

// Get reviews for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const reviews = await Review.find({ recipient_id: req.params.userId })
      .populate("reviewer_id", "name profile_picture user_type")
      .sort({ createdAt: -1 });

    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews", error: error.message });
  }
});

// Get review for specific donation
router.get("/donation/:donationId", async (req, res) => {
  try {
    const review = await Review.findOne({ donation_id: req.params.donationId })
      .populate("reviewer_id", "name profile_picture");
    
    if (!review) {
      return res.json({ review: null });
    }
    
    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: "Error fetching review", error: error.message });
  }
});

// Update a review
router.patch("/:reviewId", requireAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.reviewer_id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to update this review" });
    }

    if (req.body.rating) {
      if (req.body.rating < 1 || req.body.rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      review.rating = req.body.rating;
    }

    if (req.body.comment !== undefined) {
      review.comment = req.body.comment;
    }

    await review.save();
    res.json({ message: "Review updated successfully", review });
  } catch (error) {
    res.status(500).json({ message: "Error updating review", error: error.message });
  }
});

// Delete a review
router.delete("/:reviewId", requireAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.reviewer_id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }

    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting review", error: error.message });
  }
});

module.exports = router;
