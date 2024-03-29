const axios = require("axios")
const qrcode = require("qrcode-terminal")
const express = require("express")
const app = express()
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js")
const multer = require("multer")
const { createClient } = require("@supabase/supabase-js")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const supabaseUrl = "http://195.35.7.235:8000"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzA1NTkzNjAwLAogICJleHAiOiAxODYzNDQ2NDAwCn0.IOdYznc_Hy78vBQtJOAqObVhhCQOWF2t70K8Gkd3si4"
const supabase = createClient(supabaseUrl, supabaseKey)
const swaggerJSDoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")
const upload = multer()

const port = 3000
app.use(express.json())
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Whatsapp Service",
      version: "1.1.0",
    },
    servers: [
      {
        url: "http://localhost:3000/",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
        },
      },
    },
  },
  apis: ["./main.js"],
}

const swaggerSpec = swaggerJSDoc(options)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox"],
  },
})

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true })
})

client.on("ready", () => {
  console.log("Client is ready!")
})

const authenticate = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - Token missing" })
  }

  jwt.verify(token, "Dqg8vBIGkJ", (err, user) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" })
    }
    req.user = user
    next()
  })
}

app.listen(port, () => {
  console.log(
    `API is running at http://195.35.7.235:${port}, wait until client is ready message is shown before sending requests.`
  )
})

function validateAndFormatPhoneNumber(phoneNumber) {
  const startsWith6 = phoneNumber.startsWith("6")

  const endsWithCus = phoneNumber.endsWith("@c.us")

  if (!startsWith6) {
    phoneNumber = "6" + phoneNumber
  }

  if (!endsWithCus) {
    phoneNumber += "@c.us"
  }

  return phoneNumber
}

client.on("message", async (message) => {
  var chat = await client.getChatById(message.from)
  chat.sendStateTyping()

  const contactnumber = message.from.split("@")
  const url =
    "http://sudu.ai:8000/rest/v1/contact?contact_number=eq." +
    contactnumber[0] +
    "&select=*"

  try {
    const response = await axios.get(url, {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
      },
    })

    if (response.data[0] != null) {
      const userUUID = await getUserUUID(response.data[0].company_id)
      if (userUUID) {
        axios
          .post(
            "http://192.168.1.50:5005/webhooks/rest/webhook",
            `{
            "sender": "${userUUID}",
            "message": "${message.body}"
          }`,
            {
              headers: {
                accept: "application/json",
                "content-type": "application/json",
              },
            }
          )
          .then(function (data) {
            data.data.forEach((item) => {
              console.log(item)
            })
            message.reply(data.data[0].text)
          })
          .catch(function (errors) {
            console.log(errors)
          })
      } else {
        client.sendMessage(message.from, "Error fetching user UUID.")
      }
    } else {
      client.sendMessage(message.from, "You are not a valid user")
    }
  } catch (error) {
    console.log(error)
  }
})

async function getUserUUID(companyId) {
  const companyUrl =
    "http://sudu.ai:8000/rest/v1/company?id=eq." +
    companyId +
    "&select=user_uuid"
  try {
    const companyResponse = await axios.get(companyUrl, {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
      },
    })
    return companyResponse.data[0].user_uuid
  } catch (error) {
    console.log(error)
    return null
  }
}

/**
 * @swagger
 * /register:
 *   post:
 *     summary: This API is used to register a user.
 *     description: This API is used to register a user.
 *     requestBody:
 *       description: User registration data.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: The client ID for registration.
 *               password:
 *                 type: string
 *                 description: The password for registration.
 *               confirmPassword:
 *                 type: string
 *                 description: The confirmed password for registration.
 *     responses:
 *       200:
 *         description: User registered successfully.
 *       400:
 *         description: Bad request.
 *       500:
 *         description: Internal server error.
 */
