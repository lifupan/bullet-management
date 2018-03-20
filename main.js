'use strict'

const electron = require('electron');
const rd = require('rd');
const fileExists = require('file-exists');
const directoryExists = require('directory-exists');
const { spawn } = require('child_process');
const { spawnSync } = require('child_process');
const _ = require('lodash');
const Path = require('path');
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const kernel ='uImage';
const apks = 'apks';

const EXIT_CODES = require('./lib/exit-codes');
const BrowserWindow = electron.BrowserWindow;

require('electron-debug')({showDevTools: false});

var mainWindow = null;
var mainProgram = null;
var firmwareDir = null;
var cmdsTotal = 0;
var cmdsNum = 0;
const debug = false;
var adbdebug = false;
var	netconnect = false;
var	IP = null;

global.fileToOpen = null;

process.env.PATH += ";" + Path.join(__dirname, '..', '..', 'tools')

// 打包程序

//end of 打包程序

electron.app.on('window-all-closed', electron.app.quit);

// Sending a `SIGINT` (e.g: Ctrl-C) to an Electron app that registers
// a `beforeunload` window event handler results in a disconnected white
// browser window in GNU/Linux and macOS.
// The `before-quit` Electron event is triggered in `SIGINT`, so we can
// make use of it to ensure the browser window is completely destroyed.
// See https://github.com/electron/electron/issues/5273
electron.app.on('before-quit', () => {
  process.exit(EXIT_CODES.SUCCESS)
})

ipcMain.on('openFile', (event, path) => { 
     var mainPrograms = dialog.showOpenDialog({properties: ['openFile'], filters: [{ name: 'apk', extensions: ['apk'] }]})
     if (! mainPrograms){
     	   return;  
     }
     
     mainProgram = mainPrograms[0];
     console.log("open file " + mainProgram);
     
     if(!fileExists.sync(mainProgram))
         return;
     event.sender.send('hideMainProgramDiv', mainProgram);
})  

ipcMain.on('openDirectory', (event, path) => { 
     var firmwareDirs = dialog.showOpenDialog({properties: ['openDirectory']})
     if (! firmwareDirs){
     	   return;  
     }
     
     firmwareDir = firmwareDirs[0]      
     console.log("open file " + firmwareDir);
     
     if(!fileExists.sync(Path.join(firmwareDir, kernel))) {
         	firmwareDir = null;
         	dialog.showErrorBox('固件路径不对', '路径里没有 uImage 文件！');
         	return;
     }
     
     if(!directoryExists.sync(Path.join(firmwareDir, apks))) {
          firmwareDir = null;
          dialog.showErrorBox('固件路径不对', '路径里没有 apks 文件夹！');
          return;
     }
     
     event.sender.send('hideFirmwareDiv', firmwareDir);
}) 

ipcMain.on('openFlash', (event, data) => { 
	   cmdsTotal = 0;
	   cmdsNum = 0;
	   adbdebug = data[0];
	   netconnect = data[1];
	   IP = data[2];
	   if(netconnect)
	       console.log('using IP:' + IP + ' to connect the device.');
	   if(!(mainProgram || firmwareDir)) {
	   	    dialog.showErrorBox('没有选择任何可烧写的文件', '请至少选择主程序和固件目录其中的一个！');
         	return;
	   }
	   event.sender.send('hideMainSelectDiv', true);
//	   dialog.showErrorBox('没有选择任何可烧写的文件', Path.join(__dirname, '..', '..', 'tools'));

     event.sender.send('showProgressBar', '');
 //    dialog.showMessageBox({ message: Path.join(__dirname, '..', '..', 'tools') + ';\n' + Path.join(__dirname, 'tools') + '\n' + process.env.PATH, buttons: ["OK"] });
     console.log(Path.join(__dirname, '..', '..', 'tools') + ';' + Path.join(__dirname, 'tools'));
     if(netconnect) {
		      const conncmd = spawn('adb', ['connect', IP], {
			   	    cwd: process.cwd(),
			   	    env: {
			   		      PATH: Path.join(__dirname, '..', '..', 'tools') + ';' + Path.join(__dirname, 'tools') + ';' + process.env.PATH
			   	    }   		
			   	});
	   }
	   
	   const cmd = spawn('adb', ['wait-for-device'], {
	   	    cwd: process.cwd(),
	   	    env: {
	   		      PATH: Path.join(__dirname, '..', '..', 'tools') + ';' + Path.join(__dirname, 'tools') + ';' + process.env.PATH
	   	    }   		
	   	});

     cmd.stdout.on('data', (data) => {
			  console.log('stdout:'+ data);
			});

			cmd.stderr.on('data', (data) => {
			  console.log('stderr: ' + data);
			});

			cmd.on('close', (code) => {
				var ret = 0;
			  console.log('child process exited with code: ' + code);

			  if(firmwareDir)
			    cmdsTotal = 36;
			  if(adbdebug)
			    cmdsTotal += 1;
			  if(mainProgram && !firmwareDir)
			  	cmdsTotal = 15;
			    
			  if(code == 0){
			  	  if(!firmwareDir && mainProgram)
			         event.sender.send('showProgress', [0, 8]);
			      else
			      	 event.sender.send('showProgress', [0, 0]);
				}
			});			
})  

