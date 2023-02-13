const mongoose = require("mongoose");
const { Schema } = mongoose;

const Events = new Schema({
  idEvent: { type: String },
  dateEvent: { type: String },
  event: { type: String },
  whoCreatedEvent: { type: String },
});
const Proposals = new Schema({
  provider: { type: {}, require: true },
  proposal: { type: Number, require: true },
});
const Transaction = new Schema({
  id: { type: String, require: true },
  creatorId: { type: String, require: true },
  category: { type: String, require: true },
  subCategory: { type: String, require: true },
  geometry: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" },
  },
  address: { type: String, default: "unknown" },
  bookingDate: { type: String, require: true },
  bookingTime: { type: String, require: true },
  providers: { type: Array, require: true },
  selectedProvider: { type: String, default: "" },
  jobTitle: { type: String, require: true },
  description: { type: String, require: true },
  photos: { type: Array, require: false },
  proposals: { type: [Proposals] },
  proposedPrice: { type: Number, require: false, default: 0 },
  finalPrice: { type: Number, default: 0 },
  status: { type: Number, require: true, default: 0 }, // 0 for created- 1 for approved - 2 for in progress- 3 for completed - 4 for declined
  events: { type: [Events] },
});

const TransactionModel = mongoose.model("Transaction", Transaction);
module.exports = TransactionModel;
