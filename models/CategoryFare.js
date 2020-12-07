const mongoose = require("mongoose");
const {Number, Boolean} = mongoose.Schema.Types;

const categoryFareSchema = new mongoose.Schema({
  
  categoryCarTypeID: {
    type: Number,
  },
  categoryCarNameAr:{
    type:String
  },
  categoryCarNameEn:{
    type:String
  },
  categoryImage: {
    type: String,
  },
  baseFare: {
    type: Number,
  },
  fareMinute: {
    type: Number,
  },
  minKM: {
    type: Number,
  },
  minFare: {
    type: Number,
  },
  cancelationFare: {
    type: Number,
  },
  waitingCharge: {
    type: Number,
  },
  isMain: {
    type: Boolean,
  },
});

const CategoryFare = mongoose.model("CategoryFare", categoryFareSchema);
module.exports = CategoryFare;
