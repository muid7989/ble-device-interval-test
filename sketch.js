let time;
let frameCountBuffer = 0;
let fps = 0;

const CANVAS_W = 960;
const CANVAS_H = 960;

const GRID_SIZE = 64;

const BUTTON_OFFSET = 8;
const BUTTON_W = GRID_SIZE*3;
const BUTTON_H = GRID_SIZE*2;
const BUTTON_X = GRID_SIZE*1;
const BUTTON_Y = CANVAS_H-GRID_SIZE*3;
const BUTTON_M = GRID_SIZE*0.5;

// for M5
const NAME_PRE = 'UART';
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let bleDevice;
let rxCharacteristic;
let isConnected;
let dataCount;
let dataRate;
let bleSetValue = 8;
let val = [];
let prevTime;
let dataChannel = 0;

let connectButton, startButton, dataButton;

let dataBuf = [];
let dataIndex;
const DATA_SIZE = 200;
let drawIndex;
let logFlag;
const DATA_NUM = 3;

const LOG_W = GRID_SIZE*13;
const LOG_H = GRID_SIZE*4;
const LOG_X = GRID_SIZE*1;
const LOG_Y = GRID_SIZE*2;
const LOG_OFFSET = 10;
const LOG_POINT_SIZE = 6;
const LOG_MOVE_X = 6;
let logGraph = [
	{
		x: LOG_X,
		y: LOG_Y,
		width: LOG_W,
		height: LOG_H,
		offset: LOG_H/2,
		max: 30000,
		color: 'red',
		drawX: 0,
	},
	{
		x: LOG_X,
		y: LOG_Y+LOG_H+GRID_SIZE,
		width: LOG_W,
		height: LOG_H,
		offset: GRID_SIZE*0.5,
		max: 140,
		color: 'blue',
		drawX: 0,
	},
];

const DEBUG = true;
const DEBUG_VIEW_X = 20;
const DEBUG_VIEW_Y = 20;
const DEBUG_VIEW_H = 20;

