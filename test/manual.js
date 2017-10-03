const createXWHEPClient = require('../xwhep-client');

const xwhep = createXWHEPClient({
  login: '',
  password: '',
  hostname: '',
  port: '',
});

xwhep.getApps().then(console.log);
