const mongoose = require("mongoose");
const { Number, Boolean } = mongoose.Schema.Types;

const DeliverySettingSchema = new mongoose.Schema({
    tax: {
        type: Number,
    },
    driverCommision: {
        type: Number,
    },
    driverCancelation: {
        type: Number
    }
});

const DeliverySetting = mongoose.model("DeliverySetting", DeliverySettingSchema);
module.exports = DeliverySetting;