function preload() {
}
function graphSetup( graph ){
	graph.graphics = createGraphics(graph.width, graph.height);
	graph.graphics.clear();
	graph.graphics.background(0);
	graph.graphics.strokeWeight(1);
	graph.graphics.stroke(255);
	graph.graphics.line(0, graph.height-graph.offset, graph.width, graph.height-graph.offset);
}
function dataChannelFn() {
	dataChannel++;
	if (dataChannel>=val.length){
		dataChannel = 0;
	}
	this.html('data '+dataChannel);
}
function setup() {
	createCanvas(CANVAS_W, CANVAS_H);
	time = millis();
	rectMode(CENTER);

	for (let i=0; i<DATA_SIZE; i++){
		dataBuf[i] = [];
	}
	dataIndex = 0;
	isConnected = false;
	dataCount = 0;
	dataRate = 0;
	drawIndex = 0;
	logFlag = false;

	startButton = buttonInit('start', BUTTON_W, BUTTON_H, BUTTON_X, BUTTON_Y);
	startButton.mousePressed(startFn);
	connectButton = buttonInit('connect', BUTTON_W, BUTTON_H, BUTTON_X+BUTTON_M+BUTTON_W, BUTTON_Y);
	connectButton.mousePressed(connectToBle);
	dataButton = buttonInit('data 0', BUTTON_W, BUTTON_H, BUTTON_X+(BUTTON_M+BUTTON_W)*2, BUTTON_Y);
	dataButton.mousePressed(dataChannelFn);


	for (let i=0; i<logGraph.length; i++){
		graphSetup(logGraph[i]);
	}
	lineGraph(logGraph[1], 10);
}
function buttonInit(text, w, h, x, y) {
	let button = createButton(text);
	button.size(w,h);
	button.position(x+BUTTON_OFFSET,y+BUTTON_OFFSET);
	button.style('font-size', '16px');
	return button;
}
function startFn() {
	if (logFlag){
		logFlag = false;
		console.log(dataBuf);
	}else{
		logFlag = true;
		lossCount = 0;
	}
}
function drawGraph(graph, data) {
	graph.graphics.strokeWeight(LOG_POINT_SIZE);
	let tY = graph.height - data*(graph.height-graph.offset)/graph.max - graph.offset;
	graph.graphics.stroke(graph.color);
	graph.graphics.point(graph.drawX, tY);
	graph.drawX += LOG_MOVE_X;
	if (graph.drawX>=graph.width){
		graph.drawX = 0;
		graphSetup(graph);
	}
}
function lineGraph(graph, val) {
	let tY = graph.height - val*(graph.height-graph.offset)/graph.max - graph.offset;
	graph.graphics.strokeWeight(1);
	graph.graphics.stroke(255);
	graph.graphics.line(0, tY, graph.width, tY);
}
function draw() {
	background(48);
	let current = millis();
	if ( (current-time)>=1000 ){
		time += 1000;
		fps = frameCount - frameCountBuffer;
		frameCountBuffer = frameCount;
		dataRate = dataCount;
		dataCount = 0;
	}
	if (DEBUG){
		stroke(128);
		strokeWeight(1);
		for (let i=0; i<CANVAS_H/GRID_SIZE; i++){
			line(0, i*GRID_SIZE, CANVAS_W, i*GRID_SIZE);
		}
		for (let i=0; i<CANVAS_W/GRID_SIZE; i++){
			line(i*GRID_SIZE, 0, i*GRID_SIZE, CANVAS_H);
		}
	}
	fill(255);
	textSize(16);
	stroke(255);
	strokeWeight(1);
	let debugY = DEBUG_VIEW_Y;
	text('fps:'+fps, DEBUG_VIEW_X, debugY);
	debugY += DEBUG_VIEW_H;
	text('dataRate'+':'+dataRate, DEBUG_VIEW_X, debugY);
	debugY += DEBUG_VIEW_H;
	for (let i=0; i<val.length; i++){
		text(val[i], DEBUG_VIEW_X, debugY);
		debugY += DEBUG_VIEW_H;
	}
	for (let i=0; i<8; i++){
		if (drawIndex==dataIndex){
			break;
		}
//		drawGraph(logGraphXa, dataBuf[drawIndex][1]);
//		drawGraph(logGraphXg, dataBuf[drawIndex][5]);
//		drawGraph(logGraphRate, dataBuf[drawIndex][0]);
		drawGraph(logGraph[0], dataBuf[drawIndex][dataChannel]);
		drawGraph(logGraph[1], dataBuf[drawIndex][val.length-1]);
		drawIndex++;
		if (drawIndex>=DATA_SIZE){
			drawIndex = 0;
		}
	}
	for (let i=0; i<logGraph.length; i++){
		image(logGraph[i].graphics, logGraph[i].x, logGraph[i].y);
	}
}
function writeBLE(val) {
	if (isConnected){
		const data = new Uint8Array([0x00,val]);
		rxCharacteristic.writeValue(data);
		console.log('Write data',data);
	}
}
async function connectToBle() {
	try {
		console.log("Requesting Bluetooth Device...");
		bleDevice = await navigator.bluetooth.requestDevice({
			filters: [{ namePrefix: NAME_PRE }],
			optionalServices: [UART_SERVICE_UUID]
		});
		console.log("Connecting to GATT Server...");
		const server = await bleDevice.gatt.connect();

		console.log("Getting Service...");
		const service = await server.getPrimaryService(UART_SERVICE_UUID);

		console.log("Getting Characteristics...");
		const txCharacteristic = await service.getCharacteristic(
			UART_TX_CHARACTERISTIC_UUID
		);
		txCharacteristic.startNotifications();
		bleTime = millis();
		bleDataCount = 0;
		bleIdealTime = 0;
		bleInterval = 10;
		txCharacteristic.addEventListener(
			"characteristicvaluechanged",
			e => {
				onTxCharacteristicValueChanged(e);
			}
		);
		rxCharacteristic = await service.getCharacteristic(
			UART_RX_CHARACTERISTIC_UUID
		);
		isConnected = true;
	} catch (error) {
		console.log(error);
	}
	function onTxCharacteristicValueChanged(event) {
		dataCount++;
		let receivedData = [];
		for (let i=0; i<event.target.value.byteLength/2; i++){
			receivedData[i] = event.target.value.getInt16(i*2, false);
		}
//		console.log(receivedData);
		for (let i=0; i<receivedData.length; i++){
			val[i] = receivedData[i];
			dataBuf[dataIndex][i] = val[i];
		}
		let currentTime = millis();
		val[receivedData.length] = currentTime-prevTime;
		dataBuf[dataIndex][receivedData.length] = currentTime-prevTime;
		prevTime = currentTime;
		if (logFlag){
			dataIndex++;
			if (dataIndex>=DATA_SIZE){
				dataIndex = 0;
			}
		}
	}
}


