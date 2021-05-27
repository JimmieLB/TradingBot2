const Alpaca = require('@alpacahq/alpaca-trade-api')
const config = require("./config") || {keyId:"YOUR_KEY_HERE",secretKey:"SECRET_KEY_HERE"};
const d3nLine = require('d3node-linechart');
const output = require('d3node-output');
const SMA = require("technicalindicators").SMA; // SMA means simple moving averages
const moment = require("moment");

let alpaca = new Alpaca({
    keyId: config.MY_API_TOKEN,
    secretKey: config.SECRET_API_KEY,
    paper: true
});


let smas50 = []; 
let stock = "TSLA"
let values;

async function getCash(){
    const account = await alpaca.getAccount();
    return account.buying_power;
}

async function initialValues(){
    let data = await alpaca.getBars('1Min',stock,{
        limit:100,
        until: new Date()
    });
    let closedValues = [];
    let keyvalue = [];
    data = data[stock];
    for (a in data){
        closedValues.push(data[a].closePrice);
        keyvalue.push({key:localTime(data[a].startEpochTime), value:data[a].closePrice});
    }
    createPNG(keyvalue);

    let priceDerivatives = differentiate(closedValues);
    let smas50 = new SMA({period: 50, values: closedValues});
    let smas50d = new SMA({period: 50, values: priceDerivatives})

    
    // console.log(smas50);
    // console.log(differentiate(smas50.result));
    // console.log(smas50d.result);

    values = {original:smas50.price,sma:smas50.result,derivative:priceDerivatives};
    return values;
}

function differentiate(smas){
    let derivatives = [];
    for(let i = 0; i < smas.length - 1; i++){
        derivatives.push(smas[i + 1] - smas[i]);
    }
    return derivatives;
}

function localTime(epoch){
    return moment.utc(epoch).local();
}

function createPNG(data){
    // output(
    //     "./output",
    //     d3nLine({
    //         data: data,
    //         container: `<div id="container"><h2>Multiline Example</h2><div id="chart"></div></div>`,
    //         lineColors: ["steelblue", "darkorange"],
    //         width: 800,
    //         height: 570
    //     })
    // );
}


initialValues();


const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { O_NOFOLLOW } = require('constants');
const io = new Server(server);

let connections = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html');
});

app.use( express.static( __dirname + '/client' ));

io.on("connection", (socket) => {
    connections[socket.id] = socket;
    initialValues().then((value) => {
        io.emit("value",value);
    }).catch((error) => {console.log(error);});
    socket.on('disconnect',() => {
        delete connections[socket.id];
    });
});


server.listen(3000, () => {
  console.log('listening on *:3000');
  order();
  on_step();
});

let buys = 0;


function buy(){
    if(openHours()){
        console.log("buy");
        getCash().then((cash) => {
            alpaca.createOrder({
                symbol: stock,
                qty: 1,
                side: "buy",
                type: "market",
                time_in_force: "day"
            });
            buys+=1;
        });
    }
}

function sell(){
    if(openHours()){
        console.log("sell");
        if(buys > 0){
            alpaca.createOrder({
                symbol: stock,
                qty: buys,
                side: "sell",
                type: "market",
                time_in_force: "day"
            });
            buys = 0;
        }
    }
}

function openHours(){
    let now = new Date();
    return ((now.getHours() == 9 && now.getMinutes() >= 30 ) || now.getHours() > 9) && now.getHours() <= 16;
}

function order(){
    initialValues().then((value) => {
        io.emit("value",value);
        strategy();
    }).catch((error) => {console.log(error);});
}

function strategy(){
    let value = values;
    if(value.derivative[value.derivative.length - 1] > .2 && value.original[value.original.length - 1] > value.sma[value.sma.length - 1]){
        buy();
    } else if(value.original[value.original.length - 1] > value.sma[value.sma.length - 1]){
        sell();
    }
}

function on_step(){
    setTimeout(() => {
        order();
        on_step();
    }, 60 * 1000);
}