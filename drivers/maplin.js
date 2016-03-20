var clone = require('clone');
var deviceList = [];
var tempdata = {};
var LastRX = {};
var signal;
var initFlag = 1;
var pauseSpeed 	= 500;
var lastMessage = '';
var timeoutPeriod =500;
var incomingtimeoutflag = true;
var inmessageQ = [];
var incomingQueTimer;
var lastTXMessageID;
var passedTest =0.00001;
var failedTest =0.00001 ;

function createDriver(driver) {
	var self = 
		{
			init: function( devices, callback ) 
			{
				//Define signal
				if(initFlag)
					{
					console.log('Maplin: Init')
				
					
					
					initFlag = 0;
					var Signal = Homey.wireless('433').Signal;
					
					
					//manchester
					signal = new Signal(
                        {   
                        sof: [], //Start of frame,
                        eof: [1,1,1], //high,  End of frame,
                        words: [
                            [1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],    	//Short Long Long SHort
                            [1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0]		//Short, long, Short, Long
                            ],
                        manchesterUnit:     130,    // was 134 set to microsecond duration of single digit for manchester encoding
                        manchesterMaxUnits: 12,     //maximal succeeding units without edges for manchester encoding
                        interval: 13270,            //Time between repetitions,  this is the time between the a complete message and the start of the next
                        repetitions: 8,             //basic remotes send the whole message 8 times,
                        sensitivity: 0.8, 
                        minimalLength: 12,
                        maximalLength: 12
                        });
					
	
						signal.register(function( err, success ){
							if(err != null)
								{
								console.log('Maplin: err', err, 'success', success);
								}
						});
							
							
						console.log('Start listening for Maplin Commands');
					
						//Start receiving
						signal.on('payload', function(payload, first)
							{
							//should prevent boucing, but need dim value therefore used alternative method
							 if(!first)return;
			
							//Convert received array to usable data
							var rxData = parseRXData(payload); 
							
							//console.log('RXdata at first point of recieve:', rxData);
							
							ManageIncomingRX(self, rxData)
							
						});
					}
							
			//Refresh deviceList
			devices.forEach(function(device)
				{
				console.log('Refresh Device List Driver:', device.driver, device.id);
				addDevice(device);
				});
				callback();
			},//end if init
		

			deleted: function( device_data ) 
			{
				var index = deviceList.indexOf(getDeviceById(device_data));
				delete deviceList[index];
				//console.log('LW item: Device deleted, you will need to manually remove homey from the device');
			},//end of deleted
		
			capabilities: {
						onoff: {
							get: function( device_data, callback ) 
								{
									//console.log('capabilities get onoff');
									var devices = getDeviceByAddress(device_data);
									devices.forEach(function(device){
										//console.log('get',device );
										//console.log('get',device.onoff );
										callback( null, device.onoff );
									});
								},
								
							set: function( device_data, onoff, callback ) 
								{
									//console.log('Setting device');
									//console.log('device In',device_data);
									//console.log('deviceList',deviceList);
									
									
									
									//gets the devices by  Channel and Unit
									//This way all devices on the same channel get correctly updated
									
									
									var devices = getDeviceByChannelandUnit(device_data);
									
									//console.log('devices Found', device_data);
									
									
									//console.log('id', device_data.id);
									
									devices.forEach(function(device){
										
										sendOnOff(device_data, onoff);
										updateDeviceOnOff(self, device, onoff);
										
										//console.log('set',device );
										//console.log('set',device.onoff );
									});	
	
									
									callback( null, onoff );
								}
						}		
		}, 
	
		
		pair: function( socket ) {
			//console.log('pair socket at ',displayTime());
			//This is the first call to set temp data for a socket
			socket.on('imitate1', function( data, callback )
				{
					//console.log('imitate1 at ',displayTime());
					var address = [];
					for(var i = 0; i < 20; i++)
						{
							address.push(Math.round(Math.random()));
						}	
					address = bitArrayToString(address);
				
				//data send back from front end.					
				tempdata = 
					{
					address		: address,
					channel    	: data.channel,
					unit   		: data.unit,
					onoff  		: true,
					}	
				console.log('Data from front end',tempdata);
			
				sendOnOff(tempdata, true);
				socket.emit('datasent');
				
				///maybe need to try
				//*******************************************************************************************
				callback(null, tempdata.onoff);
				//*******************************************************************************************
				//callback();
			});
			
	
			///????????
			//This is continuing to run after the pairing is closed
			///????????
			
			//Testing of Remote
			socket.on('test_device', function( data, callback ){
				 
				signal.on('payload', function(payload, first){   
					// not sure if this should be singlan once or on
					console.log('Check coimments on test_device ',displayTime());
					console.log('test device - payload recieved ',displayTime());
					
					if(!first)return;
			        var rxData = parseRXData(payload);
				
					if((rxData.channel > 0)){
				
						console.log('No RXdata');
					}else{
						console.log('Channel in Remote Testing', rxData.channel);
			       
						if(rxData.onoff){
							socket.emit('received_on'); //Send signal to frontend
						}else{
							socket.emit('received_off'); //Send signal to frontend
						}
					
					}
				});
				callback(null, tempdata.onoff);
			});
			
			

			//Testing of Remote
			socket.on('plugData', function( data, callback )
				{
					console.log('Socket data recieved',data);
					
					
					callback(null, data);
				
				
				
				});
				
				
				
				
				
				
			//Testing of Remote
			socket.on('remote', function( data, callback )
				{
				//console.log('remote socket at ',displayTime());
					signal.on('payload', function(payload, first)
						{
							//console.log('remote payload at ',displayTime());
							if(!first)return;
							//console.log('Remote Detected at ',displayTime());
							
							
			        		var rxData = parseRXData(payload);
							
							//added for remote
							var address = [];
							for(var i = 0; i < 20; i++)
								{
									address.push(Math.round(Math.random()));
								}	
							address = bitArrayToString(address);
							
							if((rxData.channel > 0)){
								console.log('No RXdata');
								
								}else
								{
									console.log('RXdata has length' , rxData.length);
									console.log('Channel in Remote Testing', rxData.channel);
									tempdata = 
										{
										address		: address,
										channel    	: rxData.channel,
										unit   		: rxData.unit,
										command		: rxData.command,
										onoff  	   	: rxData.onoff,
										}		
								
									console.log('Temp Data stored at',displayTime());
									socket.emit('remote_found');
									callback(null, tempdata.onoff);
								}
							
							});
						
		
					
				});
				
							
			//Testing of remote	
			socket.on('generate', function( data, callback )
				{
					//console.log('generate at ',displayTime());
					signal.on('payload', function(payload, first)
						{
							
							//console.log('generate payload at ',displayTime());
							if(!first)return;
			        		var rxData = parseRXData(payload);
							
							//console.log('tempdata', tempdata);
							
			       			if(rxData.address == tempdata.address ){
							if(rxData.onoff){
								socket.emit('received_on'); //Send signal to frontend
								}else{
								socket.emit('received_off'); //Send signal to frontend
							}
							}
						});
				
					callback(null, tempdata.onoff);
				});// end of socket on
				
		socket.on('saveRemote', function( onoff, callback )
				{
					console.log('SaveRemote at ',displayTime());	
					console.log('No action is taken just flipping of the switch');		
					///added for remote end
					//console.log('tempdata', tempdata);
							
					callback();
				});
				
		//Sending Test Data to Socket or Light		
		socket.on('sendSignal', function( onoff, callback )
				{
					//console.log('SendSignal at ',displayTime());
					if(onoff != true){
						onoff = false;
						}
					sendOnOff(tempdata, onoff);
					var devices = getDeviceById(tempdata);
					
					//devices.forEach(function(device){
						updateDeviceOnOff(self, tempdata, onoff)
					//});	
						
					callback();
				});
				
		socket.on('remote_done', function( data, callback )
				{
					//console.log('Remote Done at ',displayTime());
				});
				
				
							
		socket.on('done', function( data, callback )
				{
					console.log('emit Done at', displayTime());
					var idNumber = Math.round(Math.random() * 0xFFFF);
					var id = tempdata.address;
					var name =  __(driver); //__() Is for translation
					//console.log('adding device in socket on');
					
				
					addDevice({
						id       	: id,
						address  	: tempdata.address,
						channel   	: tempdata.channel,
						unit   		: tempdata.unit,
						onoff    	: false,
						driver   	: driver,
						});
					//console.log('LWSocket: Added device: ID',id);
				
					//Share data to front end
					callback(null, 
						{
							name: name,
							data: {
								id       	: id,
								address  	: tempdata.address,
								channel   	: tempdata.channel,
								unit   		: tempdata.unit,
								onoff    	: false,
								driver   	: driver,
								}
						});
				});
		},
	};
	return self;
}





