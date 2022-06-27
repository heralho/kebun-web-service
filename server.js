const express = require('express');
const app = express();
const fs = require('fs');

var Gpio = require('onoff').Gpio;
var valveio = new Gpio(21, 'out', { reconfigureDirection: false });

const UrlPath = {
    Spray: "/spray",
    Off: "/off",
    Status: "/status",
    GetSchedule: "/getSchedule",
    SetSchedule: "/setSchedule",
    SetHistory: "/setHistory",
    GetHistory: "/getHistory",
    SetSensor: "/setSensor",
    GetSensor: "/getSensor",
}

const valveState = {
    open: "open",
    close: "close"
}

app.get('*', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

    const json = httpRequestGet(req.path, req)
    res.statusCode = json.code
    res.json(json)
})

function httpRequestGet(urlPath, req) {
    console.log(urlPath)
    var json = {
        code: Number(),
        message: String(),
        data: null
    }
    switch (urlPath) {
        case UrlPath.Spray:
            let interval = req.query.interval
            let auto = req.query.auto || "false"

            if (interval > 0 && interval < 900 && getValve() === 1) {
                setValve(valveState.open)
                setTimeout(function (){setValve(valveState.close)}, (parseInt(interval) * 1000))

                if (auto == "false") {
                    setHistory(`Manual##${interval}##`)
                } else {
                    setHistory(`Automatic##${interval}##`)
                }

                json.code = 200
                json.message = `Success, spray for ${interval} second`
            }
            else if (interval > 0 && interval < 900 && getValve === 0) {
                json.code = 400
                json.message = `Failed, valve is already open`
            }
            else {
                json.code = 400
                json.message = `Failed, Choose spraying duration`
            }

            return json
        case UrlPath.Off:
            setValve(valveState.close)

            json.code = 200
            json.message = `Success, spray stopped`

            return json
        case UrlPath.Status:
            let stats = getValve()

            json.code = 200
            json.message = `Success`
            json.data = {"status": stats == 0 ? "on" : "off"}

            return json
        case UrlPath.GetSchedule:
            if (fs.existsSync('config.json')) {
                var config = fs.readFileSync('config.json')
                jsonData = JSON.parse(config)
                json.code = 200
                json.message = `Success`
                json.data = {"time":`${jsonData.time}`,"enabled":jsonData.enabled,"duration":jsonData.duration}
            } else {
                json.code = 400
                json.message = `Failed, file not found`
            }

            return json
        case UrlPath.SetSchedule:
            let time = req.query.time
            let enabled = req.query.enabled
            let duration = req.query.duration

            if (time != null && enabled != null && duration != null){
                if (fs.existsSync('config.json')) {
                    var config = fs.readFileSync('config.json')
                    var jsonData = JSON.parse(config)
                    jsonData.time = time
                    jsonData.enabled = enabled
                    jsonData.duration = duration
    
                    if ((jsonData.time).length == 4 && jsonData.enabled != null && jsonData.duration != null) {
                        write = JSON.stringify(jsonData)
    
                        fs.writeFileSync('config.json', write);
    
                        json.code = 200
                        json.message = `Success, schedule updated ${jsonData.time.substring(0, 2)}:${jsonData.time.substring(2)} and ${jsonData.enabled == true ? "enabled" : "disabled"}`
                    } else {
                        json.code = 400
                        json.message = `Failed, wrong input`
                    }
                } else {
                    var jsonData = {
                        time: `${time}`,
                        enabled: enabled,
                        duration: duration
                    }
    
                    write = JSON.stringify(jsonData)
    
                    fs.writeFileSync('config.json', write);
    
                    json.code = 201
                    json.message = `Success, schedule created ${jsonData.time.substring(0, 2)}:${jsonData.time.substring(2)}`
                }
            } else {
                json.code = 400
                json.message = `Failed, param is required (time, enabled, duration)`
            }

            return json
        case UrlPath.SetHistory:
            var content = req.query.content;

            
            if (fs.existsSync('history.json')) {
                var history = fs.readFileSync('history.json')
                var arr = JSON.parse(history)

                var data = {
                    time: Date.now(),
                    content: `${content}`
                }

                arr.unshift(data)

                write = JSON.stringify(arr)

                fs.writeFileSync('history.json', write);

                json.code = 200
                json.message = `Success, history saved`
            } else {
                var data = {
                    time: Date.now(),
                    content: `${content}`
                }

                var arr = [data]

                write = JSON.stringify(arr)

                fs.writeFileSync('history.json', write);

                json.code = 201
                json.message = `Success, history created`
            }

            return json
        case UrlPath.GetHistory:
            var limit = req.query.limit || 10
            var dataArr = []

            if (fs.existsSync('history.json')) {
                var history = fs.readFileSync('history.json')
                jsonData = JSON.parse(history)

                json.code = 200
                json.message = `Success`
                dataArr = jsonData.slice(0, limit)
                json.data = dataArr
            } else {
                json.code = 400
                json.message = `Failed, file not found`
            }

            return json
        case UrlPath.SetSensor:
            let sensorname = req.query.sensorName
            let type = req.query.type
            var content = req.query.content

            if (fs.existsSync('sensors.json')) {
                var sensors = fs.readFileSync('sensors.json')
                var arr = JSON.parse(sensors)
                const available = arr.filter(sensor => sensor.sensorName == sensorname).length

                if (available > 0) {
                    var data = {
                        time: Date.now(),
                        sensorName: `${sensorname}`,
                        type: `${type}`,
                        content: `${content}`
                    }

                    const index = arr.findIndex(sensor => sensor.sensorName == sensorname)

                    arr[index] = data

                } else {
                    var data = {
                        time: Date.now(),
                        sensorName: `${sensorname}`,
                        type: `${type}`,
                        content: `${content}`
                    }

                    arr.unshift(data)
                }

                write = JSON.stringify(arr)

                fs.writeFileSync('sensors.json', write);

                json.code = 200
                json.message = `Success, sensor saved`
            } else {
                var data = {
                    time: Date.now(),
                    sensorName: `${sensorname}`,
                    type: `${type}`,
                    content: `${content}`
                }

                var arr = [data]

                write = JSON.stringify(arr)

                fs.writeFileSync('sensors.json', write);

                json.code = 201
                message = `Success, sensor created`
            }

            return json
        case UrlPath.GetSensor:
            var limit = req.query.limit || 10
            var dataArr = []

            if (fs.existsSync('sensors.json')) {
                var sensors = fs.readFileSync('sensors.json')
                jsonData = JSON.parse(sensors)

                json.code = 200
                json.message = `Success`
                dataArr = jsonData.slice(0, limit)
                json.data = dataArr
            } else {
                json.code = 400
                json.message = `Failed, file not found`
            }

            return json
        default:
            json.code = 404
            json.message = `Path not found`

            return json
    }
}

function setHistory(content) {
    
    if (fs.existsSync('history.json')) {
        var config = fs.readFileSync('history.json')
        var arr = JSON.parse(config)

        var data = {
            time: Date.now(),
            content: `${content}`
        }

        arr.unshift(data)

        write = JSON.stringify(arr)

        fs.writeFileSync('history.json', write);

    } else {
        var data = {
            time: Date.now(),
            content: `${content}`
        }

        var arr = [data]

        write = JSON.stringify(arr)

        fs.writeFileSync('history.json', write);
    }
}

function setValve(state) {
    switch (state) {
        case valveState.open:
            valveio.writeSync(0)
            console.log(state)
        default:
            valveio.writeSync(1)
            console.log(state)
    }
}

function getValve() {
    return valveio.readSync()
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Server listering on port ${PORT}...`)
})