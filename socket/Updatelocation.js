const DriverM = require("../models/Driver");
const axios = require("axios");
var {
  admins
  } = require("../server");
  const Sentry = require("@sentry/node");

module.exports = async function (data, socket, io) {
  //console.log(data);
  var newLat = data.lat;
  var newLong = data.long;
  try {
    DriverM.findOne({
      driverID: data.driverID,
    })
      .then((driver) =>
        DriverM.updateOne(
          {
            driverID: data.driverID,
          },
          {
            $set: {
              oldLocation: {
                coordinates: [
                  driver.location.coordinates[0],
                  driver.location.coordinates[1],
                ],
                type: "Point",
              },
              location: {
                coordinates: [newLong, newLat],
                type: "Point",
              },
             updateLocationDate: new Date((new Date()).getTime() + 180 * 60000),
            },
          }
        ).then(() => {
          const location = {
            coordinates: [newLong, newLat],
            type: "Point",
          };
          const data = {
            status:
              driver.isOnline === true && driver.isBusy == false
                ? 1
                : driver.isOnline == true && driver.isBusy == true
                ? 2
                : driver.isOnline == false
                ? 3
                : 0,
            driverID: driver.driverID,
            location: location,
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
          // console.log(data);
          admins.forEach((admin) => {
            io.to(admin).emit("trackAdmin", data);
          });
        })
      )
      .catch((err) => console.log(err));
  } catch (error) {
    console.log("error");
  }
};
