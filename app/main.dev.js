/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import axios from 'axios';
import { app, BrowserWindow } from 'electron';
import MenuBuilder from './menu';

const shell = require("node-powershell");

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Create the PS Instance
  // Start the process
  let ps = new shell({
    executionPolicy: 'Bypass',
    noProfile: true,
    usePwsh: true
  });
  
  console.log('test');
  ps.addCommand('./resources/eos/build/programs/nodeos/nodeos -e -p eosio --plugin eosio::chain_api_plugin --plugin eosio::history_api_plugin  --http-validate-host false');
  ps.invoke()
  .then(output => {
    ps.SendSIGKILL();
    ps.dispose();
  })
  .catch(err => {
    console.log(err);
    ps.dispose();
  });

  const webApi = axios.create({
    baseURL: 'http://localhost:8888',
  });

  //setInterval(() => {
  //  webApi.post('/v1/chain/get_info').then(response => { console.log(response.data);});
  //}, 250);

  setTimeout(() => {
    // Start the process
    let ps2 = new shell({
      executionPolicy: 'Bypass',
      noProfile: true,
      usePwsh: true
    });

    // Step 2: Create a Wallet
    // cleos wallet create --file pub_priv.key --name default
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos wallet create --file default_priv.key --name default');
    
    // Load the Tutorial Key: The private blockchain launched in the steps above is created with a default initial key which must be loaded into the wallet (provided below)
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3');
    
    // Step 3: Load BIOS Contract
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos set contract eosio ./resources/eos/build/contracts/eosio.bios -p eosio@active');

    // Step 4: Create Accounts 
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create key --file account.key');
    const privateKey = '5JRur2uWV1XrkAYWbXJHv4axKnJxUhSkTUNcMftXwaGcYEw6wtA';
    const publicKey = 'EOS6AUVuMW5KavgHypax7rAm8ofHezScxnYRdV3d428c7VSEjtoj1';
    // Then we import this key into our wallet:
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos wallet import --private-key ' + privateKey);
    // Create ten User Accounts
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.a ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.b ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.c ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.d ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.e ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.f ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.g ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.h ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.i ' + publicKey + ' ' + publicKey);
    ps2.addCommand('./resources/eos/build/programs/cleos/cleos create account eosio user.j ' + publicKey + ' ' + publicKey);

    ps2.invoke()
    .then(output => {
      console.log(output);
      console.log('asdf');
      ps2.dispose();
    })
    .catch(err => {
      console.log(err);
      ps2.dispose();
    });
  }, 5000);
});
