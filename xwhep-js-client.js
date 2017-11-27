const Debug = require('debug');
const https = require('https');
const { parseString } = require('xml2js');
const fs = require('fs');
const uuidV4 = require('uuid/v4');
const URL = require('url');
const request = require('request');
const json2xml = require('json2xml');
const FormData = require('form-data');
const md5File = require('md5-file');
const fetch = require('node-fetch');
const devnull = require('dev-null');
const through2 = require('through2');
const qs = require('qs');

const debug = Debug('xwhep-js-client');
/*
 * This is the delay between between two get status calls
 * This is in milliseconds
 */
const WAITSTATUSDELAY = 10000;

/**
 * API PATH
 */
const PATH_GETAPPS = '/getapps';
const PATH_GET = '/get';
const PATH_SENDWORK = '/sendwork';
const PATH_REMOVE = '/remove';
const PATH_DOWNLOADDATA = '/downloaddata';
const PATH_SENDDATA = '/senddata';
const PATH_SENDAPP = '/sendapp';
const PATH_UPLOADDATA = '/uploaddata';
const PATH_GETWORKBYEXTERNALID = '/getworkbyexternalid';
// /!\   keep the leading slash
const PATH_ETHAUTH = '/ethauth/';

/**
 * This are cookies names
 */
const STATENAME = 'state';
const ETHAUTHNAME = 'ethauthtoken';


/**
 * This contains work parameters write access.
 * Key is the parameter name
 * Value describes the write access
 */
const workAvailableParameters = {
  uid: false,
  owneruid: false,
  accessrights: true,
  errormsg: true,
  mtime: false,
  userproxy: true,
  sessionuid: true,
  groupuid: true,
  sgid: true,
  expectedhostuid: true,
  isservice: false,
  label: true,
  appuid: true,
  returncode: false,
  server: false,
  listenport: true,
  smartsocketaddr: true,
  smartsocketclient: true,
  envvars: true,
  cmdline: true,
  stdinuri: true,
  dirinuri: true,
  resulturi: false,
  arrivaldate: false,
  completeddate: false,
  readydate: false,
  datareadydate: false,
  compstartdate: false,
  compenddate: false,
  sendtoclient: false,
  local: false,
  active: true,
  replications: true,
  totalr: true,
  sizer: true,
  replicateduid: true,
  datadrivenuri: true,
  maxretry: true,
  retry: false,
  maxwallclocktime: true,
  diskspace: true,
  minmemory: true,
  mincpuspeed: true,
  status: false,
  minfreemassstorage: true,
};

/**
 * This contains application parameters write access.
 * Key is the parameter name
 * Value describes the write access
 */
const appAvailableParameters = {
  uid: false,
  owneruid: false,
  accessrights: true,
  errormsg: true,
  mtime: false,
  name: true,
  isservice: true,
  type: true,
  minfreemassstorage: true,
  avgexectime: false,
  minmemory: true,
  mincpuspeed: true,
  launchscriptshuri: true,
  launchscriptcmduri: true,
  unloadscriptshuri: true,
  unloadscriptcmduri: true,
  nbjobs: false,
  pendingjobs: false,
  runningjobs: false,
  errorjobs: false,
  webpage: true,
  neededpackages: true,
  envvars: true,
  defaultstdinuri: true,
  basedirinuri: true,
  defaultdirinuri: true,
  ldlinux_ix86uri: true,
  ldlinux_x86_64uri: true,
  ldlinux_amd64uri: true,
  ldlinux_ia64uri: true,
  ldlinux_ppcuri: true,
  ldmacos_ix86uri: true,
  ldmacos_x86_64uri: true,
  ldmacos_ppcuri: true,
  ldwin32_ix86uri: true,
  ldwin32_amd64uri: true,
  ldwin32_x86_64uri: true,
  linux_ix86uri: true,
  linux_amd64uri: true,
  linux_x86_64uri: true,
  linux_ia64uri: true,
  linux_ppcuri: true,
  macos_ix86uri: true,
  macos_x86_64uri: true,
  macos_ppcuri: true,
  win32_ix86uri: true,
  win32_amd64uri: true,
  win32_x86_64uri: true,
  javauri: true,
};

/**
 * This contains data parameters write access.
 * Key is the parameter name
 * Value describes the write access
 */
// const dataAvailableParameters = {
//   uid: false,
//   owneruid: false,
//   accessrights: true,
//   errormsg: true,
//   mtime: false,
//   name: true,
//   links: false,
//   insertiondate: false,
//   osversion: true,
//   status: true,
//   type: true,
//   cpu: true,
//   os: true,
//   size: true,
//   md5: true,
//   uri: false,
//   sendtoclient: false,
//   workuid: true,
//   package: true,
//   replicated: false,
// };
/**
 * This contains known CPU names
 * Key is the cpu name
 * Value is true
 */
const knownCPUs = {
  IX86: true,
  X86_64: true,
  IA64: true,
  PPC: true,
  SPARC: true,
  ALPHA: true,
  AMD64: true,
  ARM: true,
};
/**
 * This contains known Operating System (OS) names
 * Key is the OS name
 */
const knownOSes = {
  LINUX: true,
  WIN32: true,
  MACOSX: true,
  SOLARIS: true,
  JAVA: true,
};
/**
 * This retrieves a value from a cookie
 * @param cookie is the cookie
 * @param name is the value name
 * @see http://www.w3schools.com/js/js_cookies.asp
 */
