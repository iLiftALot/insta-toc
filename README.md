# Insta TOC Plugin

[![Version](https://img.shields.io/github/v/release/iLiftALot/insta-toc?include_prereleases&label=latest&color=blue)](https://github.com/iLiftALot/insta-toc/releases) [![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22insta-toc%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)](https://obsidian.md/plugins?search=insta%20toc) [![NPM Version](https://img.shields.io/npm/v/insta-toc)](https://www.npmjs.com/package/insta-toc) [![Test](https://github.com/iLiftALot/insta-toc/actions/workflows/test.yml/badge.svg)](https://github.com/iLiftALot/insta-toc/actions)

A plugin to dyamically generate and maintain a table of contents for you in real time.

- [Insta TOC Plugin](#insta-toc-plugin)
  - [Demonstration](#demonstration)
  - [Features: Insta TOC vs Other ToC Plugins](#features-insta-toc-vs-other-toc-plugins)
  - [Usage](#usage)
  - [Installation](#installation)
    - [Obsidian Community Plugins Tab](#obsidian-community-plugins-tab)
    - [BRAT](#brat)
    - [Manual](#manual)
    - [npm](#npm)
  - [Contributing](#contributing)
  - [Road Map](#road-map)

## Demonstration
![./assets/media/assets/media/demonstration.gif](https://raw.githubusercontent.com/iLiftALot/insta-toc/master/assets/media/demonstration.gif)

## Features: Insta TOC vs Other ToC Plugins
There are various other ToC plugins for Obsidian, however, they come with certain limitations which this plugin aims to mitigate and improve upon which includes:

**Seamless Integration & Dynamic Generation**
- Just insert the code block and start typing. There's nothing more to it. Other ToC plugins generate the ToC via command activation. This plugin is designed for performance and simplicity for maximum convenience and organization with no hassle.

**HTML & Special Symbols**
- Feel free to include HTML or any kind of special symbols within headings. This plugin will handle these cases elegantly.

**Heading Hierarchy Handling**
- Include any type of heading hierarchy you want. Your heading structure doesn't have to be any certain way. Other plugins will prohibit the ToC insertion if the heading hierachy

## Usage
1. Insert the `insta-toc` code block:

```insta-toc
```

2. Type away.

## Installation
### Obsidian Community Plugins Tab
1. Open Obsidian and press `SHIFT+CMD+P`.
2. Navigate to the search bar and type `Insta TOC`
3. Click the install button.

### BRAT
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin.
2. Open Obsidian and press `SHIFT+CMD+P`.
3. Type `>BRAT: Plugins: Add a beta plugin for testing` and select the option.
4. Insert `https://github.com/iLiftALot/insta-toc` and submit.

### Manual
1. Download the [latest release](https://github.com/iLiftALot/insta-toc/releases).
2. Extract the `insta-toc` folder from the zip to your vault's plugins folder: `/path/to/<vault>/.obsidian/plugins/`.
*Note*: On some machines the .obsidian folder may be hidden. On MacOS you should be able to press Command+Shift+Dot to show the folder in Finder.
3. Reload Obsidian.

### npm
```shell
npm install insta-toc
```

## Contributing
- [Report a Bug](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=bug&template=&title=Bug%3A+)
- [Suggest a Feature](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=feature-request&template=&title=FR%3A+)
- [Suggest Documentation](https://github.com/iLiftALot/insta-toc/issues/new?assignees=iLiftALot&labels=documentation&template=&title=Doc%3A+)
- [Submit a Pull Request](https://github.com/iLiftALot/insta-toc/pulls)

## Road Map
- Handle various heading formats
  - [x] <s>Markdown Links</s>
  - [x] <s>Wiki-Links</s>
  - [x] <s>HTML</s>
  - [x] <s>Tags</s>
  - [x] <s>Special Characters</s>
  - [ ] TBD
- Configure Settings Tab
  - [x] <s>Indentation</s>
  - [x] <s>Bullet types</s>
    - [x] <s>Number</s>
    - [x] <s>Dash</s>
    - [ ] TBD
  - [x] <s>ToC Update Delay</s>
  - [x] <s>Special Character Specifications</s>
  - [ ] Preferences for customized TOC appearance
  - [ ] TBD
- [x] <s>Add folding capabilities</s>
- [ ] Configure specific formatting for various exporting circumstances
