const DriverM = require("../models/Driver");
var {users, admins} = require("../server");
const axios = require("axios");
const Sentry = require("@sentry/node");
  
module.exports = async function (data, socket, io) {
  console.log("is online ",data.driverID);
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
            isOnline: true,
            isBusy:false,
            // tokenID: data.tokenID,
            deviceType: data.deviceType,
            Language: data.Language,
          },
        }
      ).then(() => {
        socket.emit("IsOnline", {status: true,message:"success"});
        //console.log(driver);
        Sentry.captureMessage(`driver emit online event driverID=${data.driverID} `);

        const ISONLINE = true;
        const data1 = {
          status:
            ISONLINE === true && driver.isBusy == false
              ? 1
              : ISONLINE == true && driver.isBusy == true
              ? 2
              : ISONLINE == false
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
            isOnline: false,
          },
        }
      ).then(() => {
        Sentry.captureMessage(`driver emit offline event driverID=${data.driverID} `);

        const ISONLINE = false;
        const data1 = {
          status:
            ISONLINE === true && driver.isBusy == false
              ? 1
              : ISONLINE == true && driver.isBusy == true
              ? 2
              : ISONLINE == false
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
        // console.log(data);
        admins.forEach((admin) => {
          io.to(admin).emit("trackAdmin", data1);
          io.to(admin).emit("trackCount");
        });
      });
    }
    socket.emit("IsOnline", {
      status: true,
      message: "isonline success",
    });
  } catch (error) {
    Sentry.captureException(error);
    socket.emit("IsOnline", {
      status: false,
      message: "error in online",
    });
  }
};
