# New America's Data Viz Project Generator

### What it does

- Creates a new repo in the newamerica-graphics Github organization with your project name
- Clones the [data viz boilerplate](https://github.com/newamerica-graphics/data-viz-boilerplate) into a local folder
- Changes the remote of the local repo to the new repo in newamerica-graphics
- Replaces the project name in the `package.json` file
- Pushes the code to the new remote
- Installs local dependencies

### Installation

Things you need:

- git and node
- write access to the newamerica-graphics organization

```
npm install -g @newamerica/na-cli
```

### Example

```
na-cli setup nann_network_research -d ~/code
```

### Usage

```
Usage: na-cli [command] [options]

Commands:
  setup <slug>            Scaffold a new data viz project with specified slug

Options:
  -d, --directory         an optional directory, defaults to current directory if omitted
  -v, --version           output the version number
  -h, --help              output usage information
```