function runCmdSync(cmd, paras, weight, num, event) {
	  
	  console.log("---------start to run: "+paras.join(" "));
	  if(debug)
	      event.sender.send('showProgressTitle', '执行命令： '+ paras.join(' ') + cmdsNum);
	 
	  const sync = spawnSync(cmd, paras, {
	   	    cwd: process.cwd(),
	   	    env: {
	   		      PATH: Path.join(__dirname, 'tools') + ';' + process.env.PATH
	   	    }   		
	  });
	  
	  console.log("---------stdout from cmd : "+paras.join(" ")+" "+ sync.stdout);
	  console.log("---------stderr from cmd : "+paras.join(" ")+" "+ sync.stderr);
	  return sync.status;
}

function runCmd(cmd, paras, weight, num, event) {
	
	  cmdsNum += weight;
	  
	  console.log("---------start to run: "+paras.join(" "));
	  if(debug)
	      event.sender.send('showProgressTitle', '执行命令： '+ paras.join(' ') + ' ' +num + ' cmdsTotal=' + cmdsTotal);
	 
	  const async = spawn(cmd, paras, {
	   	    cwd: process.cwd(),
	   	    env: {
	   		      PATH: Path.join(__dirname, 'tools') + ';' + process.env.PATH
	   	    }   		
	  });
     
    async.stdout.on('data', (data) => {
			  console.log('stdout:'+ data);
		});

		async.stderr.on('data', (data) => {
			  console.log('stderr: ' + data);
		});

	  async.on('close', (code) => {
				var ret = 0;
			  console.log('child process exited with code: ' + code);
			  if(code == 0){
			      event.sender.send('showProgress', [num/cmdsTotal, num]);
				}else{
					event.sender.send('showProgressTitle', '执行命令： '+ paras.join(' ') + '失败了...');
				}
		});			    
}

