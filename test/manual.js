const createXWHEPClient = require('../xwhep-js-client');

const xwhep = createXWHEPClient({
  login: 'admin',
  password: 'adminp',
  hostname: 'localhost',
  port: '4430',
});

//xwhep.sendData("<data><uid>72DED894-8972-4441-961E-D58C73FA5778</uid><accessrights>0x755</accessrights><status>UNAVAILABLE</status></data>").then(console.log);
//xwhep.get("0bd208fc-3322-4c38-8a89-8b7dae374f4d").then(console.log);
xwhep.submit("user", "provider", "creator", "ls", "-la", "stdinContent pouet pouetstdinContent pouet pouetstdinContent pouet pouet").then(console.log);
//xwhep.sendData("<data><uid>25d4ec06-aaa7-11e7-8fc0-27efb7f6d3f7</uid><accessrights>0x755</accessrights><name>stdin.txt</name><status>UNAVAILABLE</status></data>").then(xwhep.uploadData("25d4ec06-aaa7-11e7-8fc0-27efb7f6d3f7", "/Users/mboleg/DGHEP/IEXEC/github/xwhep-js-client/README.md").then(console.log));
//xwhep.sendData("<data><uid>25d4ec06-aaa7-11e7-8fc0-27efb7f6d3f7</uid><accessrights>0x755</accessrights><name>stdin.txt</name><status>UNAVAILABLE</status></data>").then(console.log);
//xwhep.uploadData("d38df5de-663a-4831-8aad-9b8afaed226c", "/Users/mboleg/DGHEP/IEXEC/github/xwhep-js-client/88ff7d74-7154-4139-abfb-f32a586f5be9").then(console.log);
//xwhep.getApps().then(console.log);
