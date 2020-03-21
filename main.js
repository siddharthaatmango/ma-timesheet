const { app, BrowserWindow, ipcMain, Tray } = require('electron');
const path = require('path');
const url = require('url');

let tray = undefined;
let win = undefined;

// Don't show the app in the doc
app.dock.hide();

app.on('ready', () => {
  createTray();
  createWindow();
});


// Now, let’s see what our createTray() method looks like!
const createTray = () => {
  tray = new Tray(path.join('16x16.png'));
  tray.on('click', function (event) {
    toggleWindow();
  })
}

// When we click on the icon, the toggleWindow() method is called:
const toggleWindow = () => {
  win.isVisible() ? win.hide() : showWindow();
}

// This is a simple show / hide method. We’re using a one-line if statement; if the window is visible, hide it. If not, show it. The isVisible() method comes from Electron. Here is our showWindow() method:
const showWindow = () => {
  const position = getWindowPosition();
  win.setPosition(position.x, position.y, false);
  win.show();
}


// Since we want the window to be shown under our icon, we need to get the position of the icon and then set the position of the window to be right under it. To achieve this, we create a getWindowPosition() method:
const getWindowPosition = () => {
  const windowBounds = win.getBounds();
  const trayBounds = tray.getBounds();

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4)
  return { x: x, y: y }
}


// This code is pretty self-explanatory; We get the position of the tray and then center the window accordingly. We then return the x and y coordinates to our showWindow() method.
// And with this, our tray is complete! All we need now is to define the createWindow() method:

const indexPath = url.format({
  protocol: 'file:',
  pathname: path.join(__dirname, 'index.html'),
  slashes: true
});

const createWindow = () => {
  win = new BrowserWindow({
    width: 320,
    height: 450,
    show: false,
    frame: false,
    closable: true,
    transparent: false
  });
  win.loadURL(indexPath);
  // Hide the window when it loses focus
  win.on('blur', () => {
    if (!win.webContents.isDevToolsOpened()) {
      win.hide();
    }
  });
  win.webContents.openDevTools();
}

ipcMain.on('show-window', () => {
  showWindow()
})