# Insta-Toc Plugin
[![Version](https://img.shields.io/github/v/release/iLiftALot/insta-toc?include_prereleases&label=latest&color=blue)](https://github.com/iLiftALot/insta-toc/releases)
[![Test](https://github.com/iLiftALot/insta-toc/actions/workflows/test.yml/badge.svg)](https://github.com/iLiftALot/insta-toc/actions)

A plugin to dyamically generate and maintain a table of contents for you in real time.

## Demo
![./assets/media/assets/media/demonstration.gif](https://raw.githubusercontent.com/iLiftALot/insta-toc/master/assets/media/demonstration.gif)

## Installation
### **COMING SOON**: Obsidian Community Plugins Tab
*TBD*

### BRAT
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin.
2. Open Obsidian and press SHIFT+CMD+P.
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
- [ ] Handle various heading formats
  - [x] <s>Markdown Links</s>
  - [x] <s>Wiki-Links</s>
  - [x] <s>HTML</s>
  - [x] <s>Tags</s>
  - [x] <s>Special Characters</s>
  - [ ] TBD
- [ ] Configure Settings Tab
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
