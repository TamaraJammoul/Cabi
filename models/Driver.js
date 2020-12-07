const mongoose = require("mongoose");
const GeoJSON = require("mongoose-geojson-schema");
const {Number, Boolean, String, Buffer} = mongoose.Schema.Types;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});
const tripSchema = new mongoose.Schema({
  pickupLat: {
    type: Number,
  },
  pickupLng: {
    type: Number,
  },
  pickAddress: {
    type: String,
  },
  dropoffLat: {
    type: Number,
  },
  dropoffLng: {
    type: Number,
  },
  dropoffAddress: {
    type: String,
  },
  userId: {
    type: Number,
  },
  tripID: {
    type: Number,
  },
});
const driverSchema = new mongoose.Schema({
  driverID: {
    type: Number,
  },
  categoryCarTypeID: {
    type: Number,
  },
  isDeleted: {
    type: Boolean,
    default: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isBusy: {
    type: Boolean,
    default: false,
  },
  genderRequest:{
    type:Number
  },
  deviceType:{
type:Number
  },
  location: {
    type: pointSchema,
    index: "2dsphere",
    required: true,
  },
  oldLocation: {
    type: pointSchema,
    index: "2dsphere",
    required: true,
  },
  phoneNumber: {
    type: Number,
  },
  idNo: {
    type: Number,
  },
  driverNameAr: {
    type: String,
  },
  driverNameEn: {
    type: String,
  },
  modelNameAr: {
    type: String,
  },
  modelNameEn: {
    type: String,
  },
  colorNameAr: {
    type: String,
  },
  colorNameEn: {
    type: String,
  },
  carImage: {
    type: String,
  },
  driverImage: {
    type: String,
  },
  plateNumber: {
    type: Number,
  },
  updateLocationDate: {
    type: Date,
  },
  tokenID: {
    type: String,
  },
  busyTrip: {
    type: tripSchema,
  },
  Language:{
    type: String
  }
});

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;
