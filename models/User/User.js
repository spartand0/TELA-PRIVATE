const mongoose = require("mongoose");
const { Schema } = mongoose;

const feedBack = new Schema({
  id: { type: String, require: true },
  idUser: { type: String, require: true },
  rate: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
});

const Provider = new Schema({
  idProvider: { type: String, require: true },
  companyName: { type: String, Default: "" },
  MF: { type: String, Default: "" },
  Category: { type: String, Default: "" },
  subCategory: { type: Array, Default: "" },
  bio: { type: String, Default: "" },
  photoWork: { type: Array, Default: "" },
  license: { type: String, Default: "" },
  activityRadius: { type: Number, Default: 0 },
  available: { type: Boolean, Default: true },
  Languages: { type: Array, Default: "" },
  transactions: { type: Array, Default: [] },
  reviews: { type: [feedBack], Default: [] },
  rate: { type: Number, default: 0 },
});

const Notification = new Schema({
  id: { type: String },
  createdAt: { type: Date, default: Date.now() },
  title: { type: String },
  content: { type: String },
});

const User = new Schema({
  id: { type: String, require: true },
  userFullName: { type: String, default: "unknown" },
  role: { type: String, default: "Regular" },
  isProvider: { type: Boolean, default: false }, //false
  providerInfo: { type: Provider },
  favProviders: { type: Array, default: [] },
  transactions: { type: Array, default: [] },
  loginHistory: { type: Array, default: [] },
  geometry: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" },
  },
  address: { type: String, default: "unknown" },
  userEmail: {
    Email: { type: String, default: "" },
    isVerified: { type: Boolean, Default: false },
    tries: [
      {
        EmailTried: { type: String },
        DateTry: { type: String },
      },
    ],
    dateOfVerification: { type: Date },
  },
  userPhoneNumber: {
    Number: { type: String, default: "" },
    isVerified: { type: Boolean, Default: false },
    tries: [
      {
        PhoneTried: { type: String },
        DateTry: { type: String },
      },
    ],
    dateOfVerification: { type: Date },
  },
  notifications: { type: [Notification], default: [] },
  authPassword: { type: String, required: true },
  Otp: { type: String, Default: "" },
  creationDate: { type: Date, default: Date.now() },
  Selfie: { type: String },
  Status: { type: String, default: "Pending" },
});

const UserModel = mongoose.model("User", User);
module.exports = UserModel;
