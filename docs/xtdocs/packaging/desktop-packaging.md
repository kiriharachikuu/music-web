# 桌面端打包教程

本文档介绍如何使用 Electron 将 XingTone Web 打包为 Windows/macOS/Linux 桌面应用。

## 方案选型

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **Electron** | 生态成熟、功能强大、跨平台 | 包体积大（~100MB） | 需要完整桌面体验 |
| **Tauri** | 包体积极小（~5MB）、性能好 | 生态较新、Rust 学习曲线 | 追求轻量级 |
| **PWA** | 无需打包、自动更新 | 功能受限 | 简单应用 |

**推荐使用 Electron**，因为：
- 生态成熟，文档丰富
- 支持所有 Node.js API
- 社区插件多（自动更新、托盘、通知等）

## 工程配置

### 创建 Electron 工程

在项目根目录下创建 `music-desktop` 目录：

```bash
mkdir music-desktop
cd music-desktop
npm init -y
```

### 安装依赖

```bash
npm install --save-dev electron electron-builder
npm install electron-updater
```

### 目录结构

```
music-desktop/
├── build/                  # electron-builder 资源
│   ├── icon.ico           # Windows 图标
│   ├── icon.png           # Linux 图标
│   └── icon.icns          # macOS 图标
├── dist/                   # 构建产物（自动生成）
├── main.js                 # 主进程
├── preload.js              # 预加载脚本
├── package.json
└── electron-builder.yml   # 构建配置
```

### 主进程代码

创建 `main.js`：

```javascript
const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow
let tray

// 判断是否为开发环境
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    title: 'XingTone Music',
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    // 自定义标题栏
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin'
  })

  // 加载前端地址
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // 方式一：加载远程 URL
    mainWindow.loadURL('https://music.your-domain.com')
    
    // 方式二：加载本地打包的静态文件
    // mainWindow.loadFile(path.join(__dirname, 'out/index.html'))
  }

  // 外链在浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, 'build/icon.png')
  ).resize({ width: 16, height: 16 })

  tray = new Tray(icon)
  tray.setToolTip('XingTone Music')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow?.show() },
    { label: '播放/暂停', click: () => mainWindow?.webContents.send('toggle-play') },
    { label: '上一首', click: () => mainWindow?.webContents.send('prev-song') },
    { label: '下一首', click: () => mainWindow?.webContents.send('next-song') },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    createTray()
    
    // 检查更新
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify()
    }
  })
}

app.on('window-all-closed', () => {
  // macOS 上关闭窗口不退出应用
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 自动更新
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available')
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded')
})
```

### 预加载脚本

创建 `preload.js`：

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 播放器控制
  togglePlay: () => ipcRenderer.send('toggle-play'),
  prevSong: () => ipcRenderer.send('prev-song'),
  nextSong: () => ipcRenderer.send('next-song'),
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 自动更新
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  
  // 平台信息
  platform: process.platform
})
```

### package.json 配置

```json
{
  "name": "xingtone-desktop",
  "version": "1.0.0",
  "description": "XingTone Music Desktop App",
  "main": "main.js",
  "author": "XingTone",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder -mwl"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  },
  "dependencies": {
    "electron-updater": "^6.1.7"
  },
  "build": {
    "appId": "com.xingtone.music",
    "productName": "XingTone Music",
    "copyright": "Copyright © 2024 XingTone",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "build/**/*"
    ],
    "publish": {
      "provider": "generic",
      "url": "https://your-domain.com/downloads/"
    },
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "XingTone Music"
    },
    "mac": {
      "target": [
        { "target": "dmg", "arch": ["x64", "arm64"] },
        { "target": "zip", "arch": ["x64", "arm64"] }
      ],
      "icon": "build/icon.icns",
      "category": "public.app-category.music"
    },
    "linux": {
      "target": [
        { "target": "AppImage", "arch": ["x64"] },
        { "target": "deb", "arch": ["x64"] }
      ],
      "icon": "build/icon.png",
      "category": "AudioVideo",
      "synopsis": "XingTone Music Player"
    }
  }
}
```

## 资源准备

### 应用图标

准备以下图标文件：

| 文件 | 格式 | 尺寸 | 用途 |
|------|------|------|------|
| `icon.ico` | ICO | 256x256 | Windows |
| `icon.icns` | ICNS | 1024x1024 | macOS |
| `icon.png` | PNG | 512x512 | Linux |

使用工具生成：
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [Image2Icon](https://github.com/imag11/image2icon)（macOS）

### 安装程序 Banner（可选）

Windows NSIS 安装程序可自定义：
- 侧边栏图片（164x314）
- 顶部横幅（150x57）

## 各平台打包步骤

### Windows

#### 1. 环境准备
- Windows 10/11
- Node.js 20+
- （可选）Windows SDK（用于签名）

#### 2. 打包

```bash
cd music-desktop
npm install
npm run build:win
```

#### 3. 输出文件

```
dist/
├── XingTone Music Setup 1.0.0.exe      # NSIS 安装包
├── XingTone Music 1.0.0.exe             # 便携版
└── latest.yml                            # 自动更新配置
```

#### 4. 代码签名（可选）

购买代码签名证书后：

```bash
# 设置环境变量
set CSC_LINK=certificate.pfx
set CSC_KEY_PASSWORD=your_password

