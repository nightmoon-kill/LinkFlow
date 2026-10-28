const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep portable Windows data beside the executable so the folder can move together.
if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR) {
  const dataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'LinkFlow-data');
  fs.mkdirSync(dataPath, { recursive: true });
  app.setPath('userData', dataPath);
}

function createWindow () {
  // สร้างหน้าต่างแอปพลิเคชัน
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // ซ่อนเมนูบาร์ด้านบน (ถ้าไม่อยากให้มีเมนูแบบเบราว์เซอร์)
  win.setMenuBarVisibility(false);

  // โหลดไฟล์ index.html ของคุณ
  win.loadFile('index.html');
}

// เมื่อ Electron พร้อม จะทำการสร้างหน้าต่าง
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ปิดแอปเมื่อหน้าต่างทั้งหมดถูกปิด (ยกเว้นบน macOS ที่แอปมักจะรันอยู่จนกว่าจะกด Cmd+Q)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});