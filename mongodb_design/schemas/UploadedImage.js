const mongoose = require('mongoose');
const { Schema } = mongoose;

const UploadedImageSchema = new Schema(
  {
    guardEmpId: { type: String, required: true },
    guardName: { type: String, required: true },
    dateRange: { type: String, required: true },
    place: { type: String, required: true },
    imageUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UploadedImageSchema.index({ guardEmpId: 1, dateRange: 1 });

module.exports = mongoose.model('UploadedImage', UploadedImageSchema);
