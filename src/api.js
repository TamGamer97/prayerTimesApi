const express = require("express");
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

// imports
require('encoding')
const fetch = require('cross-fetch');



// routes
router.get("/route1/:latitude/:longitude", async (req, res) => { // only latitude and longitude

    const {latitude, longitude} = req.params;

    const data = await getTimes(latitude, longitude)

    res.json({
        times: data[0],
        location: data[1]
    })

});

router.get("/route2/:latitude/:longitude/:country/:cCode/:townCity/:day/:month/:year", async (req, res) => { // all 6 paraneters

    const {latitude, longitude, country, cCode, townCity, day, month, year} = req.params

    const data = await getTimesByDate(latitude, longitude, country, cCode, townCity, day, month, year)


    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    res.json({
        times : data[0],
        calculationMethod: data[1],
        date: day + "/" + month + "/" + year
    })

})

// Functions
async function getTimes(lat, long)
{
    //console.log("Calculating...")
    // variables
    let countryName;
    let countryCode;
    let townCity;

    let prayersJson = {};

    // fetching - reverse geocode
    await fetch("https://api.opencagedata.com/geocode/v1/json?q="+lat+"+"+long+"&key=3d43121eee16488ab66d5b0e587df6fa")
        .then(response => response.json())
        .then(data => {
            countryName = data.results[0].components.country
            countryCode = data.results[0].components.country_code
            townCity = data.results[0].components.town
    })

    // fetching - html code (includes prayer data) 
    let url = "https://www.muslimpro.com/en/locate?country_code="+countryCode+"&country_name="+countryName+"&city_name="+townCity+"&coordinates="+lat+","+long+""

    await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
        .then(response => {
            if (response.ok) return response.json()
            throw new Error('Network response was not ok.')
        })
        // pulling out orayer time data
        .then(data => {
            let contentPage = data.contents
            let newContent = contentPage.split('praytime')

            for (const textInd in newContent)
            {
                if(textInd != 0)
                {
                    let dataText = newContent[textInd]

                    let time = dataText.split(' mx-3">')[1].split('<')[0]
                    
                    if(textInd == 1) {prayersJson["Fajr"] = time}
                    if(textInd == 2) {prayersJson["Sunrise"] = time}
                    if(textInd == 3) {prayersJson["Zuhr"] = time}
                    if(textInd == 4) {prayersJson["Asr"] = time}
                    if(textInd == 5) {prayersJson["Maghrib"] = time}
                    if(textInd == 6) {prayersJson["Isha"] = time}
                }
            }
            //console.log(newContent[6])1
        });

    // returning
    //console.log("Calculated!")
    //console.log(prayersJson)
    return [prayersJson, [countryCode, townCity]]
}

async function getTimesByDate(latitude, longitude, country, cCode, townCity, day, month, year)
{
    
    // day > 15
    // month > 10
    // year > 2021

    // const cCode = "GB"
    // const country = "United Kingdom"
    // const townCity = "Hitchin"

    // https://muslimpro.com/en/find?coordinates=51.94921%2C-0.283414&country_code=GB&country_name=United+Kingdom&city_name=Hitchin&date=2021-03&convention=precalc

    var monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    var daysWeekList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var date = new Date()
    date.setDate(day)
    date.setMonth(month - 1)
    date.setFullYear(year)

    const shortDay = daysWeekList[date.getDay()]
    const shortMon = monthsList[month - 1]

    console.log(shortDay + " " +shortMon)

    // https://muslimpro.com/en/find?coordinates=51.94921%2C-0.283414&country_code=GB&country_name=United+Kingdom&city_name=Hitchin&date=2021-03&convention=precalc
    const link = 'https://muslimpro.com/en/find?coordinates='+latitude+'%2C'+longitude+'&country_code='+cCode+'&country_name='+country+'&city_name='+townCity+'&date='+year+'-'+month+'&convention=precalc'

    let timingData;
    let calculationMethod;

    //'https://api.allorigins.win/get?url=${encodeURIComponent(link)}'

    await fetch(link)
        .then(function (res) {
            return res.text();
        })
        .then(data => {
            //console.log(data)

            data = JSON.stringify(data)

            //console.log(data)

            var dataAfter = data.split(shortDay+' '+day+' '+shortMon)[1]

            var todaysData = dataAfter.split("</tr>")[0]

            todaysData = todaysData.split(">")

            const timings = {}

            timings["Fajr"] = todaysData[2]
            timings["Sunrise"] = todaysData[4]
            timings["Zuhr"] = todaysData[6]
            timings["Asr"] = todaysData[8]
            timings["Maghrib"] = todaysData[10]
            timings["Isha"] = todaysData[12]

            for(const prayer in timings)
            {
                var time = timings[prayer]
                var newTime = time.split("</td")[0]

                timings[prayer] = newTime

            }

            console.log(timings)
            timingData = timings

            // Calculation Methods

            let calcMethod = data.split('selected>')[1]
            calcMethod = calcMethod.split("</option")[0]

            calculationMethod = calcMethod
        })

    return [timingData, calculationMethod]
}


// Netlify
app.use(`/.netlify/functions/api`, router);

module.exports = app;
module.exports.handler = serverless(app);

// startup

// npm install express netlify-lambda serverless-http encoding - install default packages
// npm start - start development
// http://localhost:9000/.netlify/functions/api - /routename
// codespace update