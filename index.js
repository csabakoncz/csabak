const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const cool = require('cool-ascii-faces')
const express = require('express')
const path = require('path')
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');
const {crypt_check, crypt_check2} = require('./firebase-auth')
const  cors = require('cors')
const bp = require('body-parser')
const axios = require('axios')

const PORT = process.env.PORT || 5000

const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

if (!PARSE_MASTER_KEY){
  console.log('PARSE_MASTER_KEY must defined as an environment variable!')
  process.exit(13)
}

const parseUrl = `http://localhost:${PORT}/parse`
const dashboardParseUrl = process.env.DASHBOARD_PARSE_URL || parseUrl
const parseDB = process.env.DATABASE_URL + '?ssl=true'

const parseApi = new ParseServer({
  "appId": "ftg-2020",
  "masterKey": PARSE_MASTER_KEY,
  "appName": "ftg-2020",
  "cloud": "./cloud/main",
  "databaseURI": parseDB,
  allowClientClassCreation: false,
  serverURL: parseUrl
})

const parseDashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": dashboardParseUrl,
      "appId": "ftg-2020",
      "masterKey": PARSE_MASTER_KEY,
      "appName": "ftg-2020"
    }
  ],
  trustProxy: 1,
  users: [
    {
      user: "csaba",
      pass: PARSE_MASTER_KEY
    }
  ],
  useEncryptedPasswords: false
})

async function github_auth_cb(req,res){

  // this is the request that should bring us here:
  // https://github.com/login/oauth/authorize?client_id=2424e4e1c3bbe5132a2c&redirect_uri=https://csabak.herokuapp.com/ftg-github-auth/v4/&scope=repo

  let response = await axios.post('https://github.com/login/oauth/access_token',{
    client_id: '2424e4e1c3bbe5132a2c',
    client_secret: GITHUB_CLIENT_SECRET,
    code: req.query.code
    },
    {
      headers:{
        'accept': 'application/json'
      }
    })
    if(response.data.access_token){
      let token_type = response.data.token_type
      let access_token=response.data.access_token
      let token_param=`t=${token_type} ${access_token}`
      res.redirect(301,`https://csabakoncz.github.io/ftg/${req.params.version}#${token_param}`)
    }
    else{
      res.send(response.data)
    }
}

express()
  // .options('*', cors())
  .use(cors())
  .use(express.static(path.join(__dirname, 'public')))
  .use('/parse', parseApi)
  .use('/dashboard', parseDashboard)
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/ftg-github-auth/:version',github_auth_cb)
  .get('/cool', (req, res) => res.send(cool()))
  .post('/crypt_check', bp.json(), crypt_check)
  .post('/crypt_check2', bp.json(), crypt_check2)
  .get('/db', async (req, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM test_table');
      const results = { 'results': (result) ? result.rows : null};
      res.render('pages/db', results );
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })

  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