function ManageIncomingRX(self, rxData){
	
	
	//no ID in RS data,  will just process data anyway
	var devices = getDeviceById(rxData);
	
	if ((rxData.channel + rxData.unit + rxData.Command) !=0)
	{
	
					
//  devices.forEach(function(device){
		  console.log('*****************Pay load received - Maplin****************');
		  console.log(displayTime());
		  console.log('New message:Channel', rxData.channel, 
							  ' unit:',rxData.unit ,  
							  ' Command:', rxData.Command);
	
		  LastRX = rxData;	  
	//	  updateDeviceOnOff(self, device, rxData.onoff);					
		  flowselection( LastRX);
	//	  lastTXMessageID = device.id;
		  //clears the last value after 2 seconds
	//	  setTimeout(function(){lastTXMessageID =''; }, 2000); 
	//  });
	}	
}

function getDeviceByChannelandUnit(deviceIn) {
	var matches = deviceList.filter(function(d){
		return	d.channel == deviceIn.channel && 
				d.unit == deviceIn.unit;
	});
	return matches ? matches : null;
}

	
function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function getDeviceByDriver(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.driver == deviceIn.driver;
	});
	return matches ? matches[0] : null;
}


function getDeviceByAddress(deviceIn) {
	var matches = deviceList.filter(function(d){
		return d.address == deviceIn.address; 
	});
	return matches ? matches : null;
}

