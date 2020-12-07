const DriverM = require("../models/Driver");
const axios = require("axios");

module.exports = async function (data, socket, io) {
  try {
    if (data.lat == 0) {
      DriverM.find({
        isDeleted: false,
      }).then(async (res) => {
        var list = [];
        res.map((driver) => {
          const temp = {
            status:
              driver.isOnline === true && driver.isBusy == false
                ? 1
                : driver.isOnline == true && driver.isBusy == true
                ? 2
                : driver.isOnline == false
                ? 3
                : 0,
            driverID: driver.driverID,
            location: driver.location,
            categoryCarTypeID: driver.categoryCarTypeID,
            phoneNumber: driver.phoneNumber,
            idNo: driver.idNo,
            driverNameAr: driver.driverNameAr,
            driverNameEn: driver.driverNameEn,
            modelNameAr: driver.modelNameAr,
            modelNameEn: driver.modelNameEn,
            colorNameAr: driver.colorNameAr,
            colorNameEn: driver.colorNameEn,
            carImage: driver.carImage,
            driverImage: driver.driverImage,
            updateLocationDate: driver.updateLocationDate,
            trip: driver.isBusy ? driver.busyTrip : "",
          };
          list.push(temp);
        });
        // console.log(list);

        socket.emit("AdminGetDrivers", list);
      });
    } else {
      DriverM.find({
        isDeleted: false,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [data.lng, data.lat],
            },
            $maxDistance: data.maxDistance,
          },
        },
      }).then(async (res) => {
        var list = [];
        res.map((driver) => {
          const temp = {

            status:
              driver.isOnline === true && driver.isBusy == false
                ? 1
                : driver.isOnline == true && driver.isBusy == true
                ? 2
                : driver.isOnline == false
                ? 3
                : 0,
            driverID: driver.driverID,
            location: driver.location,
            categoryCarTypeID: driver.categoryCarTypeID,
            phoneNumber: driver.phoneNumber,
            idNo: driver.idNo,
            driverNameAr: driver.driverNameAr,
            driverNameEn: driver.driverNameEn,
            modelNameAr: driver.modelNameAr,
            modelNameEn: driver.modelNameEn,
            colorNameAr: driver.colorNameAr,
            colorNameEn: driver.colorNameEn,
            carImage: driver.carImage,
            driverImage: driver.driverImage,
            updateLocationDate: driver.updateLocationDate,
            trip: driver.isBusy ? driver.busyTrip : "",
          };
          list.push(temp);
        });

        socket.emit("AdminGetDrivers", list);
      });
    }
  } catch (err) {
    console.log(err);
  }
};
