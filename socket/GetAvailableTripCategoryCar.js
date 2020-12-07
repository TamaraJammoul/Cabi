const axios = require("axios");
const {v4: uuidv4} = require("uuid");
const DriverM = require("../models/Driver");
const CategoryFareM = require("../models/CategoryFare");
const Sentry = require("@sentry/node");

var {users, listinterval, userinterval,admins} = require("../server");
var {DistinationDuration, tripCost, driveTimeCalc} = require("../function");
const { count } = require("../models/Driver");

module.exports = async function (data, socket, io) {
  const id = uuidv4();
  listinterval.set(data.userId, id);
  Sentry.captureMessage(`user emit get available trip category car event userID=${data.userId} `);
var counter=0
  console.log(data);
  var discountType = -1;
  var discountValue = 0;
  try {
    userinterval.set(data.userId,"1")
  }catch(error){
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
      console.log(res.data);
      if ((!res.data.status || !res.data.data.isValid) && data.promoCode) {
        var user_id = users.get(data.userId);
        Sentry.captureMessage(`promocode emit get available trip category car event userID=${data.userId} invalid`);

        discountValue = -1;
        //console.log(user_id);
        socket.emit("promoCode", {
          message: res.data.message,
          status: false,
        });
      } else if (res.data.data.isValid) {
        Sentry.captureMessage(`promocode emit get available trip category car event userID=${data.userId} is valid`);

        discountType = res.data.data.discountType;
        discountValue = res.data.data.discountValue;
        var user_id = users.get(data.userId);
        socket.emit("promoCode", {
          status: true,
        });
      }
    });
  }
  //console.log(discountType, discountValue);
  if (discountValue != -1) {
    try {
      const time = await DistinationDuration(
        data.dropoffLat,
        data.dropoffLng,
        data.pickupLng,
        data.pickupLat
      ).then(async (time) => {
        const category = await CategoryFareM.find({}).then(async (res) => {
          //console.log("tttt", res);
          if (res == null) {
            //console.log(i, driver);
            let user_id = users.get(data.userid);
            Sentry.captureMessage(` get available trip category car event return no available driver userID=${data.userId} invalid`);

            socket.emit("GetAvailableTripCategoryCar", {
              message: data.Language=='ar'?"لا يوجد سائق متاح في منطقتك حالياً":"sorry,there is no available driver",
              status: false,
            });
          }
          else{
          var responseArray = [];
          var mainCatTime = 0;
          for (var i = 1; i <= res.length; i++) {
            //console.log(i);
            const temp = await DriverM.findOne({
              isBusy: false,
              isOnline: true,
              isDeleted: false,
              genderRequest: data.genderRequest,
              location: {
                $near: {
                  $geometry: {
                    type: "Point",
                    coordinates: [data.pickupLng, data.pickupLat],
                  },
                  //$maxDistance: 5000,
                },
              },
              categoryCarTypeID: i,
            }).then(async (driver) => {
               if (driver != null) {
                //console.log(driver);
                const e = await DistinationDuration(
                  driver.location.coordinates[1],
                  driver.location.coordinates[0],
                  data.pickupLng,
                  data.pickupLat
                ).then(async (driverTime) => {
                  // console.log("nm", i, driver.driverID);
                  const Cost = await tripCost(
                    data.pickupLng,
                    data.pickupLat,
                    data.dropoffLng,
                    data.dropoffLat,
                    driver.categoryCarTypeID,
                    discountType,
                    discountValue,driverTime
                  ).then((cost) => {
                    // console.log("cost", i, cost);
                    responseArray.push({
                      Name:
                        data.Language == "ar"
                          ? res[i - 1].categoryCarNameAr
                          : res[i - 1].categoryCarNameEn,
                      Photo: res[i - 1].categoryImage,
                      Minutes: (driverTime[0].duration.value / 60).toFixed(),
                      dest: (driverTime[0].distance.value / 1000).toFixed(),
                      Cost: cost,
                      isMain: res[i - 1].isMain,
                      categoryCarTypeID: res[i - 1].categoryCarTypeID,
                    });
                    if (res[i - 1].isMain)
                      mainCatTime = (
                        driverTime[0].duration.value / 60
                      ).toFixed();
                  });
                  //console.log(driver.driverImage);
                });
              }
            });
          }
         console.log(data.Language)
          var driveTime = driveTimeCalc(
            parseInt(time[0].duration.value / 60),
            mainCatTime,
            data.Language
          );
          const data1 = {
            categories: responseArray,
            mainCatTime,
            driveTime,
            status: true,
          };
          console.log(data1, users.get(data.userId), data.userId);
          //var user_id = users.get(data.userId);
          socket.emit("GetAvailableTripCategoryCar", data1);}
        });
        const fun = () => {
          if (
            users.get(data.userId) == undefined ||
            listinterval.get(data.userId) != id||counter>4
          ) {
            clearInterval(interval);
            console.log("tttttttttttttttt")
            Sentry.captureMessage(`get available driver event interval clear userID=${data.userId} `);

          }
          counter++;
          const category = CategoryFareM.find({}).then(async (res) => {
            //console.log("tttt", res);
            if (res == null) {
              let user_id = users.get(data.userid);
              Sentry.captureMessage(` get available trip category car event return no available driver userID=${data.userId} invalid`);

              socket.emit("GetAvailableTripCategoryCar", {
                message: data.Language=='ar'?"لا يوجد سائق متاح في منطقتك حالياً":"sorry,there is no available driver",
                status:false
              });
            } 
            else{
            var responseArray = [];
            var mainCatTime = 0;
            for (var i = 1; i <= res.length; i++) {
              //console.log(i);
              const temp = await DriverM.findOne({
                isBusy: false,
                isOnline: true,
                isDeleted: false,
                genderRequest: data.genderRequest,
                location: {
                  $near: {
                    $geometry: {
                      type: "Point",
                      coordinates: [data.pickupLng, data.pickupLat],
                    },
                    //$maxDistance: 5000,
                  },
                },
                categoryCarTypeID: i,
              }).then(async (driver) => {
                if (driver != null) {
                  //  console.log(driver);
                  const e = await DistinationDuration(
                    driver.location.coordinates[1],
                    driver.location.coordinates[0],
                    data.pickupLng,
                    data.pickupLat
                  ).then(async (driverTime) => {
                    //  console.log("nm", i, driverTime);
                    const Cost = await tripCost(
                      data.pickupLng,
                      data.pickupLat,
                      data.dropoffLng,
                      data.dropoffLat,
                      driver.categoryCarTypeID,
                      discountType,
                      discountValue,driverTime
                    ).then((cost) => {
                      //   console.log("cost", i, cost);
                      responseArray.push({
                        Name:
                          data.Language == "ar"
                            ? res[i - 1].categoryCarNameAr
                            : res[i - 1].categoryCarNameEn,
                        Photo: res[i - 1].categoryImage,
                        Minutes: (
                          driverTime[0].duration.value / 60
                        ).toFixed(),
                        dest: (driverTime[0].distance.value / 1000).toFixed(),
                        Cost: cost,
                        isMain: res[i - 1].isMain,
                        categoryCarTypeID: res[i - 1].categoryCarTypeID,
                      });
                      if (res[i - 1].isMain)
                        mainCatTime = (
                          driverTime[0].duration.value / 60
                        ).toFixed();
                    });
                  });
                }
              });
            }

            var driveTime = driveTimeCalc(
              parseInt(time[0].duration.value / 60),
              mainCatTime,
              data.Language
            );
            const data1 = {
              categories: responseArray,
              mainCatTime,
              driveTime,
              status: true,
            };
            //  console.log(data1);
            //console.log(data.userId, users.get(data.userId));

            if (
              users.get(data.userId) != undefined &&
              listinterval.get(data.userId) == id
            ) {
              var user_id = users.get(data.userId);
               console.log("ooioioioioio");
              socket.emit("GetAvailableTripCategoryCar", data1);
              Sentry.captureMessage(` get available driver event interval clear userID=${data.userId} `);

            }}
          });
        };
        var interval = setInterval(fun, 10000);
      });
    
    } catch (error){
      var user_id = users.get(data.userId);
      Sentry.captureException(error);

      // console.log(data.userId, users.get(data.userId));
      socket.emit("GetAvailableTripCategoryCar", {
        status: false,
        message: "location out of bounds",
      });
    }
  }
};
