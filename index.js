const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const nodemailer = require('nodemailer');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 10000

// middlewares
app.use(cors())
app.use(express.json())

// Decode JWT
// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization

//   if (!authHeader) {
//     return res.status(401).send({ message: 'unauthorized access' })
//   }
//   const token = authHeader.split(' ')[1]

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//     if (err) {
//       return res.status(403).send({ message: 'Forbidden access' })
//     }
//     console.log(decoded)
//     req.decoded = decoded
//     next()
//   })
// }

// Send Email
const sendMail = (emailData, email) => {

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS
    }
  })

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: emailData?.subject,
    html: `<p>${emailData?.message}</p>`
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);

    }
  })

}

// Database Connection
const uri = process.env.DB_URI
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

async function run() {
  try {
    const homesCollection = client.db('aircnc-db').collection('homes')
    const usersCollection = client.db('aircnc-db').collection('users')
    const bookingsCollection = client.db('aircnc-db').collection('bookings')

    //save user email and generate JWT
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const filter = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options)
      console.log(result)

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1y',
      })
      console.log(token)
      res.send({ result, token })
    })

    //Get all users

    app.get('/users', async (req, res) => {

      const users = await usersCollection.find().toArray()
      console.log(users)
      res.send(users)
    })

    // Get a single user by Email
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }

      const user = await usersCollection.findOne(query)
      console.log(user)
      res.send(user)
    })

    // Get All Homes
    app.get('/homes', async (req, res) => {
      const query = {}
      const cursor = homesCollection.find(query)
      const homes = await cursor.toArray()
      res.send(homes)
    })

    // Get All Homes for host
    app.get('/homes/:email', async (req, res) => {
      const email = req.params.email
      // const decodedEmail = req.decoded.email

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      const query = {
        'host.email': email,
      }
      const cursor = homesCollection.find(query)
      const homes = await cursor.toArray()
      res.send(homes)
    })

    // Get Single Home
    app.get('/home/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const home = await homesCollection.findOne(query)
      res.send(home)
    })

    //Post a home
    app.post('/homes', async (req, res) => {
      const homes = req.body
      const result = await homesCollection.insertOne(homes)
      res.send(result)
    })

    //Save a bookings
    app.post('/bookings', async (req, res) => {
      const bookingData = req.body
      const result = await bookingsCollection.insertOne(bookingData)
      console.log(result);
      sendMail(
        {
          subject: 'Booking Successful!', message: `Booking Id: ${result?.insertedId}`
        },
        bookingData?.guestEmail
      )
      res.send(result)
    })

    //get all bookings by email
    app.get('/bookings', async (req, res) => {
      let query = {}
      const email = req.query.email
      if (email) {
        query = {
          guestEmail: email,
        }
      }
      const bookings = await bookingsCollection.find(query).toArray()
      console.log(bookings)
      res.send(bookings)
    })



    console.log('Database Connected...')
  } finally {
  }
}

run().catch(err => console.error(err))

app.get('/', (req, res) => {
  res.send('Server is running...')
})

app.listen(port, () => {
  console.log(`Server is running...on ${port}`)
})
