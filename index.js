#!/usr/bin/env node

const ora = require('ora')
const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const program = require('commander')
const inquirer = require('inquirer')
const spawn = require('cross-spawn')
const packageJson = require('./package.json')
const download = require('download-git-repo')
const execSync = require("child_process").execSync

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
let installTypeList = ['npm']

const isAvailable = cmd => {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

isAvailable('yarnpkg') && installTypeList.push('yarn')
isAvailable('cnpm') && installTypeList.push('cnpm')
isAvailable('snpm') && installTypeList.push('snpm')
installTypeList.push('not to install')

const downloader = () =>
  new Promise((resolve, reject) => {
    spinner.start()
    fs.emptyDirSync(tmpDir)
    download('halo-design/nail-cli-template', tmpDir, err => {
      spinner.stop()
      if (err) {
        console.log(chalk.red(err))
        console.log(chalk.red(`\nThe project template download failed.\n`))
        console.log(chalk.yellow(`Please check the network and try to download again.\n`))
        reject(err)
      } else {
        console.log(chalk.green('\nThe project template was downloaded successfully.\n'))
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

const excluder = (jsonData, type, exclude) => {
  const group = jsonData[type]
  let newGroup = {}
  for (let key in group) {
    if (exclude.every(item => item !== key)) {
      newGroup[key] = group[key]
    }
  }
  return newGroup
}

const install = type => {
  try {
    process.chdir(outputPath)
    const result = spawn.sync(type, ['install'], { stdio: 'inherit' })
  } catch (err) {
    console.log(chalk.red(`Installation failed: ${err}`))
  }
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
    }, {
      type: 'confirm',
      message: 'Do you need to install an e2e test tool:',
      name: 'e2e'
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
            .then(result => {
              if (result.ok) {
                let excludeList = ['package.json', 'LICENSE', '.travis.yml']

                if (!answers.e2e) {
                  excludeList.push('cypress.json', 'tests/e2e')
                }
                copyer(tmpDir, outputPath, excludeList)

                let package = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json')))
                package.name = projectName
                package.author = authorName

                if (!answers.e2e) {
                  package.devDependencies = excluder(package, 'devDependencies', ['cypress'])
                  package.scripts = excluder(package, 'scripts', ['e2e', 'e2e:o'])
                }

                fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify(package, null, 2))
                console.log(chalk.green('\nThe project has been generated successfully!\n'))

                inquirer
                  .prompt([{
                    type: 'list',
                    message: 'Please select the NPM package installation tool:',
                    name: 'installType',
                    choices: installTypeList
                  }]).then(ans => {
                    const type = ans.installType
                    if (type === 'not to install') {
                      console.log(chalk.cyan('\nThe next installation is to run "npm install" or "yarn install" in the new directory.\n'))
                    } else {
                      install(type)
                    }
                  })
              } else {
                console.log(chalk.yellow('\nYou have dropped out of the installation.\n'))
              }
            })
            .catch(err => console.log(chalk.red(err)))
      })
}

program
  .version('0.1.4', '-v, --version')
  .command('init')
  .action(() => {
    downloader().then(init)
  })
  
program.parse(process.argv)
