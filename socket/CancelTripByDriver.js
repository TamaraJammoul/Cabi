const axios = require("axios");
const Pending = require("../models/Pending");
const DriverM = require("../models/Driver");
const Sentry = require("@sentry/node");

var {users, notification_options} = require("../server");
const admin = require("firebase-admin");

module.exports = async function (data, socket, io) {
  try {
    console.log(data);
    await Pending.findOne({tripID: data.tripMasterID}).then(async (trip) => {
      // console.log(trip);

      const config = {
        method: "post",
        url: `https://devmachine.taketosa.com/api/Trip/CancelTrip?tripMasterID=${data.tripMasterID}&cancelReasonID=${data.cancelReasonID}&Lat=${data.Lat}&Lang=${data.Lang}`,
        headers: {
          "Content-Type": "application / json",
          Authorization: "Bearer " + data.token,
          "Accept-Language": data.Language,
        },
      };
      try {
        let promoResponse = await axios(config).then(async(res) => {
          console.log("uyuyuyu", res.data.status);
          if (res.data.status) {
            console.log("jkljkljllj")
            Sentry.captureMessage(`trip canceled by driver where tripID=${data.tripMasterID} and driverID=${data.driverID}`);

            socket.emit("CancelTripByDriver", {
              status: true,
            });
            io.to(users.get(trip.userID)).emit("CancelTripByDriver", {
              message: trip.Language=='en'?'Sorry,the driver canceled your ride':'عفوا الكابتن قام بإلغاء الرحلة',
              status: true,
            });
            await DriverM.updateOne(
              {
                driverID: data.driverID,
              },
              {
                $set: {
                  isBusy:false,
                },
              }
            )

           
try{
            var postData;

            if (trip.deviceType == 1) {
              // IOS
              postData = {
                data: {
                  PushType: "4",
                  PushTitle:
                    trip.Language == "ar"
                      ? "!عفوا ، الكابتن قام بإلغاء الرحلة"
                      : "Sorry, Captain canceled the trip!",
                },
                notification: {
                  body:
                    trip.Language == "ar"
                      ? `Captain ${res.data.data.driverNameEn} canceled the trip; you can try again!`
                      : `!لكابتن ${res.data.data.driverNameAr} قام بالغاء الرحلة يمكنك المحاولة مرة أخرى`,
                  sound: "default",
                },
              };
            } else if (trip.deviceType == 2) {
              // Andriod
              postData = {
                data: {
                  PushType: "4",
                  PushTitle:
                    trip.Language == "ar"
                      ? "!عفوا ، الكابتن قام بإلغاء الرحلة"
                      : "Sorry, Captain canceled the trip!",
                  PushMessage:
                    trip.Language == "ar"
                      ? `Captain ${res.data.data.driverNameEn} canceled the trip; you can try again!`
                      : `!لكابتن ${res.data.data.driverNameAr} قام بالغاء الرحلة يمكنك المحاولة مرة أخرى`,
                  content_available: "true",
                  priority: "high",
                },
              };
            }
           /* admin.messaging().sendToDevice(
              trip.registrationToken,
              postData,

              notification_options
            );*/}catch{}
          } else {
            Sentry.captureMessage(`trip cancel has faild by driver where tripID=${data.tripMasterID} and driverID=${data.driverID}`);

            socket.emit("CancelTripByDriver", {
              status: false,
              message: "error in sql",
            });
          }
        });
      } catch (error) {
        const Sentry = require("@sentry/node");

        console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
        // console.log(error);
        socket.emit("CancelTripByDriver", {
          status: false,
          message: "error in sql",
        });
      }
    });
  } catch (error){
    const Sentry = require("@sentry/node");

    socket.emit("CancelTripByDriver", {
      status: false,
      message: "error in mongodb",
    });
  }
};