function updateDeviceOnOff(self, device, onoff){
	//console.log('Update device OnOff called', device);
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}





function addDevice(deviceIn) {
	//console.log('Adding device - Device Data', deviceIn);
	
	deviceList.push({
		id       			: deviceIn.id,
		address				: deviceIn.address,
		channel   			: deviceIn.channel,
		unit   				: deviceIn.unit,
		onoff    			: deviceIn.onoff,
		driver   			: deviceIn.driver
	});	
}

function sendOnOff(deviceIn, onoff) {
	
	var device = clone(deviceIn);
	
	var command =0;
	
	//console.log('****************Send on off*****************');
	if(device === undefined)
	{
		console.log('In send on off the device is undefined');
	}
		
	if( onoff == false){
		//send off
		command =4;
		deviceIn.onoff = true; 
	}
	else if(onoff == true){
		//send on
		command =1;
		deviceIn.onoff = false;
	}
	
	

		//add Para1
		
	var dataToSend = createTXarray(deviceIn.channel, deviceIn.unit, command);
	//console.log(dataToSend);
	
	var frame = new Buffer(dataToSend);
	
	console.log('Data to Send', dataToSend);
	
	signal.tx( frame, function( err, result ){
   		if(err != null)console.log('LWSocket: Error:', err);
	});
	
		//need to make this work to send data back,  call back is in capabilities
		//callback( null, deviceIn.onoff ); //Callback the new dim
}

///Flow Section*************************************************************************************************************

function flowselection(rxData){
	
	console.log('Flow device RX', rxData);
	
	
	console.log('Flow Selection lw100');
	console.log('Command', rxData.Command);
			
	if (rxData.Command == 1){
		console.log('Flow lw100 remoteOn');
		Homey.manager('flow').trigger('mp01remoteOn');	
	}
	
	if (rxData.Command == 0){
		console.log('Flow lw100 remoteOff');
		Homey.manager('flow').trigger('mp01remoteOff');				
	}
	
}


Homey.manager('flow').on('trigger.mp01remoteOn', function( callback, args ){
	
	console.log('lw100remoteOn fired in flow. arg:', args);
		
	if(args.channel == LastRX.channel && args.unit == LastRX.unit ){
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
		console.log('Flow canceled -did not cancel the flow');
		//callback( null, false ); 
	}	 
});

Homey.manager('flow').on('trigger.mp01remoteOff', function( callback, args ){
	
	
		
	if(args.channel == LastRX.channel && args.unit == LastRX.unit){
		console.log('lw100remoteOff fired in flow. arg:', args);
		console.log('Flow approved');
    	callback( null, true );   	
   }else{
	   	console.log('lw100remoteOff fired in flow. arg:', args);
		console.log('Flow canceled');
		callback( null, false ); 
	}	 
});




