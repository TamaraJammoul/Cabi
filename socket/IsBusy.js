const DriverM = require("../models/Driver");
const Sentry = require("@sentry/node");

var {
admins
} = require("../server");

module.exports = async function (data, socket, io) {
  //console.log("is busy ");
  try {
    const driver = await DriverM.findOne({
      driverID: data.driverID,
    });
    if (data.status == 1) {
      const updated_driver = await DriverM.updateOne(
        {
          driverID: data.driverID,
        },
        {
          $set: {
            isBusy: true,
          },
        }
      ).then(() => {
        Sentry.captureMessage(`driver emit isBusy event driverID=${data.driverID} `);

        const ISBUSY = true;
        const data1 = {
          status:
            driver.isOnline === true && ISBUSY == false
              ? 1
              : driver.isOnline == true && ISBUSY == true
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
        admins.forEach((admin) => {
          io.to(admin).emit("trackAdmin", data1);
          io.to(admin).emit("trackCount");
        });
      });
    }
    if (data.status == 2) {
      const updated_driver = await DriverM.updateOne(
        {
          driverID: data.driverID,
        },
        {
          $set: {
            isBusy: false,
            busyTrip: {},
          },
        }
      ).then(() => {
        Sentry.captureMessage(`driver emit is not Busy event driverID=${data.driverID} `);

        const ISBUSY = false;
        const data1 = {
          status:
            driver.isOnline === true && ISBUSY == false
              ? 1
              : driver.isOnline == true && ISBUSY == true
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
        admins.forEach((admin) => {
          io.to(admin).emit("trackAdmin", data1);
          io.to(admin).emit("trackCount");
        });
      });
    }
    socket.emit("IsBusy", {
      status: true,
      message: "isbusy success",
    });
  } catch (error) {
    Sentry.captureException(error);
    socket.emit("IsBusy", {
      status: false,
      message: "error in busy",
    });
  }
};
