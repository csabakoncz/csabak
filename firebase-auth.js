var admin = require("firebase-admin");
const secp256k1 = require('ethereum-cryptography/secp256k1')
const { sha256 } = require("ethereum-cryptography/sha256");
const sigUtil = require('eth-sig-util')

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT

if (!FIREBASE_SERVICE_ACCOUNT){
  console.log('FIREBASE_SERVICE_ACCOUNT must defined as a base64 encodeed JSON environment variable!')
  process.exit(13)
}

var serviceAccount = JSON.parse(Buffer.from(FIREBASE_SERVICE_ACCOUNT,'base64').toString())

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ftg-2020.firebaseio.com"
});

exports.crypt_check=crypt_check
exports.crypt_check2=crypt_check2

async function crypt_check(req,res){
    if(!req.body){
        res.status(400).send({msg:'Post request body'})
        return
    }

    // console.log('req.body', req.body)

    // let reqJson = JSON.parse(req.body)
    //body-parser does the job:
    let reqJson = req.body

    let user = reqJson.user
    let pass = reqJson.pass

    // console.log('user', user)
    // console.log('pass', pass)

    if(!user || !pass){
        res.status(400).send({msg: 'Post user and pass in the request body'})
        return
    }

    let pubKey = Buffer.from(user,'hex')
    let signature = Buffer.from(pass,'hex')

    let pubKeyHash = sha256(Buffer.from(user, "ascii"))

    let check = secp256k1.ecdsaVerify(signature, pubKeyHash, pubKey)

    if(check){
        let token = await admin.auth().createCustomToken(user, {csaba:'works?'})
        res.status(200).send({user:user, token});
    }
    else{
        res.status(401).send({msg:'check failed'});
    }

  }

async function crypt_check2(req,res){

  if(!req.body){
      res.status(400).send({msg:'Post request body'})
      return
  }

  let reqJson = req.body

  let user = reqJson.user
  let pass = reqJson.pass

  // console.log('user', user)
  // console.log('pass', pass)

  if(!user || !pass){
      res.status(400).send({msg: 'Post user and pass in the request body'})
      return
  }

  let msg = user
  let sig = pass

  const msgParams = {
    data: msg,
    sig: sig
  };

  const recovered = sigUtil.recoverPersonalSignature(msgParams);
  const address = user

  let check = (address == recovered)

  if(check){
      let token = await admin.auth().createCustomToken(user, {csaba : 'custom info'})
      res.status(200).send({user:user, token});
  }
  else{
      res.status(401).send({msg:'check failed'});
  }

}

