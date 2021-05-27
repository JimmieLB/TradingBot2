let socket = io();
let value;
let prevValue;
let vlength;
let canvas;
let framerate = 30;
let updated = true;
let previous_min = 0;
let up = 0;
let down = 0;
console.log("a");
socket.on('connection', (socket) => {

});
socket.on('value', (a) => {
    console.log("value");
    a.original.slice(50,101);
    a.sma.slice(0,51);
    a.derivative.slice(0,51);
    value = a;
});

function setup(){
    canvas = createCanvas(window.innerWidth,window.innerHeight);
    background(51);
    frameRate(30);
}

function draw(){
    up = 0;
    down = 0;
    if(value){
        background(51);
        graph(value);
    }
    console.log("up: " + up + ", down: " + down);
}

function graph(v){
    for(let i = 1; i < v.original.length; i++){
        let vcurrent = format({original:v.original[i],sma:v.sma[i],derivative:v.derivative[i]});
        vp = format({original:v.original[i-1],sma:v.sma[i-1],derivative:v.derivative[i-1]});
        if(vcurrent.derivative > 0){
            stroke(255,100,0);
            up++;
        } else {
            stroke(100,255,0);
            down++;
        }
        let distance = width/v.original.length - 1.1;
        let x = i * distance + 0.5 * v.original.length;
        let px = i * distance - distance + 0.5 * v.original.length;
        strokeWeight(2);
        line(px,height - vp.original,x, height - vcurrent.original);
        stroke(255,0.75);
        strokeWeight(.5);
        line(px,0,px,height);
    }
}

function format(v,a){
    let ave = average(value.original);
    let scaleFactor = 10;
    v = {original: (v.original*scaleFactor)-(ave*scaleFactor)+height/2, sma: (v.sma*scaleFactor)-(ave*scaleFactor)+height/2, derivative: v.derivative};
    // v = {original: (v.original-base+50)*15, sma: (v.sma-base+20)*15, derivative: v.derivative};
    return v;
}

function average(list){
    let sum = 0;
    for(let i = 0; i < list.length; i++){
        sum+=list[i];
    }
    return sum/list.length;
}