# 重新构建
npm run build:win
```

### macOS

#### 1. 环境准备
- macOS 12+
- Xcode 14+
- Node.js 20+
- Apple Developer 账号（用于签名和公证）

#### 2. 签名配置

```bash
# 导入开发者证书
security import developer_id.p12 -P password

# 配置环境变量
export CSC_LINK=developer_id.p12
export CSC_KEY_PASSWORD=password
export APPLE_ID=your@apple.com
export APPLE_APP_SPECIFIC_PASSWORD=app-specific-password
export APPLE_TEAM_ID=TEAM_ID
```

#### 3. 打包

```bash
npm install
npm run build:mac
```

#### 4. 输出文件

```
dist/
├── XingTone Music-1.0.0.dmg             # DMG 镜像
├── XingTone Music-1.0.0-mac.zip         # ZIP 压缩包
├── XingTone Music-1.0.0-arm64.dmg       # Apple Silicon
└── latest-mac.yml                        # 自动更新配置
```

### Linux

#### 1. 环境准备
- Ubuntu 20.04+
- Node.js 20+
- `sudo apt install -y libopenjp2-tools rpm`

#### 2. 打包

```bash
npm install
npm run build:linux
```

#### 3. 输出文件

```
dist/
├── XingTone Music-1.0.0.AppImage        # AppImage（通用）
├── xingtone-music_1.0.0_amd64.deb       # Debian/Ubuntu
└── latest-linux.yml                       # 自动更新配置
```

## 构建优化配置

### 减小包体积

```json
{
  "build": {
    "asar": true,
    "compression": "maximum",
    "removePackageScripts": true,
    "nodeGypRebuild": false,
    "buildDependenciesFromSource": false
  }
}
```

### 排除不必要的文件

```json
{
  "build": {
    "files": [
      "main.js",
      "preload.js",
      "build/**/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/.bin",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
    ]
  }
}
```

## 自动更新

### 服务端配置

将构建产物上传到服务器：

```
https://your-domain.com/downloads/
├── XingTone Music Setup 1.0.0.exe
├── latest.yml
├── XingTone Music-1.0.0.dmg
└── latest-mac.yml
```

### 客户端检查更新

```javascript
// main.js 中已配置
autoUpdater.checkForUpdatesAndNotify()
```

### 更新流程

1. 应用启动时检查更新
2. 如有新版本，通知用户
3. 用户确认后自动下载
4. 下载完成后提示重启安装

## 常见问题解决方案

### 1. 白屏问题

**原因**：前端地址无法访问或加载失败。

**解决方案**：
- 检查网络连接
- 打开开发者工具查看控制台错误
- 确保后端 API 服务正常运行

### 2. 音乐无法播放

**原因**：Electron 的自动播放策略。

**解决方案**：
- 在 BrowserWindow 配置中添加：
```javascript
webPreferences: {
  autoplayPolicy: 'no-user-gesture-required'
}
```

### 3. Windows 安装包被拦截

**原因**：未签名的安装包被 SmartScreen 拦截。

**解决方案**：
- 购买代码签名证书
- 或告知用户点击「仍要运行」

### 4. macOS 提示「无法打开」

**原因**：未签名或未公证的应用。

**解决方案**：
- 使用开发者证书签名并公证
- 或用户手动允许：系统设置 → 隐私与安全性 → 仍要打开

### 5. AppImage 无法运行

```bash
chmod +x XingTone\ Music-1.0.0.AppImage
./XingTone\ Music-1.0.0.AppImage
```

## 验证方法

### 功能验证清单

- [ ] 应用正常启动
- [ ] 前端页面加载正常
- [ ] 音乐播放正常
- [ ] 托盘菜单功能正常
- [ ] 窗口最小化/最大化/关闭正常
- [ ] 外链在浏览器中打开
- [ ] 自动更新检测正常
- [ ] 通知功能正常
- [ ] 安装/卸载正常

## 发布流程

1. 更新 `package.json` 中的版本号
2. 编写更新日志
3. 执行构建命令
4. 验证各平台安装包
5. 上传到下载服务器
6. 更新 `latest.yml` 等自动更新配置
7. 在管理后台发布新版本信息
