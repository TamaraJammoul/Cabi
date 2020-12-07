const DriverM = require("../models/Driver");
const {v4: uuidv4} = require("uuid");

const Sentry = require("@sentry/node");

var {users, userinterval, listinterval,admins} = require("../server");
var {DistinationDuration} = require("../function");
const { cli } = require("winston/lib/winston/config");

module.exports = async function (data, socket, io) {
  const id = uuidv4();
    userinterval.set(data.userid, id);
    var counter=0;
    Sentry.captureMessage(`user emit get available driver event userID=${data.userid} `);

    try {
    
      listinterval.set(data.userid,"1")

    }catch (error){
      Sentry.captureException(error);

      console.log("error")
    }
    try {
      DriverM.find({
        isBusy: false,
        isOnline: true,
        isDeleted: false,
        genderRequest: data.genderRequest,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [data.long, data.lat],
            },
            //   $maxDistance: 5000,
          },
        },
      }).then(async (res) => {
       // console.log(res,"eeeeeeee");
        var near = res[0];
        console.log(near)
        if (near) {
          const time = await DistinationDuration(
            near.location.coordinates[1],
            near.location.coordinates[0],
            data.long,
            data.lat
          );
         
          var driversList = [];
          res.map((driver) => {
            const temp = {
              lat: driver.location.coordinates[1],
              lng: driver.location.coordinates[0],
              driverID: driver.driverID,
              oldLat: driver.oldLocation.coordinates[1],
              oldLng: driver.oldLocation.coordinates[0],
            };
            if (driversList.length < 5) driversList.push(temp);
          });
          const data1 = {
            drivers:time[0].duration == undefined?[]: driversList,
            time:
              time[0].duration == undefined
                ? -1
                : (time[0].duration.value / 60).toFixed(),
            status: time[0].duration == undefined ? false : true,
            message: time[0].duration == undefined ? "error google api" : "",
          };
          // console.log(users);
          let user_id = users.get(data.userid);
           console.log(user_id,"oioi");

          socket.emit("GetAvailableDrivers", data1);
        } else {
          const data1 = {
            drivers: [],
            time: -1,
            status: false,
            message: "no driver available",
          };
          Sentry.captureMessage(` get available driver event return no driver available userID=${data.userid} `);

          let user_id = users.get(data.userid);
          // console.log(user_id);
          socket.emit("GetAvailableDrivers", data1);
        }
      });
      const fun = () => {
        if (
          users.get(data.userid) == undefined ||
          userinterval.get(data.userid) != id||counter>4
        ) {
          clearInterval(interval);
          console.log("kkkkkkkkk");
          Sentry.captureMessage(` get available driver event interval clear userID=${data.userid} `);

        }
        counter++;
        DriverM.find({
          isBusy: false,
          isOnline: true,
          isDeleted: false,
          genderRequest: data.genderRequest,
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [data.long, data.lat],
              },
              //   $maxDistance: 5000,
            },
          },
        }).then(async (res) => {
          var near = res[0];
          //console.log(near);
          if (near) {
            const time = await DistinationDuration(
              near.location.coordinates[1],
              near.location.coordinates[0],
              data.long,
              data.lat
            );
            var driversList = [];
            res.map((driver) => {
              const temp = {
                lat: driver.location.coordinates[1],
                lng: driver.location.coordinates[0],
                driverID: driver.driverID,
                oldLat: driver.oldLocation.coordinates[1],
                oldLng: driver.oldLocation.coordinates[0],
              };
              if (driversList.length < 5) driversList.push(temp);
            });
            const data1 = {
              drivers: driversList,
              time:
                time[0].duration == undefined
                  ? -1
                  : (time[0].duration.value / 60).toFixed(),
              status: time[0].duration == undefined ? false : true,
              message: time[0].duration == undefined ? "error google api" : "",
            };
            if (
              users.get(data.userid) != undefined &&
              userinterval.get(data.userid) == id
            ) {
              let user_id = users.get(data.userid);
              console.log(user_id);
              Sentry.captureMessage(`get available driver event interval is running userID=${data.userid} `);

              socket.emit("GetAvailableDrivers", data1);
            }
          } else {
            const data1 = {
              drivers: [],
              time: -1,
              status: false,
              message: "no driver available",
            };
            
            if (
              users.get(data.userid) != undefined &&
              userinterval.get(data.userid) == id
            ) {
              let user_id = users.get(data.userid);
              console.log(user_id,"get");
              Sentry.captureMessage(` get available driver event interval clear userID=${data.userid} `);
              
              socket.emit("GetAvailableDrivers", data1);
            }
          }
          //console.log(data1.time)
        });
      };
      var interval = setInterval(fun, 20000);
    } catch (err) {
      Sentry.captureException(err);

      console.log(err);
      let user_id = users.get(data.userid);
      // console.log(user_id);
      socket.emit("GetAvailableDrivers", {
        status: false,
        message: "location out of bounds",
      });
    }
};