ipcMain.on('runCmds', (event, num) => {
    var ret = 0;
    
    if(num == cmdsTotal){
		  	cmds = 'reboot';
		  	cmds = cmds.split(' ')
		  	
		  	ret = runCmd('adb', cmds, 1, num, event);
		  	event.sender.send('showProgressTitle', '烧写完毕，重启系统中...');
		  	return ret;
		}
    	
    	if(num == 1){    	
		    event.sender.send('showProgressTitle', '升级固件中，请勿关闭烧写程序...');
		    var cmds = ['shell', 'mount', '-t', 'ext4', '/dev/block/mmcblk0p1', '/mnt/media_rw/sdcard1/'];
		    return runCmd('adb', cmds, 1, num, event);	
      }
      
      if(num == 2){
		    if(!fileExists.sync(Path.join(firmwareDir, 'logo.bmp'))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到 logo.bmp 文件！');
		         	return 1;
		    }    
		    cmds = ['push', Path.join(firmwareDir, 'logo.bmp'), '/mnt/media_rw/sdcard1/'];
				return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 3){
		    if(!fileExists.sync(Path.join(firmwareDir, kernel))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到' + kernel + ' 文件！');
		         	return 1;
		    }    
		    cmds = ['push', Path.join(firmwareDir, kernel), '/mnt/media_rw/sdcard1/'];
				return runCmd('adb', cmds, 1, num, event);
      }   
		    
		  if(num == 4){
		    cmds = ['shell', 'mount', '-o', 'remount,rw', '/system'];
				return runCmd('adb', cmds, 1, num, event); 
		  }
		  
		  if(num == 5){     
		    cmds = ['push', Path.join(firmwareDir, 'bootanimation.zip'), '/system/media'];
		    if(!fileExists.sync(Path.join(firmwareDir, 'bootanimation.zip'))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到 bootanimation.zip 文件！');
		         	return 1;
		    }
				return runCmd('adb', cmds, 1, num, event);
      }
       
      if(num == 6){
		    cmds = ['push', Path.join(firmwareDir, 'install-recovery.sh'), '/system/bin'];
		    if(!fileExists.sync(Path.join(firmwareDir, 'install-recovery.sh'))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到 install-recovery.sh 文件！');
		         	return 1;
		    }
				return runCmd('adb', cmds, 1, num, event);   
		  }
		  
		  if(num == 7){  
		    cmds = ['push', Path.join(firmwareDir, 'backlight'), '/system/bin'];
		    if(!fileExists.sync(Path.join(firmwareDir, 'backlight'))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到 backlight 文件！');
		         	return 1;
		    }
				return runCmd('adb', cmds, 1, num, event);   
		  }
		  
		  if(num == 8){  
		    rd.eachSync(Path.join(firmwareDir, 'apks'), function (f, s) {
		    	  
		    	  console.log("---------"+f + "=====ext is" + Path.extname(f));
		    	  if(Path.extname(f) != '.apk')
		    	      return; 
		        // 每找到一个文件都会调用一次此函数
		        // 参数s是通过 fs.stat() 获取到的文件属性值
		        
		        cmds = ['install', '-rd', f];
		        ret = runCmdSync('adb', cmds, 1, num, event);
				    return ret;
		            
		    });
		    
		    event.sender.send('showProgress', [cmdsNum/cmdsTotal, num]);
		  }
		  
		  	//mainProgram install 
			if(num == 9){
				  if(!mainProgram)
				      num +=5 ;
			    cmds = ['shell', 'mount', '-o', 'remount,rw', '/system'];
					return runCmd('adb', cmds, 1, num, event); 
			}
			 
			if(num == 10){  
			    cmds = ['uninstall', 'com.bullet'];
					return runCmd('adb', cmds, 1, num, event);
			 }
			 
			if(num == 11){
			  	cmds = 'shell rm -rf /system/priv-app/com.bullet-*';
			  	cmds = cmds.split(' ')
			  	return runCmd('adb', cmds, 1, num, event);
			}
			
			if(num == 12){
			  	cmds = 'shell rm -rf /data/data/com.bullet';
			  	cmds = cmds.split(' ')
			  	return runCmd('adb', cmds, 1, num, event);
			}
			
			if(num == 13){
				  cmds = 'install -rd '+ mainProgram;
			  	cmds = cmds.split(' ')
			  	runCmd('adb', cmds, 1, num, event);
			  	event.sender.send('showProgressTitle', '正在安装主程序，请勿关闭烧写程序...');
			  	return;
			}
			
			if(num == 14){
			  	cmds = 'shell cp -rf /data/app/com.bullet-*  /system/priv-app/';
			  	cmds = cmds.split(' ')
			  	return runCmd('adb', cmds, 1, num, event);
			}
		  
		//  sleep(1000);
		  
		  if(num == 15){
		    cmds = ['install', '-rdg', Path.join(firmwareDir, 'wmaupdate.apk')];
		    if(!fileExists.sync(Path.join(firmwareDir, 'wmaupdate.apk'))) {
		         	firmwareDir = null;
		         	dialog.showErrorBox('固件路径不对', '路径里没有找到 wmaupdate.apk 文件！');
		         	return 1;
		    }
				return runCmd('adb', cmds, 1, num, event);   
		  }
		  
		  if(num == 16){
		    cmds = ['shell', 'cp', '-rf', '/data/app/com.easyiot.hw.wmaupdate-*/', '/system/priv-app/'];
				return runCmd('adb', cmds, 1, num, event);   
		  }
		  
		  if(num == 17){
		    cmds = ['uninstall', 'com.easyiot.hw.wmaupdate'];
				return runCmd('adb', cmds, 1, num, event);   
		  }
		  
		  if(num == 18){
		  	event.sender.send('showProgressTitle', '修改系统配置，请勿关闭烧写程序...');
		  	rd.eachSync(Path.join(firmwareDir, 'data'), function (f, s) {
		    	  if(directoryExists.sync(f) && (f != Path.join(firmwareDir, 'data'))){
		    	    console.log("---------upload "+f);
			        cmds = ['push', f, '/data/data'];
			        ret = runCmdSync('adb', cmds, 1, num, event);
					    return ret; 
					  }  
		    });
		    
		    event.sender.send('showProgress', [cmdsNum/cmdsTotal, num]);
		    return;
		  }

      if(num == 19){
      	cmds = ['shell', 'chown',  '--reference=/data/data/com.android.settings', '/data/data/com.android.settings/databases'];
				return runCmd('adb', cmds, 1, num, event);
      }
      
      if(num == 20){
      	cmds = ['shell', 'chown',  '--reference=/data/data/com.android.settings', '/data/data/com.android.settings/shared_prefs'];
				return runCmd('adb', cmds, 1, num, event);
      }

      if(num == 21){
      	cmds = ['shell', 'chown',  '--reference=/data/data/com.iflytek.speechcloud', '/data/data/com.iflytek.speechcloud/files', '/data/data/com.iflytek.speechcloud/shared_prefs'];
				return runCmd('adb', cmds, 1, num, event);
      }
      
      if(num == 22){
      	cmds = ['shell', 'chown',  '--reference=/data/data/com.google.android.inputmethod.pinyin', '/data/data/com.google.android.inputmethod.pinyin/shared_prefs', '/data/data/com.google.android.inputmethod.pinyin/files'];
				return runCmd('adb', cmds, 1, num, event);
      }
	    				    
		  if(num == 23){
		  	rd.eachSync(Path.join(firmwareDir, 'data'), function (f, s) {
		    	 if(directoryExists.sync(f) && (f != Path.join(firmwareDir, 'data'))){
		    	    rd.eachSync(f, function (ff, s) {
		    	    	  if(directoryExists.sync(ff) && (ff !=  f)){
		    	    	  	  rd.eachSync(ff, function (fff, s) {
		    	    	  	  	 if(fileExists.sync(fff) && (fff != ff)){
										        console.log("---------chmod "+fff);
										        cmds = ['shell', 'chown', '--reference=/data/data/'+Path.basename(f) + '/' + Path.basename(ff), '/data/data/'+Path.basename(f)+'/'+Path.basename(ff)+'/'+Path.basename(fff)];
										        ret = runCmdSync('adb', cmds, 1, num, event);
										        cmds = ['shell', 'chmod', '660', '/data/data/'+Path.basename(f)+'/'+Path.basename(ff)+'/'+Path.basename(fff)];
										        ret = runCmdSync('adb', cmds, 1, num, event);
												    return ret; 
												 }
											});
									} 
							}); 
				   }
		    });
		    
		    event.sender.send('showProgress', [cmdsNum/cmdsTotal, num]);
		  	
		  } 
	//	  sleep(1000);
		  
		  if(num == 24){
		  	cmds = ['shell', 'settings', 'put', 'system', 'screen_off_timeout', '-1'];
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 25){
      	cmds = ['shell', 'grep', '-v', '"qemu\.hw\.mainkeys"', '/system/build.prop', '>', '/system/build.prop1', '&&', 'mv', '/system/build.prop1', '/system/build.prop', '&&', 'chmod', '644', '/system/build.prop'];
				return runCmd('adb', cmds, 1, num, event);
      }
      
      if(num == 26){
		  	cmds = ['shell', 'echo', '"qemu.hw.mainkeys=1"', '>>', '/system/build.prop'];
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		//  sleep(1000);
		  
		  if(num == 27){
		  	cmds = "shell settings put secure lockscreen.disabled 1";
		  	cmds = cmds.split(' ');
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 28){
		  	cmds = "shell settings put secure user_setup_complete 0";
		  	cmds = cmds.split(' ');
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 29){
		  	cmds = 'shell settings put global device_provisioned 0';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 30){
		  	cmds = 'shell settings put global ethernet_on 2';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }

		  if(num == 31){
		  	cmds = 'shell setprop persist.sys.timezone Asia/Shanghai';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }

		  if(num == 32){
		  	cmds = 'shell setprop persist.sys.country CN';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 33){
		  	cmds = 'shell setprop persist.sys.language zh';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
		  if(num == 34){
		  	cmds = 'shell pm disable com.android.launcher';
		  	cmds = cmds.split(' ')
		  	return runCmd('adb', cmds, 1, num, event);
		  }
		  
	//	  sleep(2000);
		  
		  if(num == 35){
      	cmds = ['shell', 'grep', '-v', '"service\.adb\.tcp\.port"', '/system/build.prop', '>', '/system/build.prop1', '&&', 'mv', '/system/build.prop1', '/system/build.prop', '&&', 'chmod', '644', '/system/build.prop'];
				return runCmd('adb', cmds, 1, num, event);
      }
      
      if(num == 36){
      	cmds = ['shell', 'echo', '"service.adb.tcp.port=5555"', '>>', '/system/build.prop'];
      	return runCmd('adb', cmds, 1, num, event);
      }		 				
       	    	   
    return 0;
})

electron.app.on('ready', () => {
  // No menu bar
  electron.Menu.setApplicationMenu(null)

  mainWindow = new electron.BrowserWindow({
    width: 800,
    height: 380,
    useContentSize: true,
    show: false,
    resizable: false,
    fullscreen: false,
    titleBarStyle: 'hidden-inset',
    icon: Path.join(__dirname, 'assets', 'icon.png')
  })

  // Prevent flash of white when starting the application
  mainWindow.on('ready-to-show', mainWindow.show)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // For some reason, Electron shortcuts are registered
  // globally, which means that the app listers for shorcuts
  // even if its not currently focused, potentially interferring
  // with shorcuts registered by other applications.
  // As a workaround, we register all shortcuts when the windows
  // gains focus, and unregister them when the windows loses focus.
  // See http://electron.atom.io/docs/api/global-shortcut/

  mainWindow.on('focus', () => {
    electron.globalShortcut.register('CmdOrCtrl+Alt+I', () => {
      mainWindow.webContents.openDevTools({
        mode: 'detach'
      })
    })

    // Disable refreshing the browser window
    // This is supposed to be handled by the `will-navigate`
    // event, however there seems to be an issue where such
    // event is not fired in macOS
    // See: https://github.com/electron/electron/issues/8841
    electron.globalShortcut.register('CmdOrCtrl+R', _.noop)
    electron.globalShortcut.register('F5', _.noop)
  })

  mainWindow.on('blur', () => {
    electron.globalShortcut.unregisterAll()
  })

  // Prevent the user from being allowed to zoom-in the application.
  //
  // This function should be called on the renderer process. We use
  // `executeJavaScript()` rather than moving this to a file in the
  // renderer process for convenience, since we have all other
  // electron desktop experience fixes in this file.
  //
  // See https://github.com/electron/electron/issues/3609
  mainWindow.webContents.executeJavaScript('require(\'electron\').webFrame.setZoomLevelLimits(1, 1);')

  // Prevent external resources from being loaded (like images)
  // when dropping them on the WebView.
  // See https://github.com/electron/electron/issues/5919
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  mainWindow.loadURL(`file://${Path.join(__dirname, 'index.html')}`)
})
