#!/usr/bin/env node

const ora = require('ora')
const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const packageJson = require('./package.json')
const download = require('download-git-repo')

const spinner = ora('The project template downloading...')
const cmdDir = process.cwd()
const binDir = process.argv[1]
const template = 'tmp'
const tmpDir = path.join(binDir, '..', template)
const folderReg = /^[^\\\\\\/:*?\\"<>|]+$/
const userReg = /^[a-zA-Z0-9_-]{4,16}$/

let projectName = 'nail-app'
let authorName = 'OwlAford'
let outputPath = ''

spinner.start()

const downloader = () =>
  new Promise((resolve, reject) => {
    download('halo-design/nail-cli-template', tmpDir, err => {
      spinner.stop()
      if (err) {
        console.log(chalk.red(err))
        console.log(chalk.red(`\nThe project template download failed.\n`))
        console.log(chalk.yellow(`Please check the network and try to download again.\n`))
        reject(err)
      } else {
        console.log(chalk.green('The project template was downloaded successfully.\n'))
        resolve()
      }
    })
  })

const copyer = (from, to, exclude) => {
  exclude = exclude || []
  fs.copySync(from, to, {
    dereference: true,
    filter: file => exclude.every(item => path.join(tmpDir, item) !== file)
  })
}

const init = () => {
  inquirer
    .prompt([{
      type: 'input',
      message: 'Please enter the project name:',
      validate: input => folderReg.test(input),
      name: 'projectName'
    }, {
      type: 'input',
      message: 'Please enter the author name:',
      validate: input => userReg.test(input),
      name: 'author'
    }])
      .then(answers => {
        projectName = answers.projectName.replace(/ /g, '-')
        authorName = answers.author
  
        outputPath = path.join(cmdDir, projectName)
        const inPlace = fs.existsSync(outputPath)

        inquirer
          .prompt([{
            type: 'confirm',
            message: !inPlace
            ? 'Generate project in current directory?'
            : 'Target directory exists. Continue?',
            name: 'ok'
          }])
            .then(answers => {
              if (answers.ok) {
                copyer(tmpDir, outputPath, ['package.json'])
                let package = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json')))
                package.name = projectName
                package.author = authorName
                fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify(package, null, 2))
                console.log(chalk.green('\nThe project has been generated successfully!'))
                console.log(chalk.cyan('and the next installation is to run "npm install" or "yarn install" in the new directory.\n'))
              }
            })
            .catch(err => console.log(chalk.red(err)))
      })
}

downloader().then(init)
