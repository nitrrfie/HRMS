const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const PeerRating = require('../models/PeerRating');

// @desc    Save peer ratings
// @route   POST /api/peer-rating
// @access  Private
router.post('/', protect, async (req, res) => {
    console.log('Received peer rating request:', req.body); // Debug log
    const { ratings, month, year } = req.body;

    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
        return res.status(400).json({ success: false, message: 'No ratings provided' });
    }

    try {
        const ratingPromises = ratings.map(async (rating) => {
            const { employeeId, responsiveness, teamSpirit } = rating;

            // Validate scores
            if (responsiveness < 0 || responsiveness > 10 || teamSpirit < 0 || teamSpirit > 10) {
                throw new Error('Ratings must be between 0 and 10');
            }

            // Upsert rating (update if exists, insert if new)
            return PeerRating.findOneAndUpdate(
                {
                    rater: req.user._id,
                    ratedEmployee: employeeId,
                    month: month,
                    year: year
                },
                {
                    responsiveness: parseFloat(responsiveness),
                    teamSpirit: parseFloat(teamSpirit)
                },
                { upsert: true, new: true, runValidators: true }
            );
        });

        await Promise.all(ratingPromises);

        res.status(200).json({ success: true, message: 'Ratings saved successfully' });
    } catch (error) {
        console.error('Error saving ratings:', error);
        res.status(500).json({ success: false, message: 'Failed to save ratings', error: error.message });
    }
});

// @desc    Get my peer ratings for a specific month
// @route   GET /api/peer-rating
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        const ratings = await PeerRating.find({
            rater: req.user._id,
            month: month,
            year: parseInt(year)
        });

        res.status(200).json({ success: true, ratings });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch ratings', error: error.message });
    }
});

module.exports = router;