///END Flow Section*************************************************************************************************************





//Receiver Section*************************************************************************************************************
//Used as a look up array for the possible words transmitted by lightwaveRF
var transcodes = [
				 '0000',
				 '1000',
   	 			 '0100',
   			 	 '0010',
    			 '0001',
    			 '1111']
				 
function createTXarray(channel, unit, command){
	
	
	var txSignal =[];
	
	var str;
	str = transcodes[parseInt(channel,10)];
		//str = transcodes[0];

	for (var i = 0, len = str.length; i < len; i++) {
  		txSignal.push(str[i]);
	}
		
	str = transcodes[parseInt(unit,10)];
		//str = transcodes[0];

	for (var i = 0, len = str.length; i < len; i++) {
  		txSignal.push(str[i]);
	}	
	
		
	str = transcodes[parseInt(command,10)];
		//str = transcodes[0];

	for (var i = 0, len = str.length; i < len; i++) {
  		txSignal.push(str[i]);
	}	
		
//console.log(txSignal);

return txSignal;
}
		
		
		
		
		

				 
				 
				 
function parseRXData(data) {

console.log('RXdata Recieved',data);
	var valid = true;

	if (data != undefined) {
		
		
		if ((data[0] + data[1] + data[2] + data[3]) !=1)
		{valid =false;
		}else{
		var channel = data[0].toString() + data[1].toString() + data[2].toString() + data[3].toString()
		channel = parseInt(channel, 2);
		switch (channel){
			case 1:
				channel =4;
				break;
			case 2:
				channel =3;
				break;
			case 4:
				channel =2;
				break;
			case 8:
				channel =1;
				break;
			default: 
				valid =false;
		}
		
		}
		
		
		if ((data[4] + data[5] + data[6] + data[7]) !=1)
		{valid =false;
		}else{
			var unit = data[4].toString() + data[5].toString() + data[6].toString() + data[7].toString()
			unit = parseInt(unit, 2);
			switch (unit){
				case 1:
					unit =4;
					break;
				case 2:
					unit =3;
					break;
				case 4:
					unit =2;
					break;
				case 8:
					unit =1;
					break;
				default: 
        			valid =false;
			}
		
		}
		
		
		
		var Command = data[8]+data[9]+data[10]+data[11];	
		if (Command > 1){
			valid = false;
		}
	
		var onoff = false;
		
		if(valid){
			if (Command == 1){Command =0;}else{Command =1;}
			console.log('Parse data Ch:', channel, 'unit:', unit, 'command:', Command);
		
			if(Command == 1){
				//Turn On
				onoff = true;
				}
			else{
				//Turn Off
				onoff = false;
			}
	
	passedTest +=1;
		
		}else{
			
			//getting triggerd alot
			failedTest +=1;
			channel 	=0;
			unit 	=0;
			Command =0;		
			onoff   = false;		
		}
		var passrate = (passedTest / (passedTest +failedTest))*100;
		passrate = passrate.toFixed(1) ;
		console.log('RXdata',channel, unit, Command, passrate,'%');
		return { 
			channel 				: channel,
			unit 				: unit,
			Command  			: Command,
			onoff    			: onoff
			};
		
	}
}


function dec2bin(dec){
    return (dec >>> 0).toString(2);
}

function binarytoString(str) {
  return str.split(/\s/).map(function (val){
    return String.fromCharCode(parseInt(val, 2));
  }).join("");
}

function bitStringToBitArray(str) {
    var result = [];
    for (var i = 0; i < str.length; i++)
        result.push(str.charAt(i) == 1 ? 1 : 0);
    return result;
};

				

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bitArrayToString(bits) {
    return bits.join("");
};

function numberToBitArray(number, bit_count) {
    var result = [];
    for (var i = 0; i < bit_count; i++)
        result[i] = (number >> i) & 1;
    return result;
};

function displayTime() {
    var str = "";

    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10) {
        minutes = "0" + minutes
    }
    if (seconds < 10) {
        seconds = "0" + seconds
    }
    str += hours + ":" + minutes + ":" + seconds + " ";
    if(hours > 11){
        str += "PM"
    } else {
        str += "AM"
    }
    return str;
}

module.exports = {
	createDriver: createDriver
};