app.post("/register", async (req, res) => {
  const { clientId, password, confirmPassword } = req.body

  if (!clientId || clientId == null) {
    return res.status(400).json({ error: "clientId is required" })
  }

  if (
    !password ||
    password == null ||
    !confirmPassword ||
    confirmPassword == null
  ) {
    return res
      .status(400)
      .json({ error: "password and confirmPassword is required" })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    // console.log("Hashed Password:", hashedPassword);

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("clientId")
      .eq("clientId", clientId)
      .single()

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Insert a new user with hashed password
    const { error: insertError } = await supabase
      .from("users")
      .upsert([{ clientId, password: hashedPassword }], {
        onConflict: ["clientId"],
      })

    if (insertError) {
      console.error("Supabase Insert Error:", insertError)
      return res.status(500).json({ error: "Failed to register user" })
    }

    // Fetch the registered user data
    const { data: newUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("clientId", clientId)
      .single()

    if (selectError || !newUser) {
      console.error("Supabase Select Error:", selectError)
      return res.status(500).json({ error: "Failed to fetch registered user" })
    }

    //console.log("New User Registered:", newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    })
  } catch (error) {
    console.error("Registration Error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * @swagger
 * /login:
 *   post:
 *     summary: This API is used to log a user in.
 *     description: This API is used to log a user in.
 *     requestBody:
 *       description: User login data.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: The client ID for login.
 *               password:
 *                 type: string
 *                 description: The password for login.
 *     responses:
 *       200:
 *         description: User logged in successfully.
 *       400:
 *         description: Bad request.
 *       500:
 *         description: Internal server error.
 */
app.post("/login", async (req, res) => {
  const { clientId, password } = req.body

  const { data: users, error } = await supabase
    .from("users")
    .select("clientId, password")
    .eq("clientId", clientId)
    .single()

  //console.log("Supabase Query Response:", { users, error })

  if (error || !users) {
    return res.status(401).json({ error: "Invalid credentials" })
  }

  const isPasswordValid = await bcrypt.compare(password, users.password)

  //console.log("Password Comparison Result:", isPasswordValid)

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid credentials" })
  }

  const token = jwt.sign(
    { clientId: users.clientId, role: "user" },
    "Dqg8vBIGkJ",
    { expiresIn: "1h" }
  )

  console.log("Generated Token:", token)

  res.json({ token, clientId: users.clientId })
})

/**
 * @swagger
 * /submit:
 *   post:
 *     security:
 *     - BearerAuth: []
 *     summary: Submit image and message to a contact
 *     description: Submit image and message to a contact
 *     requestBody:
 *       description: Data to be submitted, including an image.
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contact_num:
 *                 type: string
 *                 description: The contact number for the message to be sent to.
 *               clientId:
 *                 type: string
 *                 description: The client ID.
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: The image/document file to be uploaded.
 *               msg:
 *                 type: string
 *                 description: An optional message.
 *     responses:
 *       200:
 *         description: Data submitted successfully.
 *       400:
 *         description: Bad request.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
app.post("/submit", authenticate, upload.single("img"), async (req, res) => {
  try {
    const { contact_num, clientId } = req.body
    const file = req.file

    const missingParameters = []

    if (!file) {
      missingParameters.push("img")
    }
    if (!contact_num) {
      missingParameters.push("contact_num")
    }
    if (!clientId) {
      missingParameters.push("clientId")
    }

    if (missingParameters.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required parameters: ${missingParameters.join(", ")}`,
      })
    }

    if (req.user.clientId !== clientId) {
      return res.status(401).json({ error: "Unauthorized - Invalid clientId" })
    }

    const media = new MessageMedia(
      file.mimetype,
      file.buffer.toString("base64"),
      file.originalname
    )

    const timestamp = new Date().getTime()
    const uniqueFileName = `${timestamp}_${file.originalname}`

    const { data: fileData, error: storageError } = await supabase.storage
      .from("files")
      .upload(uniqueFileName, file.buffer, {
        contentType: file.mimetype,
      })

    if (storageError) {
      throw new Error(storageError.message)
    }

    const updated_contact_num = validateAndFormatPhoneNumber(contact_num)

    const dataToStore = {
      category: "E-INVOICE",
      contact_num,
      clientId,
      img: uniqueFileName,
    }

    if (req.body.msg) {
      dataToStore.msg = req.body.msg
    }

    const { data, error } = await supabase.from("data").upsert([dataToStore])

    if (error) {
      throw new Error(error.message)
    }

    const caption = req.body.msg || null

    const promises = [
      client.sendMessage(updated_contact_num, media, { caption }),
    ]

    Promise.all(promises)
      .then((response) => {
        res.status(200).send({
          success: true,
          responses: response,
          storedData: data,
        })
      })
      .catch((error) => {
        res.status(500).send({ success: false, error: error })
      })
  } catch (error) {
    res.status(500).send({ success: false, error: error.message })
  }
})

client.initialize()