function getCookie(cookie, name) {
  let cValue = cookie.toString();
  let cStart = cValue.toString().indexOf(` ${name}=`);
  if (cStart === -1) {
    cStart = cValue.toString().indexOf(`${name}=`);
  }
  if (cStart === -1) {
    cValue = null;
  } else {
    cStart = cValue.indexOf('=', cStart) + 1;
    let cEnd = cValue.indexOf(';', cStart);
    if (cEnd === -1) {
      cEnd = cValue.length;
    }
    cValue = unescape(cValue.substring(cStart, cEnd));
  }
  return cValue;
}

/**
 * This retrieves the binary field name, given OS and CPU
 * @param _os is the OS name
 * @param _cpu is the CPU name
 */
function getApplicationBinaryFieldName(_os, _cpu) {
  if ((_os === undefined) || (_cpu === undefined)) {
    throw new Error('OS or CPU undefined');
  }

  const os = _os.toUpperCase();
  const cpu = _cpu.toUpperCase();

  if (os === 'JAVA') {
    return 'javauri';
  }

  switch (os) {
    case 'LINUX':
      switch (cpu) {
        case 'IX86':
          return 'linux_ix86uri';
        case 'PPC':
          return 'linux_ppcuri';
        case 'AMD64':
          return 'linux_amd64uri';
        case 'X86_64':
          return 'linux_x86_64uri';
        case 'IA64':
          return 'linux_ia64uri';
        default:
          break;
      }
      break;
    case 'WIN32':
      switch (cpu) {
        case 'IX86':
          return 'win32_ix86uri';
        case 'AMD64':
          return 'win32_amd64uri';
        case 'X86_64':
          return 'win32_x86_64uri';
        default:
          break;
      }
      break;
    case 'MACOSX':
      switch (cpu) {
        case 'IX86':
          return 'macos_ix86uri';
        case 'X86_64':
          return 'macos_x86_64uri';
        case 'PPC':
          return 'macos_ppcuri';
        default:
          break;
      }
      break;
    default:
      break;
  }
  return undefined;
}

