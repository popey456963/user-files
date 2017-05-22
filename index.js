const express = require('express')
const fs = require('fs')
const moment = require('moment')
const exec = require('child_process').exec
const app = express()

app.set('view engine', 'pug')
app.use(express.static('public'))

function escape(cmd) {
  return '\'' + cmd.replace(/\'/g, "'\\''") + '\''
}

function formatDate(date) {
  return moment(date).format('MMMM Do YYYY, h:mm:ss a')
}

app.get('/create/:user', (req, res) => {
  console.log(`[~] ${req.params.user} loaded the create certificate page.`)
  res.render('create')
})

app.get('/create/:user/:name', (req, res) => {
  let regex = /^(?!\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)[^\|\*\?\\:<>/$"]*[^\.\|\*\?\\:<>/$"]+$/
  if (!regex.test(req.params.name)) {
    return res.render('create', { error: '<strong>Error!</strong>  Invalid file name.' })
  }
  if (~req.params.name.indexOf('-')) {
    return res.render('create', { error: '<strong>Error!</strong>  Dashes are not allowed.' })
  }

  console.log(`[+] ${req.params.user} created a certificate with name ${req.params.name}.`)
  exec(`/home/popey/openvpn/openvpn-create.sh ${escape(req.params.user)}-${escape(req.params.name)}`, (error, stdout, stderr) => {
    setTimeout(() => {
      exec(`mv ~/${escape(req.params.user)}-${escape(req.params.name)} ./keys/`, (error, stdout, stderr) => {
        setTimeout(() => {
          res.redirect(`/${req.params.user}`)
        }, 500)
      })
    }, 1000)
  })
})

app.get('/:user/:name', (req, res) => {
  console.log(`[~] ${req.params.user} loaded the certificate with name ${req.params.name}.`)
  let path = `${__dirname}/keys/${req.params.user}-${req.params.name}.ovpn`
  if (fs.existsSync(path)) {
    res.download(path)
  }
})

app.get('/:user', async (req, res) => {
  if (req.params.user == 'favicon.ico') return res.sendStatus(404)
  console.log(`[~] ${req.params.user} loaded the list of their certificates`)
  let fileList = []
  await new Promise((resolve1) => {
    fs.readdir('./keys', async (err, files) => {
      let promises = []
      files.forEach(async file => {
        promises.push(new Promise(async (resolve2) => {
          let split = file.split('-')
          if (split[0] == req.params.user) {
            let date = await new Promise((resolve3) => {
              fs.stat(`./keys/${file}`, (err, data) => {
                resolve3(data.mtime)
              })
            })
            fileList.push({
              'name': split[1].split('.')[0],
              'user': split[0],
              'date': formatDate(date)
            })
            resolve2()
          }
        }))
      })
      await Promise.all(promises)
      resolve1()
    })
  })

  if (fileList.length) res.render('keys', { fileList, 'name': req.params.user })
  else res.render('index', { error: '<strong>Warning!</strong>  User not found.' })
})

app.get('/', (req, res) => {
  res.render('index')
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})