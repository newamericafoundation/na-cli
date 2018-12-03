#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const program = require("commander");
const Git = require("nodegit");
const octokit = require("@octokit/rest")();
const homedir = require("os").homedir();
const inquirer = require("inquirer");
const exec = require("child_process").exec;
var Spinner = require("cli-spinner").Spinner;

require("dotenv").config({
  path: path.join(homedir, ".na-generator")
});

// receive commands
program
  .version("0.0.1", "-v, --version")
  .command("setup <slug>")
  .description("Setup a new dataviz project with specified slug")
  .option("-d, --directory [dir]", "The install path for your new app")
  .action(async function(slug, options) {
    if (!slug) {
      console.log("You need to speficy a project name");
      return;
    }
    const dir = path.join(options.directory || process.cwd(), slug);
    const token = await authenticateToGithub();
    const repo = await cloneBoilerplate(dir);
    await replaceProjectName(dir, slug);
    const url = await createNewRepoInOrg(slug);
    const remote = await changeRemoteUrl(repo, url);
    await initNewProjectWithCommit(repo, remote, dir, token);
    await installDependencies(dir);
  });

program.parse(process.argv);

// authenticate with github, save oauth token to "~/.na-generator"
async function authenticateToGithub() {
  let accessToken = process.env.NA_GITHUB_ACCESS_TOKEN;
  if (!accessToken) {
    // authenticate to Github and get access token
    const { username, password, otp } = await inquirer.prompt([
      { type: "input", name: "username", message: "Github username: " },
      {
        type: "password",
        name: "password",
        message: "Github password: "
      },
      {
        type: "input",
        name: "otp",
        message: "2-factor authentication code: "
      }
    ]);

    octokit.authenticate({
      type: "basic",
      username,
      password
    });

    const {
      data: { token }
    } = await octokit.authorization.createAuthorization({
      note: "CLI to generate New America dataviz projects",
      scopes: "repo",
      headers: {
        "x-github-otp": otp
      }
    });

    fs.writeFile(
      path.join(homedir, ".na-generator"),
      `NA_GITHUB_ACCESS_TOKEN=${token}`,
      err => {
        if (err) throw err;
        console.log("Github access token saved for the future");
      }
    );
    accessToken = token;
  }
  octokit.authenticate({
    type: "token",
    token: accessToken
  });
  return accessToken;
}

// clone boilerplate into dir
async function cloneBoilerplate(dir) {
  if (!fs.existsSync(path.join(dir, ".git"))) {
    const newRepo = await Git.Clone(
      "https://github.com/newamerica-graphics/data-viz-boilerplate.git",
      dir
    );
    console.log(`✅  Cloned boilerplate into a new folder: ${dir}`);
    return newRepo;
  } else {
    console.log(`⚠️  The directory "${dir}" already exists`);
    const existingRepo = Git.Repository.open(dir);
    return existingRepo;
  }
}

// replace "data_viz_project_template" in package.json with input name
async function replaceProjectName(dir, slug) {
  const packageJson = path.join(dir, "package.json");
  fs.readFile(packageJson, "utf-8", function(err, data) {
    if (err) throw err;
    const newValue = data.replace("data_viz_project_template", slug);
    fs.writeFile(packageJson, newValue, "utf-8", function(err) {
      if (err) throw err;
      console.log(`✅  Project name replaced with: ${slug}`);
    });
  });
}

// create new repo in newamerica-graphics with input name
async function createNewRepoInOrg(slug) {
  try {
    const checkRepo = await octokit.repos.get({
      owner: "newamerica-graphics",
      repo: slug
    });
    console.log(
      "⚠️  A repository with this name already exists in newamerica-graphics."
    );
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        message:
          "Do you want to continue? This script will push changes to an existing repo.",
        name: "confirmed"
      }
    ]);
    if (confirmed) {
      return checkRepo.data.clone_url;
    } else {
      process.exit(1);
    }
  } catch (error) {
    if (error.status === 404) {
      const createRepo = await octokit.repos.createInOrg({
        org: "newamerica-graphics",
        name: slug
      });
      console.log(`✅  New repo created here: ${createRepo.data.clone_url}`);
      return createRepo.data.clone_url;
    }
  }
}

// change git remote to new repo url
async function changeRemoteUrl(repo, newUrl) {
  Git.Remote.setUrl(repo, "origin", newUrl);
  const remote = await Git.Remote.lookup(repo, "origin");
  if (
    remote.url() ===
    "https://github.com/newamerica-graphics/data-viz-boilerplate.git"
  ) {
    console.error("🚫 You can't push to the main boilerplate!");
    process.exit(1);
  }
  console.log(`✅  Updated remote url to: ${remote.url()}`);
  return remote;
}

// commit name change
async function initNewProjectWithCommit(repo, remote, dir, token) {
  try {
    const packageJson = path.join(dir, "package.json");
    const user = await Git.Config.openDefault().then(function(config) {
      return config.getStringBuf("user.name");
    });
    const email = await Git.Config.openDefault().then(function(config) {
      return config.getStringBuf("user.email");
    });
    const signature = Git.Signature.now("test", email);
    const stage = await repo.stageFilemode("package.json", true);
    const commit = await repo.createCommitOnHead(
      ["package.json"],
      signature,
      signature,
      "project init"
    );
    await remote.push(["refs/heads/master:refs/heads/master"], {
      callbacks: {
        credentials: function() {
          return Git.Cred.userpassPlaintextNew(token, "x-oauth-basic");
        },
        certificateCheck: function() {
          return 1;
        }
      }
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// install deps in new project
async function installDependencies(dir) {
  const spinner = new Spinner("Installing dependencies.. %s");
  spinner.setSpinnerString("|/-\\");
  spinner.start();
  exec("npm install", { cwd: dir }, err => {
    spinner.stop();
    if (err) console.error(err);
  }).stderr.pipe(process.stderr);
}