const createXWHEPClient = ({
  login = '',
  password = '',
  hostname = '',
  port = '',
}) => {
  const BASICAUTH_CREDENTIALS = Buffer.from(login.concat(':', password)).toString('base64');
  // const MANDATVARIABLENAME = 'MANDATINGLOGIN';


  /**
   * This contains all known application names
   */
  const hashtableAppNames = {};

  /**
   * This throws 'Connection error'
   */
  function connectionError() {
    throw new Error('Connection error');
  }

  /**
   * This sends the work to server
   * This is a private method not implemented in the smart contract
   * @param xmlWork is an XML description of the work
   * @return a new Promise
   * @resolve undefined
   */
  function sendWork(cookies, xmlWork) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const xmldesc = qs.stringify({ XMLDESC: xmlWork });
      const options = {
        hostname,
        port,
        path: `${PATH_SENDWORK}?${state}&${xmldesc}`,
        method: 'GET',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };
      debug('sendWork()', options);

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          resolve();
        });
      });
      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  /**
   * This sends the application to server
   * This is a private method not implemented in the smart contract
   * @param cookies contains the JWT; this is not used if dapp is set
   * @dapp dapp is the identity of the application dapp;
   *           this cancels cookies usage;
   *           this must be used in conjunction with the mandataire defined
   *           by login and password attributes (ligne 326)
   * @param xmlApp is an XML description of the application
   * @return a new Promise
   * @resolve undefined
   * @see login
   * @see password
   */
  function sendApp(cookies, dapp, xmlApp) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_SENDAPP}?${state}&XMLDESC=${xmlApp}`,
        method: 'GET',
        protocol: 'https:',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };
      debug('sendApp()', options);

      const req = https.request(options, (res) => {
        res.on('data', () => {});

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  /**
   * Ref: https://github.com/form-data/form-data
   * This sends the data to server
   * This is a private method not implemented in the smart contract
   * @param dataUid is the uid of the data
   * @param dataPath is the path of the data in local fs
   * @return a new Promise
   * @resolve undefined
   */
  function uploadData(cookies, dataUid, dataPath) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const stats = fs.statSync(dataPath);
      const dataSize = stats.size;

      const dataMD5 = md5File.sync(dataPath);

      const dataForm = new FormData();
      const fileData = fs.readFileSync(dataPath);
      debug('uploadData() dataMD5', dataMD5);
      debug('uploadData() dataSize', dataSize);
      debug('uploadData() fileData', fileData);
      debug('uploadData() typeof dataSize', typeof dataSize);

      dataForm.append('DATAUID', dataUid);
      dataForm.append('DATAMD5SUM', dataMD5);
      dataForm.append('DATASIZE', dataSize);
      dataForm.append('DATAFILE', fileData);

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
      const path = 'https://'.concat(hostname, `${PATH_UPLOADDATA}/${dataUid}?${state}`);
      debug('path', path);
      const options = {
        method: 'POST',
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
        body: dataForm,
      };
      fetch(path, options).then((res) => {
        debug('uploadData() res.statusCode', res.statusCode);
        return res.text();
      }).then((txt) => {
        debug('uploadData()', txt);
        resolve(txt);
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;
      }).catch((e) => { debug('uploadData()', e); reject(e); });
    });
  }

  /**
   * This sends the data to server
   * This is a private method not implemented in the smart contract
   * @param xmlData is an XML description of the data
   * @return a new Promise
   * @resolve undefined
   */
  function sendData(cookies, xmlData) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_SENDDATA}?${state}&XMLDESC=${xmlData}`,
        method: 'GET',
        protocol: 'https:',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };

      debug('sendData()', options);

      const req = https.request(options, (res) => {
        res.on('data', () => {});

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  /**
   * This retrieves an object from server
   * This is a public method implemented in the smart contract
   * @param uid is the uid of the object to retrieve
   * @return a Promise
   * @resolve a String containing the XML representation of the retrieved object
   */
  function get(cookies, uid) {
    return new Promise((resolve, reject) => {
      let getResponse = '';

      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_GET}/${uid}?${state}`,
        method: 'GET',
        protocol: 'https:',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };
      debug('get', options);

      const req = https.request(options, (res) => {
        res.on('data', (d) => {
          const strd = String.fromCharCode.apply(null, new Uint16Array(d));
          getResponse += strd;
        });

        res.on('end', () => {
          debug('get()  res:', getResponse);
          resolve(getResponse);
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  const getWorkByExternalID = (cookies, eid) => (
    new Promise((resolve, reject) => {
      let getResponse = '';
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_GETWORKBYEXTERNALID}/${eid}?${state}`,
        protocol: 'https:',
        method: 'GET',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };

      debug('get', options);

      const req = https.request(options, (res) => {
        res.on('data', (d) => {
          const strd = String.fromCharCode.apply(null, new Uint16Array(d));
          getResponse += strd;
        });

        res.on('end', () => {
          debug('get()  res:', getResponse);
          parseString(getResponse, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
          });
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    })
  );
  /**
   * This retrieves an application
   * This is a private method not implemented in the smart contract
   * @param appUid is the uid of the application to retrieve
   * @return a new Promise
   * @resolve a String containing the XML representation of the retrieved object
   * @see get(uid)
   */
  function getApp(cookies, appUid) {
    return new Promise((resolve, reject) => {
      debug(`getApp(${cookies}, ${appUid}`);
      get(cookies, appUid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          if (err) reject(err);
          jsonObject = result;
        });

        if (jsonObject.xwhep.app === undefined) {
          reject(new Error(`getApp() : Not an application : ${appUid}`));
          return;
        }

        debug('jsonObject.xwhep.app[0]', jsonObject.xwhep.app[0]);
        const appName = jsonObject.xwhep.app[0].name[0];
        debug(`getApp(${cookies}, ${appName})`);

        if (!(appName in hashtableAppNames)) {
          debug(`getApp(${cookies}, inserting ${appName}`);
          hashtableAppNames[appName] = appUid;
        }

        resolve(getResponse);
      }).catch((e) => {
        reject(new Error(`getApp() : Application not found (${appUid}) : ${e}`));
      });
    });
  }


  /**
   * This retrieves registered applications uid
   * This is a private method not implemented in the smart contract
   * @param cookies is an array
   * @return a new Promise
   * @resolve undefined
   * @see getApp(appUid)
   * @see auth(jwtoken)
   */
  function getApps(cookies) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_GETAPPS}?${state}`,
        method: 'GET',
        protocol: 'https:',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };
      let getAppsResponse = '';
      debug('getApps() options', options);
      const req = https.request(options, (res) => {
          debug('getApps() wait res');
          debug(res);
        res.on('data', (d) => {
          debug('getApps onData', d);
          const strd = String.fromCharCode.apply(null, new Uint16Array(d));
          getAppsResponse += strd;
        });
        res.on('end', () => {
            debug('getApps onend');
          parseString(getAppsResponse, (err, jsonData) => {
              debug('parseString done');
              debug('getAppsResponse');
      debug(getAppsResponse);
              debug('err');
              debug(err);

            if (err) return reject(err);

            const appsCount = jsonData.xwhep.XMLVector[0].XMLVALUE.length;
            const appuids = [];
            for (let i = 0; i < appsCount; i += 1) {
              const appuid = jsonData.xwhep.XMLVector[0].XMLVALUE[i].$.value;
              appuids[i] = appuid;
            }
            debug('appuids', appuids);
            const appUidPromises = appuids.map(x =>
              new Promise((reso, rej) =>
                getApp(cookies, x).then(() => {
                  reso();
                }).catch((e) => {
                  rej(new Error(`getApp(${x}) ${e}`));
                })));
            return Promise.all(appUidPromises).then((xmlStr) => {
              resolve(xmlStr);
            }).catch((e) => {
              debug('getApps error ', e);
              reject(new Error(`getApps() : ${e}`));
            });
          });
        });
      });

      req.on('error', (e) => {
        debug('getApps req onError', e);
        reject(new Error(`getApps() : ${e}`));
      });
      req.end();
    });
  }

  /**
   * This sets a parameter for the provided application
   * This is a public method implemented in the smart contract
   * @param uid is the application unique identifier
   * @param paramName contains the name of the application parameter to modify
   * @param paramValue contains the value of the application parameter
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown if application is not found
   * @exception is thrown if paramName does not represent a valid application parameter
   * @exception is thrown if parameter is read only (e.g. status, return code, etc.)
   */
  function setApplicationParam(cookies, uid, paramName, paramValue) {
    debug('setApplicationParam uid', uid);
    debug('setApplicationParam paramName', paramName);
    debug('setApplicationParam paramValue', paramValue);

    if (!(paramName in appAvailableParameters)) {
      return Promise.reject(new Error(`setApplicationParam() : invalid app parameter ${paramName}`));
    }
    if (appAvailableParameters[paramName] === false) {
      return Promise.reject(new Error(`setApplicationParam() : read only app parameter ${paramName}`));
    }

    return new Promise((resolve, reject) => {
      get(cookies, uid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          if (err) reject(err);
          jsonObject = result;
        });

        if (jsonObject.xwhep.app === undefined) {
          reject(new Error(`setApplicationParam : Not an application : ${uid}`));
          return;
        }

        jsonObject.xwhep.app[0][paramName] = paramValue;
        debug('setApplicationParam() paramName', paramName);
        debug('setApplicationParam() paramValue', paramValue);
        debug('setApplicationParam() jsonObject.xwhep.app', jsonObject.xwhep.app);
        const xmlDesc = json2xml(jsonObject, false);

        sendApp(cookies, '', xmlDesc).then(() => {
          resolve();
        }).catch((err) => {
          reject(new Error(`setApplicationParam() error : ${err}`));
        });
      }).catch((e) => {
        reject(new Error(`setApplicationParam(): Work not found (${uid}) : ${e}`));
      });
    });
  }

  /**
   * This registers a new data as stdin for the provided work
   * This is a private method not implemented in the smart contract
   * @param workUid is the work identifier
   * @param stdinContent is a string containing the stdin
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown on error
   */
  function setApplicationBinary(cookies, appUid, _os, _cpu, binaryUrl, _type) {
    return new Promise((resolve, reject) => {
      if ((_os === undefined) || (_cpu === undefined) || (binaryUrl === undefined)) {
        reject(new Error('setApplicationBinary() : OS or CPU undefined'));
        return;
      }

      const os = _os.toUpperCase();
      const cpu = _cpu.toUpperCase();
      const type = _type.toUpperCase();

      if (!(cpu in knownCPUs)) {
        reject(new Error(`setApplicationBinary() : unknown CPU '${cpu}'`));
        return;
      }
      if (!(os in knownOSes)) {
        reject(new Error(`setApplicationBinary() : unknown OS '${os}'`));
        return;
      }

      let binaryURI;
      binaryURI = URL.parse(binaryUrl);

      debug(`setApplicationBinary(${appUid}, ${os}, ${cpu}, ${binaryURI}, ${_type})`);
      debug('setApplicationBinary() binaryURI.protocol', binaryURI.protocol);

      const dataFile = binaryURI.pathname;
      const stats = fs.statSync(dataFile);
      const dataSize = stats.size;
      debug('setApplicationBinary() app size:', dataSize);

      const dataUid = uuidV4();
      const dataDescription = `<data><uid>${dataUid}</uid><accessrights>0x755</accessrights><type>${type}</type><name>fileName</name><cpu>${cpu}</cpu><os>${os}</os><status>UNAVAILABLE</status></data>`;
      sendData(cookies, dataDescription).then(() => {
        uploadData(cookies, dataUid, dataFile).then(() => {
          get(cookies, dataUid).then((getResponse) => {
            let jsonObject;
            parseString(getResponse, (err, result) => {
              jsonObject = JSON.parse(JSON.stringify(result));
            });

            if (jsonObject.xwhep.data === undefined) {
              reject(new Error(`setApplicationBinary() : can't retrieve data: ${dataUid}`));
              return;
            }
            const uriToParse = jsonObject.xwhep.data[0].uri[0];
            binaryURI = URL.parse(uriToParse);

            const appBinaryFieldName = getApplicationBinaryFieldName(os, cpu);
            setApplicationParam(cookies, appUid, appBinaryFieldName, binaryURI.href).then(() => {
              debug(`setApplicationBinary(${appUid}) ${appUid}#${appBinaryFieldName} = ${binaryURI}`);
              resolve();
            }).catch((err) => {
              reject(new Error(`setApplicationBinary() setApplicationParam error : ${err}`));
            });
          }).catch((err) => {
            reject(new Error(`setApplicationBinary() get data error : ${err}`));
          });
        }).catch((err) => {
          reject(new Error(`setApplicationBinary() uploadData error : ${err}`));
        });
      }).catch((err) => {
        reject(new Error(`setApplicationBinary() sendData error : ${err}`));
      });
    });
  }

  /**
   * This registers a new deployable application
   * This is a public method implemented in the smart contract
   * It is the caller responsibility to ensure appName does not already exist
   * @param appName is the application name;
   *        application name is set as 'appName_provider' and this is unic
   *        If one given provider calls this method twice or more,
   *        this does not insert a new application, but updates application
   *        which name is 'appName_provider'
   * @param os  is the binary operating system; must be in knownOSes
   * @param cpu is the binary CPU type; must be in knownCPUs
   * @param binaryUrl is the URI where to find the binary;
   *        binary is uploaded to XWHEP server, if its a 'file://'
   * @return a new Promise
   * @resolve the new app uid
   * @exception is thrown if application is not found
   * @see knownCPUs
   * @see knownOSes
   */
  function registerApp(cookies, user, dapp, provider, appName, _os, _cpu, binaryUrl, _type) {
    return new Promise((resolve, reject) => {
      if ((_os === undefined) || (_cpu === undefined) || (binaryUrl === undefined)) {
        reject(new Error('registerApp() : OS or CPU undefined'));
        return;
      }

      const os = _os.toUpperCase();
      const cpu = _cpu.toUpperCase();
      const type = _type.toUpperCase();

      if (!(cpu in knownCPUs)) {
        reject(new Error(`registerApp() : unknown CPU '${cpu}'`));
        return;
      }
      if (!(os in knownOSes)) {
        reject(new Error(`registerApp() : unknown OS '${os}'`));
        return;
      }


      const appUid = uuidV4();
      debug(`registerApp (${appName}, ${os}, ${cpu}, ${binaryUrl})`);

      const appDescription = `<app><uid>${appUid}</uid><name>${appName}</name><type>DEPLOYABLE</type><accessrights>0x755</accessrights></app>`;
      sendApp(cookies, dapp, appDescription).then(() => {
        setApplicationBinary(cookies, appUid, os, cpu, binaryUrl, type).then(() => {
          resolve(appUid);
        }).catch((err) => {
          reject(new Error(`registerApp() setApplicationBinary error : ${err}`));
        });
      }).catch((err) => {
        reject(new Error(`registerApp() sendApp error : ${err}`));
      });
    });
  }

  /**
   * This registers a new UNAVAILABLE work for the provided application.
   * Since the status is set to UNAVAILABLE, this new work is not candidate for scheduling.
   * This lets a chance to sets some parameters.
   * To make this work candidate for scheduling, setPending() must be called
   * This is a public method implemented in the smart contract
   * @param appName is the application name
   * @return a new Promise
   * @resolve the new work uid
   * @exception is thrown if application is not found
   * @see #setPending(uid)
   */
  function register(cookies, user, dapp, provider, appName, submitTxHash) {
    return new Promise((resolve, reject) => {
      const getAppsLocal = appName in hashtableAppNames ? Promise.resolve : getApps;
      getAppsLocal(cookies).then(() => {
        if (!(appName in hashtableAppNames)) {
          return reject(new Error(`register() : application not found ${appName}`));
        }
        debug('appName %o in hashtableAppNames', appName, appName in hashtableAppNames);
        const workUID = uuidV4();

        const appUID = hashtableAppNames[appName];

        const workDescription = `<work><uid>${workUID}</uid><accessrights>0x755</accessrights><appuid>${appUID}</appuid><sgid>${submitTxHash}</sgid><status>UNAVAILABLE</status></work>`;
        return sendWork(cookies, workDescription).then(() => {
          // a 2nd time to force status to UNAVAILABLE
          sendWork(cookies, workDescription).then(() => {
            resolve(workUID);
          }).catch((err) => {
            reject(new Error(`register() sendWork 2 error : ${err}`));
          });
        }).catch((err) => {
          reject(new Error(`register() sendWork 1 error : ${err}`));
        });
      }).catch(err => reject(new Error(`getAppsLocal() ${err}`)));
    });
  }

  /**
   * This sets a parameter for the provided work.
   * This is a public method implemented in the smart contract
   * @param uid is the work unique identifier
   * @param paramName contains the name of the work parameter to modify
   * @param paramValue contains the value of the work parameter
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown if work is not found
   * @exception is thrown if work status is not UNAVAILABLE
   * @exception is thrown if paramName does not represent a valid work parameter
   * @exception is thrown if parameter is read only (e.g. status, return code, etc.)
   */

  function setWorkParam(cookies, uid, paramName, paramValue) {
    if (!(paramName in workAvailableParameters)) {
      return Promise.reject(new Error(`setWorkParam() : Invalid parameter ${paramName}`));
    }

    if (workAvailableParameters[paramName] === false) {
      return Promise.reject(new Error(`setWorkParam() : read only parameter ${paramName}`));
    }

    return new Promise((resolve, reject) => {
      get(cookies, uid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          if (err) reject(err);
          jsonObject = result;
        });

        if (jsonObject.xwhep.work === undefined) {
          reject(new Error(`setWorkParam(): Not a work : ${uid}`));
          return;
        }
        if (jsonObject.xwhep.work[0].status.toString() !== 'UNAVAILABLE') {
          debug('setWorkParam(', uid, ',', paramName, ',', paramValue, ') invalid Status');
          reject(new Error(`setWorkParam(): Invalid status : ${jsonObject.xwhep.work[0].status}`));
          return;
        }

        jsonObject.xwhep.work[0][paramName] = paramValue;
        debug('setWorkParam(', uid, ',', paramName, ',', paramValue, ')');
        sendWork(cookies, json2xml(jsonObject, false)).then(() => {
          resolve();
        }).catch((err) => {
          reject(new Error(`setWorkParam() sendWork error : ${err}`));
        });
      }).catch((e) => {
        reject(new Error(`setWorkParam(): Work not found (${uid}) : ${e}`));
      });
    });
  }

  /**
   * This retrieves a parameter for the provided work.
   * This is a public method implemented in the smart contract
   * @param uid is the work unique identifier
   * @param paramName contains the name of the work parameter to modify
   * @return a new Promise
   * @resolve a String containing the parameter value
   * @exception is thrown if work is not found
   * @exception is thrown if paramName does not represent a valid work parameter
   */
  function getWorkParam(cookies, uid, paramName) {
    return new Promise((resolve, reject) => {
      get(cookies, uid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          jsonObject = JSON.parse(JSON.stringify(result));
        });

        if (jsonObject.xwhep.work === undefined) {
          reject(new Error(`getWorkParam(): Not a work : ${uid}`));
          return;
        }

        const paramValue = jsonObject.xwhep.work[0][paramName];
        if (paramValue === undefined) {
          reject(new Error(`getWorkParam() : Invalid work parameter : ${paramName}`));
          return;
        }

        resolve(paramValue);
      }).catch((e) => {
        reject(new Error(`getWorkParam(): Work not found (${uid}) : ${e}`));
      });
    });
  }

  /**
   * This retrieves the status for the provided work.
   * This is a public method implemented in the smart contract
   * @param uid is the work unique identifier
   * @return a new Promise
   * @resolve a String containing the parameter value
   * @exception is thrown if work is not found
   * @exception is thrown if paramName does not represent a valid work parameter
   * @exception is thrown if parameter is read only
   * @see #getWorkParam(uid, paramName)
   */
  function getWorkStatus(cookies, uid) {
    return getWorkParam(cookies, uid, 'status');
  }

  /**
   * This sets the status of the provided work to PENDING
   * We don't call setWorkParam() since STATUS is supposed to be read only
   * This is a public method implemented in the smart contract
   * @param uid is the work unique identifier
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown if work is not found
   * @exception is thrown if work status is not UNAVAILABLE
   * @exception is thrown if paramName does not represent a valid work parameter
   * @exception is thrown if parameter is read only (e.g. status, return code, etc.)
   */
  function setPending(cookies, uid) {
    return new Promise((resolve, reject) => {
      get(cookies, uid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          jsonObject = JSON.parse(JSON.stringify(result));
        });

        if (jsonObject.xwhep.work === undefined) {
          reject(new Error(`setPending(): Not a work : ${uid}`));
          return;
        }

        if (jsonObject.xwhep.work[0].status.toString() !== 'UNAVAILABLE') {
          reject(new Error(`setPending(${uid}): Invalid status : ${jsonObject.xwhep.work[0].status}`));
          return;
        }

        jsonObject.xwhep.work[0].status = 'PENDING';
        debug(`setPending(${uid})`, jsonObject);

        sendWork(cookies, json2xml(jsonObject, false)).then(() => {
          resolve();
        }).catch((err) => {
          reject(new Error(`setPending() error : ${err}`));
        });
      }).catch((e) => {
        reject(new Error(`setPending(): Work not found (${uid}) : ${e}`));
      });
    });
  }

  /**
   * This writes a new file
   * This is a private method not implemented in the smart contract
   * @param dataUid is the data identifier
   * @param fileContent is written into new file
   * @return a new Promise
   * @resolve file name
   * @exception is thrown on error
   */
  const writeFile = (dataUid, fileContent) => (
    new Promise((resolve, reject) => {
      const wFile = `/tmp/${dataUid}`;
      fs.writeFile(wFile, fileContent, (err) => {
        if (err) {
          fs.unlink(wFile);
          reject(new Error(`writeFile() writeFile error : ${err}`));
          return;
        }
        resolve(wFile);
      });
    })
  );
  /**
   * This registers a new data as stdin for the provided work
   * This is a private method not implemented in the smart contract
   * @param workUid is the work identifier
   * @param stdinContent is a string containing the stdin
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown on error
   */
  const setStdinUri = (cookies, workUid, stdinContent) => (
    new Promise((resolve, reject) => {
      debug(`setStdinUri(${cookies}, ${workUid}, ${stdinContent})`);
      if ((stdinContent === '') || (stdinContent === undefined)) {
        resolve();
        return;
      }

      debug(`setStdinUri(${workUid})`);
      const dataUid = uuidV4();
      const dataDescription = `<data><uid>${dataUid}</uid><accessrights>0x755</accessrights><name>stdin.txt</name><status>UNAVAILABLE</status></data>`;
      sendData(cookies, dataDescription).then(() => {
        writeFile(dataUid, stdinContent.concat('                                                            ')).then((dataFile) => {
          uploadData(cookies, dataUid, dataFile).then(() => {
            get(cookies, dataUid).then((getResponse) => {
              let jsonObject;
              parseString(getResponse, (err, result) => {
                jsonObject = JSON.parse(JSON.stringify(result));
              });
              if (jsonObject.xwhep.data === undefined) {
                reject(new Error(`setStdinUri() : can't retrieve data: ${dataUid}`));
                return;
              }
              const stdinUri = jsonObject.xwhep.data[0].uri;
              debug(`setStdinUri(${workUid}) : ${stdinUri}`);
              setWorkParam(cookies, workUid, 'stdinuri', stdinUri).then(() => {
                debug(`setStdinUri(${workUid}) ${workUid}#stdinuri = ${stdinUri}`);
                fs.unlink(dataFile);
                resolve();
              }).catch((err) => {
                fs.unlink(dataFile);
                reject(new Error(`setStdinUri() setWorkParam error : ${err}`));
              });
            }).catch((err) => {
              fs.unlink(dataFile);
              reject(new Error(`setStdinUri() get data error : ${err}`));
            });
          }).catch((err) => {
            fs.unlink(dataFile);
            reject(new Error(`setStdinUri() uploadData error : ${err}`));
          });
        }).catch((err) => {
          debug(`setStdinUri() writeFile error : ${err}`);
          reject(new Error(`setStdinUri() writeFile error : ${err}`));
        });
      }).catch((err) => {
        debug(`setStdinUri sendData error : ${err}`);
        reject(new Error(`setStdinUri() sendData error : ${err}`));
      });
    })
  );

  /**
   * This registers a new PENDING work for the provided application.
   * Since the status is set to PENDING, this new work candidate for scheduling.
   * This is a public method implemented in the smart contract
   * @param appName is the application name
   * @param cmdLineParam is the command line parameter. This may be '
   * @return a new Promise
   * @resolve the new work uid
   * @exception is thrown if application is not found
   */
  function submit(cookies, user, dapp, provider, appName, params, submitTxHash) {
    return new Promise((resolve, reject) => {
      debug(`submit(${appName})`);
      register(cookies, user, dapp, provider, appName, submitTxHash).then((workUID) => {
        debug(`submit(${appName}) : ${workUID}`);
        const paramsKeys = Object.keys(params).filter(e => e in workAvailableParameters);
        debug('paramsKeys', paramsKeys);
        debug('params', params);
        const paramsFuncs = paramsKeys.map(e => () => setWorkParam(cookies, workUID, e, params[e]));
        paramsFuncs.reduce(
          (promise, func) => {
            debug('reduce', promise, func);
            return promise.then(result => func().then(Array.prototype.concat.bind(result)));
          },
          Promise.resolve([])
        )
          .then(() => {
            setPending(cookies, workUID).then(() => {
              resolve(workUID);
            }).catch((msg) => {
              reject(new Error('submit() setPending error : ', msg));
            });
          }).catch((msg) => {
            reject(new Error('submit() setWorkParam error : ', msg));
          });
      }).catch((msg) => {
        reject(new Error('submit() register error : ', msg));
      });
    });
  }

  /**
   * This downloads a data
   * This is a private method not implemented in the smart contract
   * @param uri is the data uri
   * @param downloadedPath denotes a file in local fs
   * @return a new Promise
   * @resolve downloadedPath
   * @exception is thrown if work is not found
   * @exception is thrown if work result is not set
   */
  function download(cookies, uri, savePath) {
    return new Promise((resolve, reject) => {
      const uid = uri.substring(uri.lastIndexOf('/') + 1);
      get(cookies, uid).then((data) => {
        let state = '';
        if ((cookies !== undefined) && (cookies[0] !== undefined)) {
          state = STATENAME.concat('=', getCookie(cookies, STATENAME));
        }
        let jsonData;
        parseString(data, (err, result) => {
          if (err) reject(err);
          jsonData = result;
        });
        debug('jsonData', jsonData);
        const fileName = savePath.concat('.', jsonData.xwhep.data[0].type[0].toLowerCase());
        const options = {
          method: 'GET',
          uri: 'https://'.concat(hostname, ':', port, PATH_DOWNLOADDATA, '/', uid, '?', state),
          headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
        };
        debug('get', options);
        console.log(options);

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        let buff = Buffer.from('', 'utf8');
        let full = false;
        const bufferSize = 1 * 1024;
        const outputStream = savePath ? fs.createWriteStream(fileName) : devnull();
        request(options)
          .on('response', () => {})
          .on('error', (response) => {
            debug(`download() : request error ${response}`);
            reject(new Error(`download() : request error ${response}`));
          })
          .pipe(through2((chunk, enc, cb) => {
            if (!full) {
              buff = Buffer.concat([buff, chunk]);
              if (buff.length >= bufferSize) {
                debug('Buffer limit reached', buff.length);
                full = true;
              }
            }
            cb(null, chunk);
          }))
          .pipe(outputStream)
          .on('finish', () => {
            debug('finish event');
            debug('buff.length', buff.length);
            debug('buff.slice(0, bufferSize).length', buff.slice(0, bufferSize).length);
            resolve({ stdout: buff.slice(0, bufferSize).toString(), savePath: fileName, uri });
          });
      }).catch(e => debug('getData', e));
    });
  }

  /**
   * This downloads the provided url
   * This is for testing only
   * @param url is the url to downaload
   * @param downloadedPath is the path to store the download
   * @return a new PRomise
   * @resolve downloadedPath
   */
  function downloadURL(url, downloadedPath) {
    return new Promise((resolve, reject) => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      //      debug(`${url}:${downloadedPath}`);

      const outputStream = fs.createWriteStream(downloadedPath);
      outputStream.on('error', (e) => {
        reject(new Error(`download() : pipe error ${e}`));
      }).on('data', () => {
        //        debug(d);
      }).on('finish', () => {
        resolve(downloadedPath);
      });

      request.get(url)
        .on('response', () => {})
        .on('error', (response) => {
          debug(`downloadURL() : request error ${response}`);
          reject(new Error(`download() : request error ${response}`));
        })
        .pipe(outputStream);
    });
  }

  /**
   * This retrieves the result of the work
   * This is a private method not implemented in the smart contract
   * @param uid is the work unique identifier
   * @return a new Promise
   * @resolve a string containing xml representation of the result metadata or undefined, if not set
   * @exception is thrown if work is not found
   * @exception is thrown if work status is not COMPLETED
   */
  function getResult(cookies, uid) {
    return new Promise((resolve, reject) => {
      get(cookies, uid).then((getResponse) => {
        let jsonObject;
        parseString(getResponse, (err, result) => {
          if (err) reject(err);
          jsonObject = result;
        });
        debug('jsonObject.xwhep.work[0] 1', jsonObject.xwhep.work[0]);
        if (jsonObject.xwhep.work === undefined) {
          reject(new Error(`getResult(): Not a work : ${uid}`));
          return;
        }

        if (jsonObject.xwhep.work[0].status.toString() !== 'COMPLETED') {
          reject(new Error(`getRestult(): Invalid status : ${jsonObject.xwhep.work[0].status}`));
          return;
        }

        if (jsonObject.xwhep.work[0].resulturi === undefined) {
          resolve(undefined);
          return;
        }
        const uri = jsonObject.xwhep.work[0].resulturi.toString();
        const resultUid = uri.substring(uri.lastIndexOf('/') + 1);

        resolve(get(resultUid));
      }).catch((err) => {
        reject(new Error(`getResult() error : ${err}`));
      });
    });
  }

  /**
   * This downloads the result of the work
   * This is a public method not implemented in the smart contract
   * @param uid is the work uid
   * @return a new Promise
   * @resolve a string containing the path of the downloaded result
   * @exception is thrown if work is not found
   * @exception is thrown if work result is not set
   */
  function downloadResult(cookies, uid) {
    return new Promise((resolve, reject) => {
      get(cookies, uid).then((workXML) => {
        debug('workXML', workXML);
        let work;
        parseString(workXML, (err, result) => {
          if (err) reject(err);
          work = result;
        });

        resolve(download(cookies, work.xwhep.work[0].resulturi[0], ''));
      }).catch((error) => {
        debug('downloadResult', error);
        reject(error);
      });
    });
  }

  /**
   * This retrieves the result path
   * This is a public method not implemented in the smart contract
   * @param uid is the work unique identifier
   * @return a new Promise
   * @resolve the work result path on local file system; undefined if work has no result
   * @exception is thrown on local fs error, or if there is no result file for the provided work
   */
  function getResultPath(uid) {
    return new Promise((resolve, reject) => {
      fs.readdir('.', (ferr, files) => { // '/' denotes the root folder
        if (ferr) {
          reject(ferr);
          return;
        }

        files.forEach((file) => {
          if (file.indexOf(uid) !== -1) {
            resolve(file);
          }
        });
        reject(new Error(`getResultPath() : file not found ${uid}`));
      });
    });
  }

  /**
   * This removes the work
   * This is a public method implemented in the smart contract
   * @param uid is the uid of the object to retrieve
   * @return a Promise
   * @resolve undefined
   */
  // eslint-disable-next-line
  function remove(cookies, uid) {
    return new Promise((resolve, reject) => {
      let state = '';
      if ((cookies !== undefined) && (cookies[0] !== undefined)) {
        state = STATENAME.concat('=', getCookie(cookies, STATENAME));
      }
      const options = {
        hostname,
        port,
        path: `${PATH_REMOVE}/${uid}?${state}`,
        method: 'GET',
        protocol: 'https:',
        rejectUnauthorized: false,
        headers: { Authorization: 'Basic '.concat(BASICAUTH_CREDENTIALS) },
      };

      let getResponse = '';
      const req = https.request(options, (res) => {
        res.on('data', (d) => {
          const strd = String.fromCharCode.apply(null, new Uint16Array(d));
          getResponse += strd;
        });

        res.on('end', () => {
          //          debug(getResponse);
          resolve(getResponse);
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  /**
   * This waits the work completion
   * This is a public method not implemented in the smart contract
   * @param uid is the work unique identifier
   * @return a new Promise
   * @resolve undefined
   * @exception is thrown if work is not found
   * @exception is thrown if work status is ERROR
   */
  function waitCompleted(cookies, uid) {
    return new Promise((resolve, reject) => {
      const theInterval = setInterval(() => {
        getWorkStatus(cookies, uid).then((newStatus) => {
          debug(`waitCompleted ${newStatus}`);

          if (newStatus.toString() === 'ERROR') {
            clearInterval(theInterval);
            reject(new Error(`waitCompleted() : work ERROR (${uid})`));
            return;
          }
          if (newStatus.toString() === 'COMPLETED') {
            debug('waitCompleted !');
            clearInterval(theInterval);
            debug('waitCompleted. interval clear !');
            resolve(uid);
            debug('waitCompleted. reseolved!');
            return;
          }
          debug(`waitCompleted sleeping ${WAITSTATUSDELAY}ms : ${uid} (${newStatus})`);
        }).catch((e) => {
          clearInterval(theInterval);
          reject(new Error(`waitCompleted() : ${e}`));
        });
      }, WAITSTATUSDELAY);
    });
  }

  /**
   * This submits a work for the provided application and waits for its completion
   * This is a public method implemented in the smart contract
   * @param appName is the application name
   * @param cmdLineParam is the command line parameter. This may be '
   * @return a new Promise
   * @resolve the workuid and result path
   * @exception is thrown on submission error
   * @exception is thrown if work status is ERROR
   */
  function submitAndWait(cookies, user, dapp, provider, appName, params, submitTxHash) {
    return submit(
      cookies, user, dapp.toLowerCase(), provider.toLowerCase(),
      appName.toLowerCase(), params, submitTxHash
    )
      .then(workuid => waitCompleted(cookies, workuid))
      .then(workuid => downloadResult(cookies, workuid));
  }

  /**
   * This dumps a text file
   * This is a private method not implemented in the smart contract
   * @param path is the text file path
   * @return a new Promise
   * @resolve a String containing the text file content
   */
  function dumpFile(path) {
    return new Promise((resolve, reject) => {
      const readableStream = fs.createReadStream(path);
      let data = '';

      readableStream.on('error', (err) => {
        reject(err);
      });
      readableStream.on('data', (chunk) => {
        data += chunk;
      });

      readableStream.on('end', () => {
        resolve(data);
      });
    });
  }

  /**
   * This the content of the work stdout file
   * This is a public method implemented in the smart contract
   * @param uid is the work uid
   * @return a new Promise
   * @resolve a String containing the text file content
   * @exception is thrown if work is not found
   * @exception is thrown if stdout file is not found
   */
  function getStdout(cookies, uid) {
    return new Promise((resolve, reject) => {
      downloadResult(cookies, uid).then(() => {
        debug(`getStdout() downloaded ${uid}`);
        getResultPath(uid).then((resultPath) => {
          debug(`getStdout() path ${resultPath}`);
          dumpFile(resultPath).then((textContent) => {
            resolve(textContent);
          }).catch((msg) => {
            reject(new Error(`getStdout() : ${msg}`));
          });
        }).catch((msg) => {
          reject(new Error(`getStdout() : ${msg}`));
        });
      }).catch((msg) => {
        reject(new Error(`getStdout() : ${msg}`));
      });
    });
  }

  /**
   * This authenticates to xwhep service
   * @param jwttoken is a signed encoded Json Web Token that must contain 2 fields:
   * -1- iss : the issuer
   * -2- blockchainaddr : the hash of the user public key
   * @return a new Promise
   * @resolve a cookies table to be used to access the server
   */
  function auth(jwtoken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port,
        path: PATH_ETHAUTH,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          Cookie: `${ETHAUTHNAME}=${jwtoken}`,
          'content-type': 'text/plain',
          connection: 'keep-alive',
          accept: '*/*',
        },
      };

      debug('auth() options', options);
      const req = https.request(options, (res) => {
        res.on('data', () => {});

        res.on('end', () => {
          resolve(res.headers['set-cookie']);
        });
      });

      req.on('error', (e) => {
        debug('error', e);
        reject(e);
      });
      req.end();
    });
  }

  return {
    connectionError,
    sendWork,
    sendApp,
    uploadData,
    sendData,
    get,
    getApp,
    getApps,
    registerApp,
    register,
    setApplicationParam,
    setWorkParam,
    getWorkParam,
    getWorkStatus,
    getWorkByExternalID,
    setPending,
    submit,
    download,
    downloadURL,
    getResult,
    downloadResult,
    getResultPath,
    remove,
    waitCompleted,
    submitAndWait,
    dumpFile,
    getStdout,
    auth,
  };
};
module.exports = createXWHEPClient;
