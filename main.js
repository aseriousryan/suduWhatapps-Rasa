const axios = require("axios")
const qrcode = require("qrcode-terminal")

const { Client, LocalAuth } = require("whatsapp-web.js")
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
            // Assuming the response is an array, you can loop through it and log each item
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

client.initialize()
