const Driver = require("../models/Driver");
const Pending = require("../models/Pending");
const axios = require("axios");
const admin = require("firebase-admin");
const Sentry = require("@sentry/node");

var {users, notification_options} = require("../server");

module.exports = async function (data, socket, io) {
  try {
    console.log(data,"kljlkjlk");
    await Driver.findOne({driverID: data.driverID}).then(async (driver) => {
      await Pending.findOne({tripID: data.tripId}).then(async (trip) => {
        console.log(users.get(trip.userID), trip.userID);
        const config = {
          method: "post",
          url: `https://devmachine.taketosa.com/api/Trip/UpdateTripStatus?tripId=${data.tripId}&tripStatusType=${data.tripStatusType}&Lat=${data.Lat}&Lang=${data.Lang}`,
          headers: {
            "Content-Type": "application / json",
            Authorization: "Bearer " + data.token,
            "Accept-Language": data.Language,
          },
        };
        try {
          let tripstatus = await axios(config).then((res) => {
            console.log("uyuyuyu", res.data);
            if (res.data.status) {
              if (data.tripStatusType != 4) {
                io.to(users.get(trip.userID)).emit("TrackInfo", {
                  tripID: data.tripId,
                  status: true,
                  message:
                    trip.Language == "ar"
                      ? res.data.data.titleAr
                      : res.data.data.titleEn,
                      isCanceled:data.tripStatusType==6?false:true
                });
              }
              console.log(users.get(data.driverID),"kjkljlkj")
              socket.emit("ChangeTripStatus", {
                tripID: data.tripId,
                status: true,
                data: res.data.data,
                message:'success'
              });
try{
              var postData;

              if (trip.deviceType == 1) {
                // IOS
                postData = {
                  data: {
                    PushType: "6",
                    PushTitle:
                      trip.Language == "ar"
                        ? res.data.data.titleAr
                        : res.data.data.titleEn,
                  },
                  notification: {
                    body:
                      trip.Language == "ar"
                        ? res.data.data.bodyAr
                        : res.data.data.bodyEn,
                    sound: "default",
                  },
                };
              } else if (trip.deviceType == 2) {
                // Andriod
                postData = {
                  data: {
                    PushType: "6",
                    PushTitle:
                      trip.Language == "ar"
                        ? res.data.data.titleAr
                        : res.data.data.titleEn,
                    PushMessage:
                      trip.Language == "ar"
                        ? res.data.data.bodyAr
                        : res.data.data.bodyEn,
                    content_available: "true",
                    priority: "high",
                  },
                };
              }

              /*admin.messaging().sendToDevice(
                trip.tokenID,
                postData,
                notification_options
              );*/
            }catch{}
            } else {
              socket.to(users.get(data.driverID)).emit("ChangeTripStatus", {
                tripID: data.tripId,
                status: false,
                message: res.data.messag,
              });
            }
          });
        } catch {
          socket.to(users.get(data.driverID)).emit("ChangeTripStatus", {
            tripID: data.tripId,
            status: false,
            message: "error in sql",
          });
        }
      });
    });
  } catch {
    socket.to(users.get(data.driverID)).emit("ChangeTripStatus", {
      tripID: data.tripId,
      status: false,
      message: "error in socketio",
    });
  }
};
