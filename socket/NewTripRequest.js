const axios = require("axios");
const admin = require("firebase-admin");
const Sentry = require("@sentry/node");

const DriverM = require("../models/Driver");
const CategoryFareM = require("../models/CategoryFare");
const TripM = require("../models/Trip");
const Pending = require("../models/Pending");

var {
  users,
  entitle,
  artitle,
  enmes,
  armes,
  nodrivertitlear,
  nodrivertitleen,
  notification_options,
  listinterval, admins
} = require("../server");

var { DistinationDuration, tripCost, driveTimeCalc } = require("../function");

module.exports = async function (data, socket, io) {

  var discountType = -1;
  var discountValue = 0;
  console.log(data);
  try {

    listinterval.set(data.userId, "1")
  } catch (error) {
    Sentry.captureException(error);

  }
  const config = {
    method: "post",
    url: `http://devmachine.taketosa.com/api/Trip/CheckPromoCode?promoCode=${data.promoCode}`,
    headers: {
      "Content-Type": "application / json",
      Authorization: "Bearer " + data.token,
      "Accept-Language": data.Language,
    },
  };
  if (data.promoCode != "") {
    let promoResponse = await axios(config).then((res) => {
      if ((!res.data.status || !res.data.data.isValid) && data.promoCode) {
        Sentry.captureMessage(`user order a new trip where userId=${data.userId} promoCode Invalid `);

        var user_id = users.get(data.userId);
        discountValue = -1;
        console.log(user_id);

        socket.emit("promoCode", {
          message: res.data.message,
        });
      } else if (res.data.data.isValid) {
        Sentry.captureMessage(`user order a new trip where userId=${data.userId} promoCode valid `);
        discountType = res.data.data.discountType;
        discountValue = res.data.data.discountValue;
      }
    });
  }
  console.log(discountType, discountValue);
  if (discountValue != -1) {

    var userID = data.userId;
    var pickupLat = data.pickupLat;
    var pickupLng = data.pickupLng;
    var dropoffLat = data.dropoffLat;
    var dropoffLng = data.dropoffLng;
    console.log(userID);
    DriverM.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [pickupLng, pickupLat],
          },
          //maxDistance: 5000,
        },
      },
      isBusy: false,
      isOnline: true,
      isDeleted: false,
      genderRequest: data.genderRequest,
      categoryCarTypeID: data.categoryCarTypeID,
    }).then(async (drivers) => {
      var Trip_ID;

      await axios({
        method: "post",
        url: "https://devmachine.taketosa.com/api/Trip/NewTrip",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application / json",
          "Accept-Language": data.Language,
        },
        data: {
          pickupLat,
          pickupLng,
          pickupAddress: data.pickupAddress,
          dropoffLat,
          dropoffLng,
          dropoffAddress: data.dropoffAddress,
          promoCode: data.promoCode,
          categoryCarTypeID: data.categoryCarTypeID,
          paymentStatusId: data.paymentStatusID,
          isWalletPay: data.isWalletPay,
        },
      }).then(async (res) => {
        if (res.data.status) {
          Trip_ID = res.data.data.tripMasterId;
          Sentry.captureMessage(`new Trip Request TripID=${Trip_ID} and userID=${data.userId}`);

          console.log(res.data.data.tripMasterId);
          socket.emit("NewTripRequest", { tripId: Trip_ID })
          console.log("get drivers", drivers);
          var dr = [];
          const trip = new TripM({
            pickupLat: pickupLat,
            pickupLng: pickupLng,
            pickupAddress: data.pickupAddress,
            dropoffLat: dropoffLat,
            dropoffLng: dropoffLng,
            dropoffAddress: data.dropoffAddress,
            promoCode: "" + data.promoCode,
            categoryCarTypeID: data.categoryCarTypeID,
            cancelReasonID: 0,
            paymentStatusId: data.paymentStatusID,
            isWalletPay: data.isWalletPay,
            tripID: Trip_ID,
            tripStatusId: 2,
            tripDrivers: [],
          });
          console.log(trip);
          const driverTime = await DistinationDuration(
            pickupLat,
            pickupLng,
            dropoffLng,
            dropoffLat
          );
          var dist = (driverTime[0].distance.value / 1000).toFixed();
          if (dist === 0) dist++;
          var from_to = {
            pickupLat: pickupLat,
            pickupLng: pickupLng,
            pickupAddress: data.pickupAddress,
            dropoffLat: dropoffLat,
            dropoffLng: dropoffLng,
            dropoffAddress: data.dropoffAddress,
            userId: userID,
            tripID: Trip_ID,
            driverTime: (driverTime[0].duration.value / 60).toFixed(),
            distance: dist,
          };

          var tripC = await tripCost(
            pickupLng,
            pickupLat,
            dropoffLng,
            dropoffLat,
            data.categoryCarTypeID,
            discountType,
            discountValue, driverTime
          );

          from_to.tripCost = tripC;

          var cat = await CategoryFareM.findOne({
            categoryCarTypeID: data.categoryCarTypeID,
          });

          var payment = "";

          if (data.paymentStatusID === 1) payment = "Cash";
          else if (data.paymentStatusID === 2) payment = "Net";
          else payment = "PassengerWallet";

          from_to.category =
            data.Language == "ar"
              ? cat.categoryCarNameAr + " , " + payment
              : cat.categoryCarNameEn + " , " + payment;
          if (drivers.length > 0) {
            var reachTime = await DistinationDuration(
              pickupLat,
              pickupLng,
              drivers[0].location.coordinates[0],
              drivers[0].location.coordinates[1]
            );
            from_to.passengerRate = res.data.data.passengerRate
            from_to.passengerName = res.data.data.passengerName
            from_to.passengerMobile = res.data.data.passengerMobile
            from_to.passengerImage = res.data.data.passengerImage
            from_to.reachTime = (reachTime[0].duration.value / 60).toFixed();
            from_to.arriveTime = driveTimeCalc(
              0,
              from_to.reachTime,
              drivers[0].Language
            );

            socket.setMaxListeners(21);
            const drs = [];
            for (let i = 0; i < Math.min(drivers.length, 3); i++) {
              drs.push({
                driverID: drivers[i].driverID,
                status: 0,
              });
            }
            try {

              console.log(Trip_ID, ";kopoi");
              try {
                var postData;

                if (drivers[0].deviceType == 1) {
                  // IOS
                  postData = {
                    data: {
                      PushType: "1",
                      PushTitle:
                        drivers[0].Language == "ar" ? artitle : entitle,
                    },
                    notification: {
                      body: drivers[0].Language == "ar" ? armes : enmes,
                      sound: "default",
                    },
                  };
                } else if (drivers[0].deviceType == 2) {
                  // Andriod
                  postData = {
                    data: {
                      PushType: "1",
                      PushTitle:
                        drivers[0].Language == "ar"
                          ? artitle
                          : entitle +
                            '",' +
                            '"PushMessage":"' +
                            data.Language ==
                            "ar"
                            ? armes
                            : enmes,
                      content_available: "true",
                      priority: "high",
                    },
                  };
                }

                /*admin
                  .messaging()
                  .sendToDevice(
                    drivers[0].tokenID,
                    postData,
                    notification_options
                  )*/
              } catch (error) {
                console.log(error)
                Sentry.captureException(error);

              }
              const pending = await new Pending({
                tripID: Trip_ID,
                pickupLat: pickupLat,
                pickupLng: pickupLng,
                pickupAddress: data.pickupAddress,
                dropoffLat: dropoffLat,
                dropoffLng: dropoffLng,
                dropoffAddress: data.dropoffAddress,
                userID: userID,
                driverTime: from_to.driverTime,
                distance: from_to.distance,
                tripCost: from_to.tripCost,
                category: from_to.category,
                reachTime: from_to.reachTime,
                arriveTime: from_to.arriveTime,
                arriveStatus: 0,
                drs: drs,
                registrationToken: data.registrationToken,
                loginToken: data.token,
                deviceType: data.deviceType,
                Language: data.Language,
                passengerName: res.data.data.passengerName
                , passengerMobile: res.data.data.passengerMobile,
                passengerImage: res.data.data.passengerImage,
                passengerRate: res.data.data.passengerRate

              })
              //console.log("tttttttttttttttttttt",pending)
              const savedPending = await pending.save();
              const savedTrip = await trip.save();
              console.log(
                users.get(drivers[0].driverID),
                drivers[0].driverID
              );
              io
                .to(users.get(drivers[0].driverID))
                .emit("NewTripInfo", from_to);
                Sentry.captureMessage(`trip tripID=${Trip_ID} sent to driverID =${drivers[0].driverID} `);

              await Pending.findOne({ tripID: Trip_ID }).then(async (p) => {
                //console.log(p);
                let ar = p.drs;
                console.log(ar[0], p.drs);
                ar[0].status = -1;
                await Pending.updateOne(
                  { tripID: Trip_ID },
                  { $set: { drs: ar } }
                );
                console.log(ar, "update to -1");
              });

              var now = 0;

              let interval1 = setInterval(function () {
                now++;
                Pending.findOne({ tripID: Trip_ID }).then((pen107) => {
                  console.log(pen107.drs[0], Trip_ID);
                  if (pen107.drs[0].status !== -1) {
                    clearInterval(interval1);
                    console.log("clear ");
                  }
                });
                console.log(now);
                if (now === 20) {
                  Sentry.captureMessage(`driverID =${drivers[0].driverID} ignored the trip = ${Trip_ID}`);
                  Pending.findOne({ tripID: Trip_ID }).then(
                    async (saved) => {
                      if (saved.drs[0].status === -1) {
                        let array = saved.drs;
                        array[0].status = 3;
                        await Pending.updateOne(
                          { tripID: Trip_ID },
                          { $set: { drs: array } }
                        );
                      }
                      if (saved.drs.length === 1) {
                        DriverM.findOne({ driverID: saved.drs[0].driverID })
                          .then(async (savedDriver) => {
                            trip.tripDrivers.push({
                              driverID: savedDriver.driverID,
                              requestStatus: 3,
                              lat: savedDriver.location.coordinates[1],
                              lng: savedDriver.location.coordinates[0],
                              actionDate: new Date((new Date()).getTime() + 180 * 60000),
                            });

                            trip.tripStatusId = 2;
                            await TripM.updateOne(
                              { tripID: trip.tripID },
                              {
                                $set: {
                                  tripStatusId: trip.tripStatusId,
                                  tripDrivers: trip.tripDrivers,
                                },
                              }
                            );
                          })
                          .then(async () => {
                            await TripM.findOne({
                              tripID: trip.tripID,
                            }).then((savedTr) => {
                              console.log(savedTr, "627");
                              try {
                                console.log(data);
                                axios({
                                  method: "post",
                                  url:
                                    "https://devmachine.taketosa.com/api/Trip/UpdateTrip",
                                  data: savedTr,
                                  headers: {
                                    Authorization: `Bearer ${data.token}`,
                                    "Content-Type": "application / json",
                                    "Accept-Language": data.Language,
                                  },
                                }).then((res) => {
                                  console.log(users.get(data.userId), data.userId, "uyuiyuiyiuyuiyiu")
                                  Sentry.captureMessage(`trip = ${Trip_ID} there is no driver available`);
                                  socket.emit(
                                    "DriverResponded",
                                    {
                                      status: 2,
                                      message:
                                        saved.Language == "en"
                                          ? "sorry,there is no available driver"
                                          : "!عذراُ لا يوجد سائق متاح حالياً",
                                    }
                                  );

                                  console.log("iiiiiii", res.data);
                                });
                              } catch (error) {
                                Sentry.captureException(error);

                                console.log("abc");
                              }
                            });
                          });
                      } else if (saved.drs.length > 1) {
                        DriverM.findOne({
                          driverID: saved.drs[0].driverID,
                        }).then(async (savedDriver) => {
                          trip.tripDrivers.push({
                            driverID: savedDriver.driverID,
                            requestStatus: 3,
                            lat: savedDriver.location.coordinates[1],
                            lng: savedDriver.location.coordinates[0],
                            actionDate: new Date((new Date()).getTime() + 180 * 60000),
                          });

                          trip.tripStatusId = 2;
                          await TripM.updateOne(
                            { tripID: Trip_ID },
                            {
                              $set: {
                                tripStatusId: trip.tripStatusId,
                                tripDrivers: trip.tripDrivers,
                              },
                            }
                          );
                        });

                        var reachTime = await DistinationDuration(
                          pickupLat,
                          pickupLng,
                          drivers[1].location.coordinates[0],
                          drivers[1].location.coordinates[1]
                        );

                        from_to.reachTime = (
                          reachTime[0].duration.value / 60
                        ).toFixed();
                        from_to.arriveTime = driveTimeCalc(
                          0,
                          from_to.reachTime,
                          drivers[1].Language
                        );
                        try {
                          var postData;

                          if (drivers[1].deviceType == 1) {
                            // IOS
                            postData = {
                              data: {
                                PushType: "1",
                                PushTitle:
                                  drivers[1].Language == "ar"
                                    ? artitle
                                    : entitle,
                              },
                              notification: {
                                body:
                                  drivers[1].Language == "ar"
                                    ? armes
                                    : enmes,
                                sound: "default",
                              },
                            };
                          } else if (drivers[1].deviceType == 2) {
                            // Andriod
                            postData = {
                              data: {
                                PushType: "1",
                                PushTitle:
                                  drivers[1].Language == "ar"
                                    ? artitle
                                    : entitle,
                                PushMessage:
                                  data.Language == "ar" ? armes : enmes,
                                content_available: "true",
                                priority: "high",
                              },
                            };
                          }
                         /* admin
                            .messaging()
                            .sendToDevice(
                              drivers[1].tokenID,
                              postData,
                              notification_options
                            );*/
                        } catch (error) {
                          Sentry.captureException(error);
                        }
                        /////
                        io
                          .to(users.get(drivers[1].driverID))
                          .emit("NewTripInfo", from_to);
                          Sentry.captureMessage(`trip tripID=${Trip_ID} sent to driverID =${drivers[1].driverID} `);
                        await Pending.findOne({ tripID: Trip_ID }).then(
                          async (p12) => {
                            console.log(p12);
                            let ar = p12.drs;
                            ar[1].status = -1;
                            await Pending.updateOne(
                              { tripID: trip.tripID },
                              { $set: { drs: ar } }
                            );
                            console.log(ar, "update to -1");
                          }
                        );

                        var now2 = 0;
                        let interval43 = setInterval(function () {
                          now2++;
                          Pending.findOne({ tripID: Trip_ID }).then(
                            (pen109) => {
                              console.log(pen109.drs[1], Trip_ID);
                              if (pen109.drs[1].status !== -1) {
                                clearInterval(interval43);
                                console.log("clear second interval");
                              }
                              console.log(now2);
                            }
                          );
                          if (now2 === 20) {
                            Sentry.captureMessage(`driverID =${drivers[1].driverID} ignore the trip = ${Trip_ID}`);
                            Pending.findOne({
                              tripID: Trip_ID,
                            }).then(async (saved) => {
                              if (saved.drs[1].status === -1) {
                                let array = saved.drs;
                                array[1].status = 3;
                                await Pending.updateOne(
                                  { tripID: trip.tripID },
                                  { $set: { drs: array } }
                                );
                              }

                              if (saved.drs.length === 2) {
                                await DriverM.findOne({
                                  driverID: saved.drs[1].driverID,
                                })
                                  .then(async (savedDriver) => {
                                    const arr = await TripM.findOne({
                                      tripID: trip.tripID,
                                    });
                                    console.log(arr.tripDrivers);
                                    arr.tripDrivers.push({
                                      driverID: savedDriver.driverID,
                                      requestStatus: 3,
                                      lat:
                                        savedDriver.location
                                          .coordinates[1],
                                      lng:
                                        savedDriver.location
                                          .coordinates[0],
                                      actionDate:
                                        new Date((new Date()).getTime() + 180 * 60000),
                                    });
                                    trip.tripStatusId = 2;
                                    await TripM.updateOne(
                                      { tripID: trip.tripID },
                                      {
                                        $set: {
                                          tripStatusId: trip.tripStatusId,
                                          tripDrivers: arr.tripDrivers,
                                        },
                                      }
                                    );
                                  })
                                  .then(async () => {
                                    await TripM.findOne({
                                      tripID: trip.tripID,
                                    }).then((savedTr) => {
                                      try {
                                        console.log(savedTr);
                                        axios({
                                          method: "post",
                                          url:
                                            "https://devmachine.taketosa.com/api/Trip/UpdateTrip",
                                          data: savedTr,
                                          headers: {
                                            Authorization: `Bearer ${data.token}`,
                                            "Content-Type":
                                              "application / json",
                                            "Accept-Language":
                                              data.Language,
                                          },
                                        }).then((res) => {
                                          console.log(res.data);
                                          Sentry.captureMessage(`trip = ${Trip_ID} there is no driver available`);
                                          socket.emit("DriverResponded", {
                                            status: 2,
                                            message:
                                              saved.Language == "en"
                                                ? "sorry,there is no available driver"
                                                : "!عذراُ لا يوجد سائق متاح حالياً",
                                          });
                                        });
                                      } catch (error) {
                                        Sentry.captureException(error);

                                        console.log("abc");
                                      }
                                    });
                                  });
                              } else {
                                DriverM.findOne({
                                  driverID: saved.drs[1].driverID,
                                }).then(async (savedDriver) => {
                                  trip.tripDrivers.push({
                                    driverID: savedDriver.driverID,
                                    requestStatus: 3,
                                    lat:
                                      savedDriver.location.coordinates[1],
                                    lng:
                                      savedDriver.location.coordinates[0],
                                    actionDate:
                                      new Date((new Date()).getTime() + 180 * 60000),
                                  });

                                  trip.tripStatusId = 2;
                                  await TripM.updateOne(
                                    { tripID: trip.tripID },
                                    {
                                      $set: {
                                        tripStatusId: trip.tripStatusId,
                                        tripDrivers: trip.tripDrivers,
                                      },
                                    }
                                  );
                                });
                                var reachTime = await DistinationDuration(
                                  pickupLat,
                                  pickupLng,
                                  drivers[2].location.coordinates[0],
                                  drivers[2].location.coordinates[1]
                                );

                                from_to.reachTime = (
                                  reachTime[0].duration.value / 60
                                ).toFixed();
                                from_to.arriveTime = driveTimeCalc(
                                  0,
                                  from_to.reachTime,
                                  drivers[2].Language
                                );
                                try {
                                  var postData;

                                  if (drivers[2].deviceType == 1) {
                                    // IOS
                                    postData = {
                                      data: {
                                        PushType: "1",
                                        PushTitle:
                                          drivers[2].Language == "ar"
                                            ? artitle
                                            : entitle,
                                      },
                                      notification: {
                                        body:
                                          drivers[2].Language == "ar"
                                            ? armes
                                            : enmes,
                                        sound: "default",
                                      },
                                    };
                                  } else if (drivers[2].deviceType == 2) {
                                    // Andriod
                                    postData = {
                                      data: {
                                        PushType: "1",
                                        PushTitle:
                                          drivers[2].Language == "ar"
                                            ? artitle
                                            : entitle,
                                        PushMessage:
                                          data.Language == "ar"
                                            ? armes
                                            : enmes,
                                        content_available: "true",
                                        priority: "high",
                                      },
                                    };
                                  }
                                 /* admin
                                    .messaging()
                                    .sendToDevice(
                                      drivers[2].tokenID,
                                      postData,
                                      notification_options
                                    );*/
                                  
                                } catch (error) {
                                  Sentry.captureException(error);
                                }
                                io
                                  .to(users.get(drivers[2].driverID))
                                  .emit("NewTripInfo", from_to);
                                  Sentry.captureMessage(`trip tripID=${Trip_ID} sent to driverID =${drivers[2].driverID} `);
                                await Pending.findOne({
                                  tripID: Trip_ID,
                                }).then(async (tr12) => {
                                  var ar = tr12.drs;
                                  ar[2].status = -1;
                                  await Pending.updateOne(
                                    { tripID: trip.tripID },
                                    { $set: { drs: ar } }
                                  );
                                });
                                var now3 = 0;
                                let interval69 = setInterval(function () {
                                  now3++;
                                  Pending.findOne({ tripID: Trip_ID }).then(
                                    (pen110) => {
                                      console.log(pen110.drs[2], Trip_ID);
                                      if (pen110.drs[2].status !== -1) {
                                        clearInterval(interval69);
                                        console.log(
                                          "clear second interval"
                                        );
                                      }
                                      console.log(now3);
                                    }
                                  );
                                  if (now3 === 20) {
                                    Sentry.captureMessage(`driverID =${drivers[2].driverID} ignore the trip = ${Trip_ID}`);
                                    Pending.findOne({
                                      tripID: Trip_ID,
                                    }).then(async (saved) => {
                                      if (saved.drs[2].status === -1) {
                                        let array = saved.drs;
                                        array[2].status = 3;
                                        Pending.updateOne(
                                          { tripID: trip.tripID },
                                          { $set: { drs: array } }
                                        );
                                      }
                                      DriverM.findOne({
                                        driverID: saved.drs[2].driverID,
                                      }).then(async (savedDriver) => {
                                        try {
                                          const arr = await TripM.findOne(
                                            {
                                              tripID: trip.tripID,
                                            }
                                          );
                                          arr.tripDrivers.push({
                                            driverID:
                                              savedDriver.driverID,
                                            requestStatus: 3,
                                            lat:
                                              savedDriver.location
                                                .coordinates[1],
                                            lng:
                                              savedDriver.location
                                                .coordinates[0],
                                            actionDate:
                                              new Date((new Date()).getTime() + 180 * 60000),
                                          });
                                          trip.tripStatusId = 2;
                                          await TripM.updateOne(
                                            { tripID: trip.tripID },
                                            {
                                              $set: {
                                                tripStatusId:
                                                  trip.tripStatusId,
                                                tripDrivers:
                                                  arr.tripDrivers,
                                              },
                                            }
                                          );
                                          await TripM.findOne({
                                            tripID: trip.tripID,
                                          }).then((savedTr) => {
                                            try {
                                              console.log(savedTr);
                                              axios({
                                                method: "post",
                                                url:
                                                  "https://devmachine.taketosa.com/api/Trip/UpdateTrip",
                                                data: savedTr,
                                                headers: {
                                                  Authorization: `Bearer ${data.token}`,
                                                  "Content-Type":
                                                    "application / json",
                                                  "Accept-Language":
                                                    data.Language,
                                                },
                                              }).then((res) => {
                                                Sentry.captureMessage(`trip = ${Trip_ID} there is no driver available`);
                                                socket.emit(
                                                  "DriverResponded",
                                                  {
                                                    status: 2,
                                                    message:
                                                      saved.Language ==
                                                        "en"
                                                        ? "sorry,there is no available driver"
                                                        : "!عذراُ لا يوجد سائق متاح حالياً",
                                                  }
                                                );
                                                console.log(res.data);
                                              });
                                            } catch (error) {
                                              Sentry.captureException(error);

                                              console.log("abc");
                                            }
                                          });
                                        } catch (error) {
                                          Sentry.captureException(error);

                                          console.log("hammoud");
                                        }
                                      });
                                    });
                                    clearInterval(interval69);
                                    console.log("clear interval69");
                                  }
                                }, 1000);
                              }
                            });
                            clearInterval(interval43);
                            console.log("clear interval43");
                          }
                        }, 1000);
                        ///////////
                      }
                    }
                  );
                  clearInterval(interval1);
                  console.log("clear interval1");
                }
              }, 1000);

            } catch (error) {
              Sentry.captureException(error);

            }
          } else {
            const pending = new Pending({
              tripID: Trip_ID,
              pickupLat: pickupLat,
              pickupLng: pickupLng,
              pickupAddress: data.pickupAddress,
              dropoffLat: dropoffLat,
              dropoffLng: dropoffLng,
              dropoffAddress: data.dropoffAddress,
              userId: userID,
              driverTime: from_to.driveTime,
              distance: from_to.distance,
              tripCost: from_to.tripCost,
              category: from_to.category,
              reachTime: from_to.reachTime,
              arriveTime: from_to.arriveTime,
              arriveStatus: 0,
              drs: [],
              registrationToken: data.registrationToken,
              loginToken: data.token,
              deviceType: data.deviceType,
              Language: data.Language,
            });
            const datasql={
              tripID: Trip_ID,
              pickupLat: pickupLat,
              pickupLng: pickupLng,
              pickupAddress: data.pickupAddress,
              dropoffLat: dropoffLat,
              dropoffLng: dropoffLng,
              dropoffAddress: data.dropoffAddress,
              userId: userID,
              driverTime: from_to.driveTime,
              distance: from_to.distance,
              tripCost: from_to.tripCost,
              category: from_to.category,
              reachTime: from_to.reachTime,
              arriveTime: from_to.arriveTime,
              drs: [],
              cancelReasonID: 0,           
              tripStatusId: 2,
             }
            const savedPending = await pending.save();
            Pending.findOne({ tripID: trip.tripID }).then(async (res1) => {
              trip.tripStatusId = 2;
              trip.tripDrivers = [];
              await trip.save().then((res) => {
                //console.log(res.data);
                try {
                  console.log(datasql, "yup");
                  axios({
                    method: "post",
                    url:
                      "https://devmachine.taketosa.com/api/Trip/UpdateTrip",
                    data: datasql,
                    headers: {
                      Authorization: `Bearer ${res1.loginToken}`,
                      "Content-Type": "application / json",
                      "Accept-Language": data.Language,
                    },
                  }).then((res2) => {
                    console.log(res2.data);
                    if (res2.data.status) {
                      try {
                        var postData;

                        if (res1.deviceType == 1) {
                          // IOS
                          postData = {
                            data: {
                              PushType: "2",
                              PushTitle:
                                res1.Language == "ar"
                                  ? nodrivertitlear
                                  : nodrivertitleen,
                            },
                            notification: {
                              body:
                                res1.Language == "ar"
                                  ? nodrivertitlear
                                  : nodrivertitleen,
                              sound: "default",
                            },
                          };
                        } else if (res1.deviceType == 2) {
                          // Andriod
                          postData = {
                            data: {
                              PushType: "2",
                              PushTitle:
                                res1.Language == "ar"
                                  ? nodrivertitlear
                                  : nodrivertitleen,
                              PushMessage:
                                res1.Language == "ar"
                                  ? nodrivertitlear
                                  : nodrivertitleen,
                              content_available: "true",
                              priority: "high",
                            },
                          };
                        }
                       /*admin
                          .messaging()
                          .sendToDevice(
                            res1.registrationToken,
                            postData,
                            notification_options
                          );*/
                      } catch (error) {
                        Sentry.captureException(error);
                      }
                      Sentry.captureMessage(`trip = ${Trip_ID} there is no driver available`);
                      socket.emit("DriverResponded", {
                        status: 2,
                        message:
                          res1.Language == "en"
                            ? "sorry,there is no available driver"
                            : "!عذراُ لا يوجد سائق متاح حالياً",
                      });
                    }
                  });
                } catch (error) {
                  console.log(error);
                  Sentry.captureException(error);
                  socket.emit("DriverResponded", {
                    status: 0,
                    message:
                      res1.Language == "en"
                        ? "sorry,there is no available driver"
                        : "!عذراُ لا يوجد سائق متاح حالياً",
                  });
                }
              });
            });
          }
        } else {
          Sentry.captureMessage(`new Trip Request error in sql database and userID=${data.userId}`);

          socket.emit("DriverResponded", {
            status: 0,
            message:
              data.Language == "en"
                ? "sorry,there is no available driver"
                : "!عذراُ لا يوجد سائق متاح حالياً",
          });
        }
      });
    });
  }
};
