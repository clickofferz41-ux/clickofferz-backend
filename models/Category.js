const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    icon: {
        type: String,
        default: '📁'
    },
    color: {
        type: String,
        default: '#3B82F6' // Blue
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: null
    },
    imageType: {
        type: String,
        enum: ['emoji', 'url', 'upload'],
        default: 'emoji'
    }
}, {
    timestamps: true
});

CategorySchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Category', CategorySchema);
