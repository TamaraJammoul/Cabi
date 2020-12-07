const mongoose = require("mongoose");
const { Number } = mongoose.Schema.Types;

const driversSchema = mongoose.Schema({
    driverID: {
        type: Number,
    },
    status: {
        type: Number,
        default: 0
    },
});

const pendingSchema = mongoose.Schema({
    tripID: {
        type: Number,
    },
    registrationToken: {
        type: String
    },
    loginToken: {
        type: String
    },
    drs: {
        type: [driversSchema]
    },
    pickupLat: {
        type: Number
    },
    pickupLng: {
        type: Number
    },
    pickupAddress: {
        type: String
    },
    dropoffLat: {
        type: Number
    },
    dropoffLng: {
        type: Number
    },
    dropoffAddress: {
        type: String
    },
    userID: {
        type: Number
    },
    driverTime: {
        type: Number
    },
    deviceType:{
        type:Number
    },
    reachTime: {
        type: Number
    },
    arriveTime: {
        type: String
    },
    tripCost: {
        type: Number
    },
    distance: {
        type: Number
    },
    category: {
        type: String
    },
    arriveStatus: {
        type: Number,
        default: 0
    },
    Language:{type:String},
    passengerName:{type:String},
    passengeImage:{type:String},
    passengerRate:{type:Number},
    passengerMobile:{type:String},
});

const Pending = mongoose.model("Pending", pendingSchema);
module.exports = Pending;
