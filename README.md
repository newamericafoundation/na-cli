# New America's Data Viz Project Generator

## What it does

- Creates a new repo in the newamerica-graphics Github organization with your project name
- Clones the [data viz boilerplate](https://github.com/newamerica-graphics/data-viz-boilerplate) into a local folder
- Changes the remote of the local repo to the new repo in newamerica-graphics
- Replaces the project name in the `package.json` file
- Pushes the code to the new remote

## Installation

Things you need:

- git and node
- an SSH key on your machine configured with Github
- write access to the newamerica-graphics organization

```
npm install -g na-generator
```

### Example

```
naviz setup nann_network_research -d ~/code
```

## Usage

```
Usage: naviz [command] [options]

Commands:
  setup <slug>            Setup a new dataviz project with specified slug

Options:
  -d, --directory         an optional directory, defaults to current directory if omitted
  -v, --version           output the version number
  -h, --help              output usage information
```
