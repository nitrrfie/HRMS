const mongoose = require('mongoose');

const peerRatingSchema = new mongoose.Schema({
    rater: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ratedEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    responsiveness: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    teamSpirit: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index to ensure one rating per rater per employee per month/year
peerRatingSchema.index({ rater: 1, ratedEmployee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PeerRating', peerRatingSchema);
