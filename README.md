# xwhep-js-client
JS client lib to interact with XWHEP REST API

# Test
```bash
npm test
```

# Release
first increment ```package.json``` version tag, then
```bash
git tag -a v1.0.1 -m 'v1.0.1'
git push --tags
```

# Example
```js
const createXWHEPClient = require('xwhep-js-client')

const xwhep = createXWHEPClient({
  login: '',
  password: '',
  hostname: 'localhost',
  port: '9443',
})

xwhep.getApps().then(console.log) // print apps from server
```
