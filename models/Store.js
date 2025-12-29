const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    logo: {
        type: String,
        required: true
    },
    logoType: {
        type: String,
        enum: ['text', 'emoji', 'url', 'upload'],
        default: 'emoji'
    },
    offers: {
        type: Number,
        default: 0
    },
    category: String,
    website: String,
    description: String,
    rating: {
        type: Number,
        default: 4.5
    },
    reviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Store', StoreSchema);

