const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true
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

// Auto-generate slug from name (Mongoose 9+: no `next` callback in document middleware)
StoreSchema.pre('save', function () {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name.trim().toLowerCase().replace(/\s+/g, '-');
    }
});

StoreSchema.index({ category: 1 });

module.exports = mongoose.model('Store', StoreSchema);

