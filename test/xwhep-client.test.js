const createXWHEPClient = require('../xwhep-js-client');

console.log = () => {};

const xwhep = createXWHEPClient({
  login: 'login',
  password: 'password',
  hostname: 'hostname',
  port: '443',
});

test('getApps()', async () => {
  expect.assertions(1);
  return expect(xwhep.getApps()).resolves.toBeTruthy();
});
