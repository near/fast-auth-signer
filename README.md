# React Parcel Starter Kit

This is a minimal React starter project that uses the [Parcel JS](https://www.parceljs.org) to build the project. Only React and React DOM modules have been installed.

## Prerequisites

- Install latest [Node.js LTS version](https://nodejs.org/en/download/)
- Install latest version of [Yarn](https://classic.yarnpkg.com/en/)

Do note if you use `npm`, a different lock file will be created. If you wish to use `npm` instead of Yarn, then delete `yarn.lock` file. Don't mix package managers.

## How to setup a project

First create a **completely blank** GitHub/BitBucket repository on your account. Then execute the following commands to install blank new React project in your machine:

```bash
# Replace `projectName` with a name of your choice
$ git clone git@github.com:brandiqa/react-parcel-starter.git projectName
$ cd projectName
$ git remote rm origin
# Replace `username` and `repositoryName` with your values
$ git remote add origin git@github.com:username/repositoryName.git
$ git config master.remote origin
$ git config master.merge refs/heads/master
$ git push -u origin master
$ npm install

```

## How to run

After you have completed the above steps. You'll need to install the dependencies first before you start the dev server.

```bash
npm install
npm start
```

## Miscellaneous

Open the file `package.json` and update the repository details. You may also need to update the dependencies manually if a major version has been release.

## Contribution

Simply create a fork of this project. Do your contribution on a separate branch then submit a pull request for review.
