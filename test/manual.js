const createXWHEPClient = require('../xwhep-js-client');

const xwhep = createXWHEPClient({
  login: 'login',
  password: 'password',
  hostname: 'hostname',
  port: '443',
});

xwhep.getApps().then(console.log);
