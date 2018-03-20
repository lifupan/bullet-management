'use strict'

const {ipcRenderer} = require('electron') 
const ProgressBar = require('progressbar.js')
var progbar = null
var IP = null
var netcnn = false
var adbdbg = false

//fileType is file or directory
function showOpenDialog(fileType){
         ipcRenderer.send('open' + fileType, [document.getElementById("adbdebug").checked, netcnn, IP]);
         console.log('reivesed ' + fileType);     
}

function showIpInput(checkbox){
    if (checkbox.checked){
    	document.getElementById("ip1").style.display = "inline";
    	document.getElementById("ip2").style.display = "inline";
    	document.getElementById("ip3").style.display = "inline";
    	document.getElementById("ip4").style.display = "inline";
    	document.getElementById("iplabel").innerHTML = "通过网络连接设备,请输入设备的IP地址：";
    	netcnn = true;
    }else{
      document.getElementById("ip1").style.display = "none";
    	document.getElementById("ip2").style.display = "none";
    	document.getElementById("ip3").style.display = "none";
    	document.getElementById("ip4").style.display = "none";
    	document.getElementById("iplabel").innerHTML = "通过网络连接设备";
    	netcnn = false;
    }   
} 
 
function keyUpEvent(obj1)
{
         if (obj1.value > 255)
         {
             alert("填写范围必须在 0 - 255之间","子弹柜管理系统烧写程序");
             obj1.value = obj1.value.substring(0, obj1.value.length - 1);
         }
         if(obj1.value.length == 3 && obj1.nextSibling){
         	   obj1.nextSibling.focus();
         }    
         getipvalue();  
}
function keyUpEventForIp4(obj)
{
         if (obj.value > 255)
         {
             alert("填写范围必须在 0 - 255间");
             obj.value = obj.value.substring(0, obj.value.length - 1);
         }
         
         getipvalue();
}

function getipvalue()
{
     IP = document.getElementById("ip1").value + "." + document.getElementById("ip2").value + "." + document.getElementById("ip3").value + "." + document.getElementById("ip4").value;
}

ipcRenderer.on('hideMainProgramDiv', (event, data) => { 
  document.getElementById("mainProgButton").style.display = "none"; 
  var p = document.getElementById("mainProgShow");
  p.innerHTML = data;
  p.style.display = "inherit";
  
  document.getElementById("mainProgChange").style.display = "inherit";
})

ipcRenderer.on('hideFirmwareDiv', (event, data) => { 
  document.getElementById("firmwareButton").style.display = "none"; 
  var p = document.getElementById("firmwareShow");
  p.innerHTML = data;
  p.style.display = "inherit";
  
  document.getElementById("firmwareChange").style.display = "inherit";
})

ipcRenderer.on('hideMainSelectDiv', (event, hide) => { 
	if(hide)
      document.getElementById("MainSelectDiv").style.display = "none";
  else {
  	  document.getElementById("MainFlashDiv").style.display = "none";
  	//  document.getElementById("MainSelectDiv").style.display = "inherit";
  } 
})

ipcRenderer.on('showProgressBar', (event, data) => {	
	   document.getElementById("MainFlashDiv").style.display = "inherit";
		 progbar = new ProgressBar.Line(container, {
		  strokeWidth: 4,
		  easing: 'easeInOut',
		  duration: 1400,
		  color: '#008000',
		  trailColor: '#eee',
		  trailWidth: 1,
		  svgStyle: {width: '100%', height: '100%'},
		  text: {
		    style: {
		      // Text color.
		      // Default: same as stroke color (options.color)
		      color: '#FFFFFF',
		      position: 'absolute',
		      right: '0',
		      top: '30px',
		      padding: 0,
		      margin: 0,
		      transform: null
		    },
		    autoStyleContainer: false
		  },
		  from: {color: '#FFEA82'},
		  to: {color: '#ED6A5A'},
		  step: (state, bar) => {
		    bar.setText(Math.round(bar.value() * 100) + ' %');
		  }
		});
    
//    progbar.animate(1.0);   
})

ipcRenderer.on('showProgress', (event, data) => {
    progbar.animate(data[0]);
    if(data[0] < 1.0)
        event.sender.send('runCmds', data[1] + 1);
  //      setTimeout(2000, event.sender.send('runCmds', data[1] + 1));
			  	
    //    

})

ipcRenderer.on('showProgressTitle', (event, data) => {
    document.getElementById("FlashDivTitle").innerHTML = data;
})